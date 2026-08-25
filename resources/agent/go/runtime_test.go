package main

import (
	"strings"
	"testing"
)

// Runtime filter semantics: nil = allow everything (noise filter already
// ran); empty = filter to nothing; a list = only those items. Per-server
// configs must never leak into each other.

func TestRuntimeFiltersArePerServer(t *testing.T) {
	sess := &AgentSession{
		Servers: []ServerAssignment{
			{ServerUUID: "svr-a", PortFilter: []int{3306}, ProcessFilter: []string{"mysqld"}},
			{ServerUUID: "svr-b"}, // nil filters → allow all
		},
	}
	rt := NewAgentRuntime(sess)

	if !rt.IsPortAllowed("svr-b", 8080) {
		t.Fatal("svr-b nil filter must allow any port")
	}
	if !rt.IsPortAllowed("svr-a", 3306) {
		t.Fatal("svr-a filter must allow listed port 3306")
	}
	if rt.IsPortAllowed("svr-a", 8080) {
		t.Fatal("svr-a filter must block unlisted port 8080")
	}
	if !rt.IsProcessAllowed("svr-a", "mysqld") {
		t.Fatal("svr-a filter must allow listed process")
	}
	if rt.IsProcessAllowed("svr-a", "nginx") {
		t.Fatal("svr-a filter must block unlisted process")
	}

	// Empty filter = filter to nothing.
	rt.Upsert("svr-a", []int{}, []string{}, []string{})
	if rt.IsPortAllowed("svr-a", 3306) {
		t.Fatal("empty filter must block everything")
	}

	// svr-b (nil filter) is unaffected — everything still passes.
	if !rt.IsPortAllowed("svr-b", 3306) {
		t.Fatal("svr-b nil filter must allow any port")
	}
	if !rt.IsProcessAllowed("svr-b", "anything") {
		t.Fatal("svr-b nil filter must allow any process")
	}
}

func TestAgentRuntimeRemove(t *testing.T) {
	rt := NewAgentRuntime(&AgentSession{
		Servers: []ServerAssignment{
			{ServerUUID: "svr-a"},
			{ServerUUID: "svr-b"},
		},
	})
	if len(rt.ServerUUIDs()) != 2 {
		t.Fatalf("want 2 servers, got %d", len(rt.ServerUUIDs()))
	}
	rt.Remove("svr-a")
	if rt.HasServer("svr-a") {
		t.Fatal("svr-a should be gone after Remove")
	}
	if !rt.HasServer("svr-b") {
		t.Fatal("svr-b must remain after removing svr-a")
	}
}

func TestAgentRuntimeSyncFromSession(t *testing.T) {
	rt := NewAgentRuntime(&AgentSession{
		Servers: []ServerAssignment{
			{ServerUUID: "svr-a", PortFilter: []int{3306}},
		},
	})

	// A fresh session (WS reconnect) carries the latest filters and must
	// replace the in-memory ones — this is how a config change broadcast while
	// the socket was down is recovered.
	rt.SyncFromSession(&AgentSession{
		Servers: []ServerAssignment{
			{ServerUUID: "svr-a", PortFilter: []int{5432}, ProcessFilter: []string{"postgres"}},
		},
	})

	if rt.IsPortAllowed("svr-a", 3306) {
		t.Fatal("stale filter 3306 must be replaced by 5432")
	}
	if !rt.IsPortAllowed("svr-a", 5432) {
		t.Fatal("fresh filter 5432 must be applied")
	}
	if !rt.IsProcessAllowed("svr-a", "postgres") {
		t.Fatal("fresh process filter must be applied")
	}
	if rt.IsProcessAllowed("svr-a", "nginx") {
		t.Fatal("fresh process filter must block unlisted processes")
	}

	// SyncFromSession must be safe against a nil session.
	rt.SyncFromSession(nil)
	if !rt.IsPortAllowed("svr-a", 5432) {
		t.Fatal("nil session must not disturb existing filters")
	}
}

