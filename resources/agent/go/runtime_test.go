package main

import "testing"

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
	rt.Upsert("svr-a", []int{}, []string{})
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
	rt.Upsert("svr-a", []int{}, []string{})
	if got := rt.FilterPorts("svr-a", ports); len(got) != 0 {
		t.Fatalf("empty filter must filter to nothing, got %+v", got)
	}
	if got := rt.FilterProcesses("svr-a", procs); len(got) != 0 {
		t.Fatalf("empty filter must filter to nothing, got %+v", got)
	}
}
