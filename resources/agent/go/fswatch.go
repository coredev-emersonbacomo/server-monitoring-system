package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// AuditEvent is one auditable event delivered to the backend. Its JSON shape
// matches the ingestion endpoint validation (uuid, action/event_type,
// server_uuid optional, file fields). The durable queue wraps it in an envelope.
type AuditEvent struct {
	UUID           string `json:"uuid"`
	Type           string `json:"type"` // file_activity | lifecycle
	Action         string `json:"action,omitempty"`
	ServerUUID     string `json:"server_uuid,omitempty"`
	FileName       string `json:"file_name,omitempty"`
	SourcePath     string `json:"source_path,omitempty"`
	DestinationPath string `json:"destination_path,omitempty"`
	IsDirectory    bool   `json:"is_directory,omitempty"`
	Username       string `json:"username,omitempty"`
	ProcessName    string `json:"process_name,omitempty"`
	ProcessID      int32  `json:"process_id,omitempty"`
	OccurredAt     string `json:"occurred_at,omitempty"`
	EventType      string `json:"event_type,omitempty"`
}

const (
	auditTypeFile      = "file_activity"
	auditTypeLifecycle = "lifecycle"
	correlationWindow  = 250 * time.Millisecond
)

// agentExclusions are high-frequency agent-owned files excluded from
// self-monitoring to avoid a feedback loop (logs/temp/queue).
var agentExclusions = map[string]bool{
	"agent.log":        true,
	"crash.log":        true,
	"startup.log":      true,
	"file_events.queue": true,
}

// rawOp is a platform-neutral filesystem operation emitted by the OS watcher
// before move/rename correlation.
type rawOp struct {
	path  string
	isDir bool
	kind  string // create | modify | delete | renameOld | renameNew
}

// FileWatcher manages a set of OS watches over the backend-delivered watched
// paths and emits logical AuditEvents (created/modified/moved/renamed/deleted).
// It is decoupled from delivery: events flow into an in-memory channel that the
// caller drains into the durable queue.
type FileWatcher struct {
	runtime *AgentRuntime
	events  chan *AuditEvent
	stop    chan struct{}
	rawOps  chan rawOp
	managed sync.Map // normalized path -> chan struct{} (watch done)
}

func NewFileWatcher(rt *AgentRuntime) *FileWatcher {
	return &FileWatcher{
		runtime: rt,
		events:  make(chan *AuditEvent, 256),
		stop:    make(chan struct{}),
		rawOps:  make(chan rawOp, 1024),
	}
}

// Events returns the channel of correlated audit events for the caller to drain.
func (fw *FileWatcher) Events() <-chan *AuditEvent { return fw.events }

// Start launches the manage + correlate goroutines.
func (fw *FileWatcher) Start() {
	go fw.manageLoop()
	go fw.correlateLoop()
}

// Stop signals all watches to stop and closes their handles.
func (fw *FileWatcher) Stop() {
	close(fw.stop)
	fw.managed.Range(func(k, v interface{}) bool {
		close(v.(chan struct{}))
		return true
	})
}

func (fw *FileWatcher) manageLoop() {
	fw.syncWatches()
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-fw.stop:
			return
		case <-ticker.C:
			fw.syncWatches()
		}
	}
}

// syncWatches starts a watch for every enabled path that is not yet watched and
// currently exists. Inaccessible/missing paths are skipped (never fatal); they
// are retried on the next tick if they reappear.
func (fw *FileWatcher) syncWatches() {
	paths := fw.runtime.EffectiveWatchedPaths()
	for _, wp := range paths {
		if _, loaded := fw.managed.Load(wp.Path); loaded {
			continue
		}
		if _, err := os.Stat(wp.Path); err != nil {
			log.Printf("[FSW] watched path unavailable, skipping: %s (%v)", wp.Path, err)
			continue
		}
		done := make(chan struct{})
		fw.managed.Store(wp.Path, done)
		go func(p string, recursive bool, done chan struct{}) {
			defer func() {
				fw.managed.Delete(p)
			}()
			watchPath(p, recursive, fw.rawOps, done)
		}(wp.Path, wp.Recursive, done)
	}
}

func (fw *FileWatcher) correlateLoop() {
	pending := map[string]rawOp{} // keyed by parent dir (waiting for rename partner)
	expiry := map[string]time.Time{}
	ticker := time.NewTicker(correlationWindow)
	defer ticker.Stop()

	sweep := func() {
		now := time.Now()
		for k, exp := range expiry {
			if now.After(exp) {
				old := pending[k]
				delete(pending, k)
				delete(expiry, k)
				fw.emitFile(old.path, old.isDir, "deleted", "")
			}
		}
	}

	for {
		select {
		case <-fw.stop:
			return
		case op := <-fw.rawOps:
			fw.handleRawOp(op, pending, expiry)
		case <-ticker.C:
			sweep()
		}
	}
}