func TestAgentRuntimeHeartbeatFiltering(t *testing.T) {
	rt := NewAgentRuntime(&AgentSession{
		Servers: []ServerAssignment{
			{ServerUUID: "svr-a", PortFilter: []int{3306}, ProcessFilter: []string{"mysqld"}},
			{ServerUUID: "svr-b"}, // nil filters → everything passes
		},
	})

	ports := []PortInfo{{Port: 3306}, {Port: 8080}}
	procs := []ProcessInfo{{Name: "mysqld"}, {Name: "nginx"}}

	gotPorts := rt.FilterPorts("svr-a", ports)
	if len(gotPorts) != 1 || gotPorts[0].Port != 3306 {
		t.Fatalf("svr-a ports must filter to [3306], got %+v", gotPorts)
	}
	gotProcs := rt.FilterProcesses("svr-a", procs)
	if len(gotProcs) != 1 || gotProcs[0].Name != "mysqld" {
		t.Fatalf("svr-a processes must filter to [mysqld], got %+v", gotProcs)
	}

	// Server B (nil filter) is unaffected — everything still passes.
	if got := rt.FilterPorts("svr-b", ports); len(got) != 2 {
		t.Fatalf("svr-b must pass all ports, got %+v", got)
	}
	if got := rt.FilterProcesses("svr-b", procs); len(got) != 2 {
		t.Fatalf("svr-b must pass all processes, got %+v", got)
	}

	// Empty filter = nothing sent.
	rt.Upsert("svr-a", []int{}, []string{}, []string{})
	if got := rt.FilterPorts("svr-a", ports); len(got) != 0 {
		t.Fatalf("empty filter must filter to nothing, got %+v", got)
	}
	if got := rt.FilterProcesses("svr-a", procs); len(got) != 0 {
		t.Fatalf("empty filter must filter to nothing, got %+v", got)
	}
}

func TestAgentRuntimeServerConfigsSnapshot(t *testing.T) {
	rt := NewAgentRuntime(&AgentSession{
		Servers: []ServerAssignment{
			{ServerUUID: "svr-a", PortFilter: []int{3306, 5432}, ProcessFilter: []string{"mysqld", "postgres"}},
			{ServerUUID: "svr-b"},
		},
	})

	cfgs := rt.ServerConfigs()
	if len(cfgs) != 2 {
		t.Fatalf("want 2 configs, got %d", len(cfgs))
	}
	byUUID := map[string]ServerRuntimeConfig{cfgs[0].ServerUUID: cfgs[0], cfgs[1].ServerUUID: cfgs[1]}
	if a, ok := byUUID["svr-a"]; !ok || len(a.PortFilter) != 2 || len(a.ProcessFilter) != 2 {
		t.Fatalf("svr-a config malformed: %+v", a)
	}
	if b, ok := byUUID["svr-b"]; !ok || b.PortFilter != nil || b.ProcessFilter != nil {
		t.Fatalf("svr-b nil filters must round-trip: %+v", b)
	}

	// Snapshot must be independent of the live runtime: mutating one after
	// Remove must not corrupt the returned slice.
	rt.Remove("svr-a")
	if len(rt.ServerConfigs()) != 1 {
		t.Fatal("Remove must drop a server from the runtime")
	}
}

func TestCapProcessesKeepsFilteredInBelowCap(t *testing.T) {
	// An idle process that is explicitly filtered-in must survive the
	// collector's cap even though its CPU is lower than everything else.
	allowed := map[string]bool{"monitoragent": true}
	procs := []ProcessInfo{
		{Name: "chrome", Cpu: 30},
		{Name: "sqlservr", Cpu: 25},
		{Name: "MonitorAgent", Cpu: 0.1},
	}
	got := capProcesses(procs, allowed, 2)
	if len(got) != 2 {
		t.Fatalf("want 2 capped rows, got %d: %+v", len(got), got)
	}
	if got[0].Name != "MonitorAgent" {
		t.Fatalf("filtered-in process must be kept despite low CPU, got %+v", got)
	}

	// Without an allowed set the cap is pure CPU ordering.
	got = capProcesses(procs, nil, 2)
	if got[0].Name != "chrome" || got[1].Name != "sqlservr" {
		t.Fatalf("nil allowed must cap by CPU desc, got %+v", got)
	}
}

