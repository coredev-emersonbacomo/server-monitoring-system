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
	syncCh  chan struct{}
}

var currentWatcher *FileWatcher

func NewFileWatcher(rt *AgentRuntime) *FileWatcher {
	fw := &FileWatcher{
		runtime: rt,
		events:  make(chan *AuditEvent, 256),
		stop:    make(chan struct{}),
		rawOps:  make(chan rawOp, 1024),
		syncCh:  make(chan struct{}, 1),
	}
	currentWatcher = fw
	return fw
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
		case <-fw.syncCh:
			fw.syncWatches()
		}
	}
}

// TriggerSync requests an immediate re-sync of watched paths (non-blocking).
func (fw *FileWatcher) TriggerSync() {
	select {
	case fw.syncCh <- struct{}{}:
	default:
	}
}

// syncWatches reconciles the live OS watches with the backend-delivered
// enabled paths: starts watches for new paths, stops watches for removed or
// disabled paths, and retries unavailable paths on the next tick.
func (fw *FileWatcher) syncWatches() {
	paths := fw.runtime.EffectiveWatchedPaths()
	desired := make(map[string]bool, len(paths))
	for _, wp := range paths {
		desired[wp.Path] = true
		if _, loaded := fw.managed.Load(wp.Path); loaded {
			continue
		}
		if _, err := os.Stat(wp.Path); err != nil {
			log.Printf("[FSW] watched path unavailable, skipping: %s (%v)", wp.Path, err)
			continue
		}
		done := make(chan struct{})
		fw.managed.Store(wp.Path, done)
		go func(p string, done chan struct{}) {
			defer func() {
				fw.managed.Delete(p)
			}()
			watchPath(p, fw.rawOps, done)
		}(wp.Path, done)
	}
	// Stop watches whose path is no longer desired (removed/disabled).
	fw.managed.Range(func(k, v interface{}) bool {
		path := k.(string)
		if !desired[path] {
			if ch, ok := v.(chan struct{}); ok {
				// close safely (may already be closing via Stop)
				func() {
					defer func() { recover() }()
					close(ch)
				}()
			}
			fw.managed.Delete(path)
			log.Printf("[FSW] stopped watch for removed path: %s", path)
		}
		return true
	})
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
	// A directory's mtime churns as a side effect of its children changing,
	// so a directory "modified" carries no file information — only noise
	// (this is what flooded the log with repo-root rows). Directory
	// create/delete/rename are real structural changes and still emit.
	if isDir && action == "modified" {
		return
	}
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
	// case-insensitive on Windows
	key := base
	if os.PathSeparator == '\\' {
		key = strings.ToLower(base)
		lower := make(map[string]bool, len(agentExclusions))
		for k := range agentExclusions {
			lower[strings.ToLower(k)] = true
		}
		if !lower[key] {
			return false
		}
	} else {
		if !agentExclusions[base] {
			return false
		}
	}
	instDir := instanceDir(currentInstance)
	if os.PathSeparator == '\\' {
		return strings.HasPrefix(strings.ToLower(path), strings.ToLower(instDir))
	}
	return strings.HasPrefix(path, instDir)
}

// matchAny reports whether path matches any of the gitignore-style patterns.
// It checks: base name, full path, and any path segment (so a pattern like
// "node_modules" matches files inside that directory on both platforms).
// An invalid pattern never matches, so a user typo only skips that one rule.
func matchAny(patterns []string, path string) bool {
	base := filepath.Base(path)
	segments := strings.FieldsFunc(path, func(r rune) bool { return r == '/' || r == '\\' })
	for _, pat := range patterns {
		if matched, err := filepath.Match(pat, base); err == nil && matched {
			return true
		}
		if matchDir, err := filepath.Match(pat, path); err == nil && matchDir {
			return true
		}
		for _, seg := range segments {
			if matched, err := filepath.Match(pat, seg); err == nil && matched {
				return true
			}
		}
		// plain substring fallback for directory patterns without wildcards
		if !strings.Contains(pat, "*") && !strings.Contains(pat, "?") && !strings.Contains(pat, "[") {
			for _, seg := range segments {
				if seg == pat {
					return true
				}
				if os.PathSeparator == '\\' && strings.EqualFold(seg, pat) {
					return true
				}
			}
		}
	}
	return false
}

// serverUUIDForPath finds the owning server for a watched path: agent-scoped
// paths return "" (agent-wide), server-scoped paths return that server's UUID.
func (fw *FileWatcher) serverUUIDForPath(path string) string {
	cleanPath := filepath.Clean(path)
	for _, wp := range fw.runtime.EffectiveWatchedPaths() {
		cleanWP := filepath.Clean(wp.Path)
		if os.PathSeparator == '\\' {
			if strings.EqualFold(cleanPath, cleanWP) || strings.HasPrefix(strings.ToLower(cleanPath), strings.ToLower(cleanWP)+string(os.PathSeparator)) {
				return wp.ServerUUID
			}
		} else {
			if cleanPath == cleanWP || strings.HasPrefix(cleanPath, cleanWP+string(os.PathSeparator)) {
				return wp.ServerUUID
			}
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
