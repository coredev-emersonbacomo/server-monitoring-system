package main

import (
	"encoding/binary"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
	"unicode/utf16"
)

// fakeSender records delivered events and optionally fails them all.
type fakeSender struct {
	got  []*AuditEvent
	fail bool
}

func (f *fakeSender) sendAuditEvents(events []*AuditEvent) []*AuditEvent {
	f.got = append(f.got, events...)
	if f.fail {
		return events
	}
	return nil
}

func TestUUIDV4Format(t *testing.T) {
	u := uuidV4()
	if len(u) != 36 || strings.Count(u, "-") != 4 {
		t.Fatalf("uuidV4 returned unexpected format: %q", u)
	}
	if uuidV4() == uuidV4() {
		t.Fatal("uuidV4 should not repeat")
	}
}

func TestEventQueueRoundTrip(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp)

	q, err := NewEventQueue("test-inst")
	if err != nil {
		t.Fatalf("NewEventQueue: %v", err)
	}
	defer q.Close()

	ev1 := &AuditEvent{UUID: "a", Type: auditTypeFile, Action: "created", SourcePath: filepath.Join(tmp, "x.txt")}
	ev2 := &AuditEvent{UUID: "b", Type: auditTypeLifecycle, EventType: "started"}
	if err := q.Enqueue(ev1); err != nil {
		t.Fatalf("Enqueue: %v", err)
	}
	if err := q.Enqueue(ev2); err != nil {
		t.Fatalf("Enqueue: %v", err)
	}

	sender := &fakeSender{}
	if err := q.Drain(sender); err != nil {
		t.Fatalf("Drain: %v", err)
	}
	if len(sender.got) != 2 {
		t.Fatalf("expected 2 delivered, got %d", len(sender.got))
	}

	// After a successful drain a second drain delivers nothing (progress is
	// an offset, not a rewrite).
	again := &fakeSender{}
	if err := q.Drain(again); err != nil {
		t.Fatalf("second Drain: %v", err)
	}
	if len(again.got) != 0 {
		t.Fatalf("expected nothing left, got %d", len(again.got))
	}
}

func TestEventQueueRetryOnFailure(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp)

	q, _ := NewEventQueue("test-inst")
	defer q.Close()
	_ = q.Enqueue(&AuditEvent{UUID: "a", Type: auditTypeFile, Action: "created"})

	sender := &fakeSender{fail: true}
	if err := q.Drain(sender); err != nil {
		t.Fatalf("Drain: %v", err)
	}
	if len(sender.got) != 1 {
		t.Fatalf("expected 1 attempted, got %d", len(sender.got))
	}

	// Failures are re-enqueued at the tail: the next drain redelivers.
	redelivery := &fakeSender{}
	if err := q.Drain(redelivery); err != nil {
		t.Fatalf("redelivery Drain: %v", err)
	}
	if len(redelivery.got) != 1 {
		t.Fatalf("expected failed event redelivered, got %d", len(redelivery.got))
	}
}

func TestWatchedPathsExpansionAndEffective(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("ProgramData", tmp)

	rt := &AgentRuntime{}
	rt.SetWatchedPaths([]WatchedPath{
		{Path: `%ProgramData%\MonitorAgent`, Scope: "agent", Enabled: true},
		{Path: filepath.Join(tmp, "off"), Scope: "server", ServerUUID: "s1", Enabled: false},
	})

	got := rt.EffectiveWatchedPaths()
	if len(got) != 1 {
		t.Fatalf("expected 1 enabled path, got %d", len(got))
	}
	want := filepath.Clean(filepath.Join(tmp, "MonitorAgent"))
	if got[0].Path != want {
		t.Fatalf("expected expanded path %q, got %q", want, got[0].Path)
	}
	if got[0].ServerUUID != "" {
		t.Fatalf("agent-scoped path should have empty ServerUUID, got %q", got[0].ServerUUID)
	}
}

