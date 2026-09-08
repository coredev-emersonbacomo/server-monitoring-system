package main

import (
	"encoding/binary"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
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

	// After a successful drain the file must be empty.
	data, _ := os.ReadFile(q.path)
	if strings.TrimSpace(string(data)) != "" {
		t.Fatalf("queue not cleared after successful drain: %q", string(data))
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

	data, _ := os.ReadFile(q.path)
	if strings.TrimSpace(string(data)) == "" {
		t.Fatal("failed events should remain in the queue")
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