func (fw *FileWatcher) handleRawOp(op rawOp, pending map[string]rawOp, expiry map[string]time.Time) {
	switch op.kind {
	case "create", "modify":
		dir := filepath.Dir(op.path)
		// A create arriving shortly after a renameOld in the same dir is the
		// partner of a move/rename across directories.
		if old, ok := pending[dir]; ok {
			delete(pending, dir)
			delete(expiry, dir)
			fw.emitFile(old.path, old.isDir, "moved", op.path)
			return
		}
		action := "created"
		if op.kind == "modify" {
			action = "modified"
		}
		fw.emitFile(op.path, op.isDir, action, "")
	case "delete":
		fw.emitFile(op.path, op.isDir, "deleted", "")
	case "renameOld":
		dir := filepath.Dir(op.path)
		pending[dir] = op
		expiry[dir] = time.Now().Add(correlationWindow)
	case "renameNew":
		dir := filepath.Dir(op.path)
		if old, ok := pending[dir]; ok {
			delete(pending, dir)
			delete(expiry, dir)
			if filepath.Dir(old.path) == dir {
				fw.emitFile(old.path, old.isDir, "renamed", op.path)
			} else {
				fw.emitFile(old.path, old.isDir, "moved", op.path)
			}
			return
		}
		// No matching old name within the window — treat as a plain create.
		fw.emitFile(op.path, op.isDir, "created", "")
	}
}

// emitFile builds and emits a file-activity AuditEvent, skipping excluded
// agent-owned files, user-supplied exclude patterns, and resolving the owning
// server from the watched-path set.
func (fw *FileWatcher) emitFile(path string, isDir bool, action, dest string) {
	if fw.isExcluded(path) {
		return
	}
	if wp := fw.runtime.WatchedPathForPath(path); wp != nil && matchAny(wp.ExcludePatterns, path) {
		return
	}
	ev := &AuditEvent{
		UUID:       uuidV4(),
		Type:       auditTypeFile,
		Action:     action,
		FileName:   filepath.Base(path),
		SourcePath: path,
		IsDirectory: isDir,
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	if dest != "" {
		ev.DestinationPath = dest
	}
	ev.ServerUUID = fw.serverUUIDForPath(path)

	select {
	case fw.events <- ev:
	default:
		// In-memory buffer full: drop the event. The durable queue is the
		// delivery guarantee; a transient in-memory overflow causes at most a
		// few lost events, which the backend dedup cannot repair but which are
		// non-critical for an audit feed under extreme burst.
		log.Println("[FSW] event buffer full; dropping one in-memory event")
	}
}

// isExcluded returns true for high-frequency agent-owned files under the
// instance directory (logs/queue) that must never be self-audited.
func (fw *FileWatcher) isExcluded(path string) bool {
	base := filepath.Base(path)
	if !agentExclusions[base] {
		return false
	}
	instDir := instanceDir(currentInstance)
	return strings.HasPrefix(path, instDir)
}

// matchAny reports whether path matches any of the gitignore-style patterns,
// comparing both the full path and its base name. An invalid pattern never
// matches, so a user typo only skips that one rule instead of throwing.
func matchAny(patterns []string, path string) bool {
	base := filepath.Base(path)
	for _, pat := range patterns {
		if matched, err := filepath.Match(pat, base); err == nil && matched {
			return true
		}
		if matchDir, err := filepath.Match(pat, path); err == nil && matchDir {
			return true
		}
	}
	return false
}

// serverUUIDForPath finds the owning server for a watched path: agent-scoped
// paths return "" (agent-wide), server-scoped paths return that server's UUID.
func (fw *FileWatcher) serverUUIDForPath(path string) string {
	for _, wp := range fw.runtime.EffectiveWatchedPaths() {
		if path == wp.Path || strings.HasPrefix(path, wp.Path+string(os.PathSeparator)) {
			return wp.ServerUUID
		}
	}
	return ""
}

// LifecycleEvent builds a lifecycle AuditEvent for the agent.
func LifecycleEvent(serverUUID, eventType string) *AuditEvent {
	return &AuditEvent{
		UUID:       uuidV4(),
		Type:       auditTypeLifecycle,
		EventType:  eventType,
		ServerUUID: serverUUID,
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
}