func TestWatcherCorrelation(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp) // keep isExcluded from dropping our events

	rt := &AgentRuntime{}
	rt.SetWatchedPaths([]WatchedPath{{Path: tmp, Scope: "agent", Enabled: true}})

	fw := NewFileWatcher(rt)
	fw.Start()
	defer fw.Stop()

	dir := filepath.Join(tmp, "sub")
	old := filepath.Join(dir, "a.txt")
	newPath := filepath.Join(dir, "b.txt")

	// rename: old then new within the correlation window.
	fw.rawOps <- rawOp{path: old, kind: "renameOld"}
	fw.rawOps <- rawOp{path: newPath, kind: "renameNew"}

	select {
	case ev := <-fw.Events():
		if ev.Action != "renamed" {
			t.Fatalf("expected renamed, got %q", ev.Action)
		}
		if ev.SourcePath != old || ev.DestinationPath != newPath {
			t.Fatalf("unexpected paths: %q -> %q", ev.SourcePath, ev.DestinationPath)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for correlated rename event")
	}

	// plain create.
	fw.rawOps <- rawOp{path: filepath.Join(tmp, "c.txt"), kind: "create"}
	select {
	case ev := <-fw.Events():
		if ev.Action != "created" {
			t.Fatalf("expected created, got %q", ev.Action)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for create event")
	}
}

func TestWatcherSkipsDirectoryModified(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp) // keep isExcluded from dropping our events

	rt := &AgentRuntime{}
	rt.SetWatchedPaths([]WatchedPath{{Path: tmp, Scope: "agent", Enabled: true}})

	fw := NewFileWatcher(rt)
	fw.Start()
	defer fw.Stop()

	// Directory mtime churn is noise, not file activity: no event expected.
	fw.rawOps <- rawOp{path: filepath.Join(tmp, "subdir"), kind: "modify", isDir: true}
	select {
	case ev := <-fw.Events():
		t.Fatalf("directory modified must not emit, got action %q for %q", ev.Action, ev.SourcePath)
	case <-time.After(500 * time.Millisecond):
	}

	// Plain file modify still emits.
	fw.rawOps <- rawOp{path: filepath.Join(tmp, "a.txt"), kind: "modify", isDir: false}
	select {
	case ev := <-fw.Events():
		if ev.Action != "modified" || ev.IsDirectory {
			t.Fatalf("expected file modified, got action %q isDir=%v", ev.Action, ev.IsDirectory)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for file modified event")
	}

	// Structural directory changes still emit.
	fw.rawOps <- rawOp{path: filepath.Join(tmp, "newdir"), kind: "create", isDir: true}
	select {
	case ev := <-fw.Events():
		if ev.Action != "created" || !ev.IsDirectory {
			t.Fatalf("expected directory created, got action %q isDir=%v", ev.Action, ev.IsDirectory)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for directory created event")
	}
}

func TestParseWinEventsModifyDirReportsIsDir(t *testing.T) {
	tmp := t.TempDir()
	dir := filepath.Join(tmp, "subdir")
	if err := os.Mkdir(dir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	// Craft one FILE_NOTIFY_INFORMATION entry for the subdirectory:
	// NextEntryOffset=0, Action=FILE_ACTION_MODIFIED (Win32 value 3),
	// name "subdir" as UTF-16LE. Must be a real dir on disk so the
	// production isDirOrFalse stat resolves true.
	nameU16 := utf16.Encode([]rune("subdir"))
	buf := make([]byte, 12+len(nameU16)*2)
	binary.LittleEndian.PutUint32(buf[0:], 0)
	binary.LittleEndian.PutUint32(buf[4:], 3)
	binary.LittleEndian.PutUint32(buf[8:], uint32(len(nameU16)*2))
	for i, v := range nameU16 {
		binary.LittleEndian.PutUint16(buf[12+i*2:], v)
	}

	out := make(chan rawOp, 1)
	parseWinEvents(buf, tmp, out)

	select {
	case op := <-out:
		if op.kind != "modify" {
			t.Fatalf("expected modify, got %q", op.kind)
		}
		if !op.isDir {
			t.Fatalf("directory modify must report isDir=true, else the emitFile guard cannot drop it")
		}
		if op.path != dir {
			t.Fatalf("expected path %q, got %q", dir, op.path)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for parsed modify op")
	}
}

func TestAuditEventJSONShape(t *testing.T) {
	ev := &AuditEvent{UUID: "x", Type: auditTypeFile, Action: "modified", ServerUUID: "s2", FileName: "f", SourcePath: "/p/f"}
	b, err := json.Marshal(ev)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var m map[string]interface{}
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if m["type"] != "file_activity" {
		t.Fatalf("expected type file_activity, got %v", m["type"])
	}
	if m["server_uuid"] != "s2" {
		t.Fatalf("expected server_uuid s2, got %v", m["server_uuid"])
	}
}

func TestEventQueueConcurrentEnqueueDuringDrain(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp)

	q, err := NewEventQueue("test-inst")
	if err != nil {
		t.Fatalf("NewEventQueue: %v", err)
	}
	defer q.Close()

	for i := 0; i < 10; i++ {
		if err := q.Enqueue(&AuditEvent{UUID: "pre-" + string(rune('a'+i)), Type: auditTypeFile, Action: "created"}); err != nil {
			t.Fatalf("Enqueue: %v", err)
		}
	}

	// Sender blocks mid-send; events enqueued during the send must survive.
	sendEntered := make(chan struct{})
	release := make(chan struct{})
	done := make(chan struct{})
	sender := &gateSender{entered: sendEntered, release: release}
	go func() {
		defer close(done)
		if err := q.Drain(sender); err != nil {
			t.Errorf("Drain: %v", err)
		}
	}()
	select {
	case <-sendEntered: // Drain is inside the send; concurrent window is open
	case <-time.After(5 * time.Second):
		t.Fatal("Drain never reached the send")
	}
	for i := 0; i < 5; i++ {
		if err := q.Enqueue(&AuditEvent{UUID: "during-" + string(rune('a'+i)), Type: auditTypeFile, Action: "created"}); err != nil {
			t.Fatalf("Enqueue during drain: %v", err)
		}
	}
	close(release)
	<-done

	if len(sender.got) != 10 {
		t.Fatalf("expected first drain to deliver 10, got %d", len(sender.got))
	}
	// The 5 concurrent events must still be queued, not wiped.
	sender2 := &fakeSender{}
	if err := q.Drain(sender2); err != nil {
		t.Fatalf("second Drain: %v", err)
	}
	if len(sender2.got) != 5 {
		t.Fatalf("expected 5 concurrent events redelivered, got %d", len(sender2.got))
	}
	for _, ev := range sender2.got {
		if !strings.HasPrefix(ev.UUID, "during-") {
			t.Fatalf("unexpected redelivered uuid %q", ev.UUID)
		}
	}
}

// gateSender blocks inside sendAuditEvents until release is closed,
// signalling entry so tests can enqueue during the send deterministically.
type gateSender struct {
	entered chan struct{}
	release chan struct{}
	got     []*AuditEvent
	once    sync.Once
}

func (g *gateSender) sendAuditEvents(events []*AuditEvent) []*AuditEvent {
	g.once.Do(func() { close(g.entered) })
	<-g.release
	g.got = append(g.got, events...)
	return nil
}

func TestEventQueueChunkedDrain(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp)

	q, err := NewEventQueue("test-inst")
	if err != nil {
		t.Fatalf("NewEventQueue: %v", err)
	}
	defer q.Close()

	const total = maxDrainEvents + 10
	for i := 0; i < total; i++ {
		if err := q.Enqueue(&AuditEvent{UUID: "bulk", Type: auditTypeFile, Action: "created"}); err != nil {
			t.Fatalf("Enqueue: %v", err)
		}
	}

	sender := &fakeSender{}
	if err := q.Drain(sender); err != nil {
		t.Fatalf("first Drain: %v", err)
	}
	if len(sender.got) != maxDrainEvents {
		t.Fatalf("expected first drain capped at %d, got %d", maxDrainEvents, len(sender.got))
	}

	sender2 := &fakeSender{}
	if err := q.Drain(sender2); err != nil {
		t.Fatalf("second Drain: %v", err)
	}
	if len(sender2.got) != 10 {
		t.Fatalf("expected remainder 10, got %d", len(sender2.got))
	}
}

func TestEventQueueRecoversSendingSidecar(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp)

	// Simulate a crash between sidecar write and main rewrite: both files
	// carry the same batch � recovery must restore it (dupes deduped by uuid).
	line := "{\"uuid\":\"crashed-1\",\"type\":\"file\"}\n"
	qpath := filepath.Join(tmp, "instances", "test-inst", queueFileName)
	if err := os.MkdirAll(filepath.Dir(qpath), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(qpath+sendingFileSuffix, []byte(line), 0644); err != nil {
		t.Fatal(err)
	}

	q, err := NewEventQueue("test-inst")
	if err != nil {
		t.Fatalf("NewEventQueue: %v", err)
	}
	defer q.Close()

	sender := &fakeSender{}
	if err := q.Drain(sender); err != nil {
		t.Fatalf("Drain: %v", err)
	}
	if len(sender.got) != 1 || sender.got[0].UUID != "crashed-1" {
		t.Fatalf("expected recovered event, got %+v", sender.got)
	}
	if _, err := os.Stat(qpath + sendingFileSuffix); !os.IsNotExist(err) {
		t.Fatal("sidecar should be removed after successful drain")
	}
}

func TestEventQueueOffsetSurvivesRestart(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp)

	q, err := NewEventQueue("test-inst")
	if err != nil {
		t.Fatalf("NewEventQueue: %v", err)
	}
	for i := 0; i < 3; i++ {
		if err := q.Enqueue(&AuditEvent{UUID: "persist", Type: auditTypeFile, Action: "created"}); err != nil {
			t.Fatalf("Enqueue: %v", err)
		}
	}
	sender := &fakeSender{}
	if err := q.Drain(sender); err != nil {
		t.Fatalf("Drain: %v", err)
	}
	if len(sender.got) != 3 {
		t.Fatalf("expected 3 delivered, got %d", len(sender.got))
	}
	q.Close()

	// Reopen: nothing redelivers (offset persisted), new events flow.
	q2, err := NewEventQueue("test-inst")
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer q2.Close()
	again := &fakeSender{}
	if err := q2.Drain(again); err != nil {
		t.Fatalf("reopen Drain: %v", err)
	}
	if len(again.got) != 0 {
		t.Fatalf("expected no redelivery after restart, got %d", len(again.got))
	}
	if err := q2.Enqueue(&AuditEvent{UUID: "new", Type: auditTypeFile, Action: "created"}); err != nil {
		t.Fatalf("Enqueue: %v", err)
	}
	fresh := &fakeSender{}
	if err := q2.Drain(fresh); err != nil {
		t.Fatalf("fresh Drain: %v", err)
	}
	if len(fresh.got) != 1 || fresh.got[0].UUID != "new" {
		t.Fatalf("expected the new event, got %+v", fresh.got)
	}
}

func TestEventQueueRewindsPastEOF(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("MONITOR_AGENT_DATA_DIR", tmp)

	q, err := NewEventQueue("test-inst")
	if err != nil {
		t.Fatalf("NewEventQueue: %v", err)
	}
	defer q.Close()
	// Long first line so the post-truncate remainder is strictly smaller
	// than the old offset (equal sizes are indistinguishable from clean EOF).
	if err := q.Enqueue(&AuditEvent{UUID: "a-long-uuid-value-1234567890", Type: auditTypeFile, Action: "created", SourcePath: "C:\\some\\long\\path\\file.txt"}); err != nil {
		t.Fatalf("Enqueue: %v", err)
	}
	if err := q.Drain(&fakeSender{}); err != nil {
		t.Fatalf("Drain: %v", err)
	}

	// External truncation must not strand later appends past the offset.
	if err := os.Truncate(q.path, 0); err != nil {
		t.Fatalf("Truncate: %v", err)
	}
	if err := q.Enqueue(&AuditEvent{UUID: "b", Type: auditTypeFile, Action: "created"}); err != nil {
		t.Fatalf("Enqueue: %v", err)
	}
	got := &fakeSender{}
	if err := q.Drain(got); err != nil {
		t.Fatalf("Drain: %v", err)
	}
	if len(got.got) != 1 || got.got[0].UUID != "b" {
		t.Fatalf("expected post-truncation event, got %+v", got.got)
	}
}