func TestFilterProcessesKeepsFilteredInWhenIdle(t *testing.T) {
	rt := NewAgentRuntime(&AgentSession{
		Servers: []ServerAssignment{
			{ServerUUID: "svr-a", ProcessFilter: []string{"MonitorAgent"}},
		},
	})
	procs := []ProcessInfo{
		{Name: "chrome", Cpu: 40},
		{Name: "MonitorAgent", Cpu: 0.05},
	}
	got := rt.FilterProcesses("svr-a", procs)
	if len(got) != 1 || got[0].Name != "MonitorAgent" {
		t.Fatalf("filter must keep idle filtered-in process, got %+v", got)
	}
}

func TestAvailableSetSignatures(t *testing.T) {
	// Identical sets produce identical signatures regardless of CPU/pid churn.
	procSig := func(procs []ProcessInfo) string {
		return strings.Join(processSetSignature(procs), ",")
	}
	a := procSig([]ProcessInfo{{Name: "Chrome", Cpu: 10}, {Name: "node", Cpu: 5}})
	b := procSig([]ProcessInfo{{Name: "node", Cpu: 99}, {Name: "chrome", Cpu: 0.1}})
	if a != b {
		t.Fatalf("same process set must have same signature, got %q vs %q", a, b)
	}
	c := procSig([]ProcessInfo{{Name: "node", Cpu: 99}, {Name: "chrome", Cpu: 0.1}, {Name: "postgres"}})
	if a == c {
		t.Fatal("different process sets must differ in signature")
	}

	portSig := func(ports []PortInfo) string {
		nums := portSetSignature(ports)
		s := make([]string, len(nums))
		for i, n := range nums {
			s[i] = string(rune(n))
		}
		return strings.Join(s, ",")
	}
	pa := portSig([]PortInfo{{Port: 5432}, {Port: 6379}})
	pb := portSig([]PortInfo{{Port: 6379}, {Port: 5432}})
	if pa != pb {
		t.Fatalf("same port set must have same signature, got %q vs %q", pa, pb)
	}
}

func TestGroupProcesses(t *testing.T) {
	in := []ProcessInfo{
		{Name: "chrome", Pid: 10, Cpu: 1, Memory: 100},
		{Name: "chrome", Pid: 2, Cpu: 2, Memory: 200},
		{Name: "Code", Pid: 5, Cpu: 3, Memory: 50},
	}
	got := groupProcesses(in)
	if len(got) != 2 {
		t.Fatalf("expected 2 groups, got %d: %+v", len(got), got)
	}
	var chrome, code *ProcessInfo
	for i := range got {
		if got[i].Name == "chrome" {
			chrome = &got[i]
		} else {
			code = &got[i]
		}
	}
	if chrome == nil || code == nil {
		t.Fatalf("missing groups: %+v", got)
	}
	if chrome.Cpu != 3 || chrome.Memory != 300 {
		t.Fatalf("chrome must sum cpu/mem, got %+v", chrome)
	}
	if chrome.Pid != 2 || len(chrome.Pids) != 2 || chrome.Pids[0] != 2 || chrome.Pids[1] != 10 {
		t.Fatalf("chrome must keep lowest pid + sorted pids, got %+v", chrome)
	}
	if len(code.Pids) != 1 {
		t.Fatalf("single process must keep one pid, got %+v", code)
	}
	if got[0].Cpu < got[1].Cpu {
		t.Fatal("groups must be sorted by total cpu desc")
	}
}
