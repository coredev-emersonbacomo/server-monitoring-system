package main

import (
	"sort"
	"sync"
)

// ServerRuntimeConfig is the in-memory, per-server monitoring configuration
// held by the agent. It is rebuilt from the backend on auth and refreshed on
// every heartbeat response — the backend is always the source of truth.
type ServerRuntimeConfig struct {
	ServerUUID string
	// PortFilter: nil = report every port that passes the built-in noise
	// filter; non-nil (possibly empty) = report only these ports.
	PortFilter map[int]bool
	// ProcessFilter: nil = report all top processes; non-nil (possibly
	// empty) = report only processes whose name is filtered-in.
	ProcessFilter map[string]bool
}

// AgentRuntime is the thread-safe registry of one server runtime config per
// monitored server. A multi-server agent holds one entry per server; each
// server's filter is applied independently (no cross-server leakage).
type AgentRuntime struct {
	mu      sync.RWMutex
	servers map[string]*ServerRuntimeConfig // keyed by server_uuid
}

// NewAgentRuntime builds the initial runtime from the auth response. Legacy
// single-server payloads (empty servers list) fall back to the primary
// server_uuid with no filters.
func NewAgentRuntime(sess *AgentSession) *AgentRuntime {
	rt := &AgentRuntime{servers: make(map[string]*ServerRuntimeConfig)}
	if len(sess.Servers) > 0 {
		for _, a := range sess.Servers {
			rt.Upsert(a.ServerUUID, a.PortFilter, a.ProcessFilter)
		}
	} else if sess.ServerUUID != "" {
		rt.Upsert(sess.ServerUUID, nil, nil)
	}
	return rt
}

// Upsert creates or updates the runtime config for a server, replacing its
// filters.
func (rt *AgentRuntime) Upsert(serverUUID string, ports []int, processes []string) {
	rt.mu.Lock()
	defer rt.mu.Unlock()
	rt.servers[serverUUID] = &ServerRuntimeConfig{
		ServerUUID:    serverUUID,
		PortFilter:    intSet(ports),
		ProcessFilter: stringSet(processes),
	}
}

// Remove drops a server from the runtime (decommissioned / no longer owned).
func (rt *AgentRuntime) Remove(serverUUID string) {
	rt.mu.Lock()
	defer rt.mu.Unlock()
	delete(rt.servers, serverUUID)
}

// ServerUUIDs returns the sorted list of monitored server UUIDs.
func (rt *AgentRuntime) ServerUUIDs() []string {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	out := make([]string, 0, len(rt.servers))
	for uuid := range rt.servers {
		out = append(out, uuid)
	}
	sort.Strings(out)
	return out
}

// IsPortAllowed reports whether a port should be sent for a server. A nil
// filter allows everything (the collector's noise filter already ran); a
// non-nil filter allows only listed ports.
func (rt *AgentRuntime) IsPortAllowed(serverUUID string, port int) bool {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	cfg, ok := rt.servers[serverUUID]
	if !ok || cfg.PortFilter == nil {
		return true
	}
	return cfg.PortFilter[port]
}

// IsProcessAllowed reports whether a process should be sent for a server, by
// name. A nil filter allows everything.
func (rt *AgentRuntime) IsProcessAllowed(serverUUID, name string) bool {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	cfg, ok := rt.servers[serverUUID]
	if !ok || cfg.ProcessFilter == nil {
		return true
	}
	return cfg.ProcessFilter[name]
}

// HasServer reports whether the runtime still tracks a server.
func (rt *AgentRuntime) HasServer(serverUUID string) bool {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	_, ok := rt.servers[serverUUID]
	return ok
}

// FilterPorts drops every port that is not filtered-in for a server. With a
// nil filter the input is returned unchanged; with an empty filter the
// result is empty. This is what guarantees the agent only ever sends the
// checked ports.
func (rt *AgentRuntime) FilterPorts(serverUUID string, ports []PortInfo) []PortInfo {
	out := ports[:0]
	for _, p := range ports {
		if rt.IsPortAllowed(serverUUID, p.Port) {
			out = append(out, p)
		}
	}
	return out
}

// FilterProcesses drops every process whose name is not filtered-in for a
// server, mirroring FilterPorts.
func (rt *AgentRuntime) FilterProcesses(serverUUID string, procs []ProcessInfo) []ProcessInfo {
	out := procs[:0]
	for _, p := range procs {
		if rt.IsProcessAllowed(serverUUID, p.Name) {
			out = append(out, p)
		}
	}
	return out
}

func intSet(list []int) map[int]bool {
	if list == nil {
		return nil
	}
	set := make(map[int]bool, len(list))
	for _, v := range list {
		set[v] = true
	}
	return set
}

func stringSet(list []string) map[string]bool {
	if list == nil {
		return nil
	}
	set := make(map[string]bool, len(list))
	for _, v := range list {
		set[v] = true
	}
	return set
}
