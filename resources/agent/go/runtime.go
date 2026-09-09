package main

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
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
	// NetworkFilter: nil = report all non-disconnected interfaces; non-nil
	// (possibly empty) = report only interfaces whose name is checked.
	NetworkFilter map[string]bool
}

// AgentRuntime is the thread-safe registry of one server runtime config per
// monitored server. A multi-server agent holds one entry per server; each
// server's filter is applied independently (no cross-server leakage).
type AgentRuntime struct {
	mu          sync.RWMutex
	servers     map[string]*ServerRuntimeConfig // keyed by server_uuid
	watchedPaths []WatchedPath
}

// NewAgentRuntime builds the initial runtime from the auth response. Legacy
// single-server payloads (empty servers list) fall back to the primary
// server_uuid with no filters.
func NewAgentRuntime(sess *AgentSession) *AgentRuntime {
	rt := &AgentRuntime{servers: make(map[string]*ServerRuntimeConfig)}
	if len(sess.Servers) > 0 {
		for _, a := range sess.Servers {
			rt.Upsert(a.ServerUUID, a.PortFilter, a.ProcessFilter, a.NetworkFilter)
		}
	} else if sess.ServerUUID != "" {
		rt.Upsert(sess.ServerUUID, nil, nil, nil)
	}
	rt.SetWatchedPaths(sess.WatchedPaths)
	return rt
}

// Upsert creates or updates the runtime config for a server, replacing its
// filters.
func (rt *AgentRuntime) Upsert(serverUUID string, ports []int, processes []string, networks []string) {
	rt.mu.Lock()
	defer rt.mu.Unlock()
	rt.servers[serverUUID] = &ServerRuntimeConfig{
		ServerUUID:    serverUUID,
		PortFilter:    intSet(ports),
		ProcessFilter: stringSet(processes),
		NetworkFilter: stringSet(networks),
	}
}

// Remove drops a server from the runtime (decommissioned / no longer owned).
func (rt *AgentRuntime) Remove(serverUUID string) {
	rt.mu.Lock()
	defer rt.mu.Unlock()
	delete(rt.servers, serverUUID)
}

// SyncFromSession re-applies every server's filters from a (fresh) auth
// session. Called when the WS control channel (re)connects so a filter change
// that was broadcast while the socket was down is recovered — the auth
// response is the source of truth for the current filters.
func (rt *AgentRuntime) SyncFromSession(sess *AgentSession) {
	if sess == nil {
		return
	}
	if len(sess.Servers) > 0 {
		for _, a := range sess.Servers {
			rt.Upsert(a.ServerUUID, a.PortFilter, a.ProcessFilter, a.NetworkFilter)
		}
	} else if sess.ServerUUID != "" {
		rt.Upsert(sess.ServerUUID, nil, nil, nil)
	}
	rt.SetWatchedPaths(sess.WatchedPaths)
}

// SetWatchedPaths replaces the audit watched-path set. Paths are normalized
// (environment expansion, separators) so the watcher can match them directly.
func (rt *AgentRuntime) SetWatchedPaths(paths []WatchedPath) {
	rt.mu.Lock()
	defer rt.mu.Unlock()
	out := make([]WatchedPath, 0, len(paths))
	for _, p := range paths {
		if p.Path == "" {
			continue
		}
		p.Path = normalizeWatchPath(p.Path)
		out = append(out, p)
	}
	rt.watchedPaths = out
	// Nudge the file watcher to reconcile immediately (non-blocking).
	if currentWatcher != nil {
		currentWatcher.TriggerSync()
	}
}

// EffectiveWatchedPaths returns the enabled watched paths the agent should
// currently audit. Agent-scoped paths carry an empty ServerUUID; server-scoped
// paths carry their server's UUID so events can be associated.
func (rt *AgentRuntime) EffectiveWatchedPaths() []WatchedPath {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	out := make([]WatchedPath, 0, len(rt.watchedPaths))
	for _, p := range rt.watchedPaths {
		if p.Enabled {
			out = append(out, p)
		}
	}
	return out
}

// WatchedPathForPath returns the enabled watched path that owns the given path
// (exact match or descendant), or nil if none does.
func (rt *AgentRuntime) WatchedPathForPath(path string) *WatchedPath {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	for i := range rt.watchedPaths {
		p := rt.watchedPaths[i]
		if !p.Enabled {
			continue
		}
		if path == p.Path || strings.HasPrefix(path, p.Path+string(os.PathSeparator)) {
			return &p
		}
	}
	return nil
}

// normalizeWatchPath expands %ProgramData% and cleans OS separators.
func normalizeWatchPath(p string) string {
	if pd := os.Getenv("ProgramData"); pd != "" {
		p = strings.ReplaceAll(p, "%ProgramData%", pd)
	} else {
		p = strings.ReplaceAll(p, "%ProgramData%", `C:\ProgramData`)
	}
	return filepath.Clean(p)
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

// config returns the runtime config for a server, or nil when the server is
// not tracked (callers treat missing config as "no filter").
func (rt *AgentRuntime) config(serverUUID string) *ServerRuntimeConfig {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	return rt.servers[serverUUID]
}

// IsPortAllowed reports whether a port should be sent for a server. A nil
// filter allows everything (the collector's noise filter already ran); a
// non-nil filter allows only listed ports.
func (rt *AgentRuntime) IsPortAllowed(serverUUID string, port int) bool {
	cfg := rt.config(serverUUID)
	if cfg == nil || cfg.PortFilter == nil {
		return true
	}
	return cfg.PortFilter[port]
}

// IsProcessAllowed reports whether a process should be sent for a server, by
// name. A nil filter allows everything. Comparison is case-insensitive: the
// set is normalized at build time, collected names at lookup time.
func (rt *AgentRuntime) IsProcessAllowed(serverUUID, name string) bool {
	cfg := rt.config(serverUUID)
	if cfg == nil || cfg.ProcessFilter == nil {
		return true
	}
	return cfg.ProcessFilter[strings.ToLower(strings.TrimSpace(name))]
}

// HasServer reports whether the runtime still tracks a server.
func (rt *AgentRuntime) HasServer(serverUUID string) bool {
	return rt.config(serverUUID) != nil
}

// AllowedProcessNames returns the lowercased union of every server's explicit
// process filter. The collector uses it to preserve explicitly filtered-in
// processes even when they would otherwise be dropped by the built-in noise
// filter (an explicitly monitored process must never be silently removed).
func (rt *AgentRuntime) AllowedProcessNames() map[string]bool {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	out := make(map[string]bool)
	for _, cfg := range rt.servers {
		for name := range cfg.ProcessFilter {
			out[strings.ToLower(name)] = true
		}
	}
	return out
}

// FilterPorts drops every port that is not filtered-in for a server. With a
// nil filter the input is returned unchanged; with an empty filter the
// result is empty. This is what guarantees the agent only ever sends the
// checked ports. The result never aliases the input, because the same
// collected slice is filtered per server.
func (rt *AgentRuntime) FilterPorts(serverUUID string, ports []PortInfo) []PortInfo {
	cfg := rt.config(serverUUID)
	if cfg == nil || cfg.PortFilter == nil {
		return ports
	}
	out := make([]PortInfo, 0, len(ports))
	for _, p := range ports {
		if cfg.PortFilter[p.Port] {
			out = append(out, p)
		}
	}
	return out
}

// FilterProcesses drops every process whose name is not filtered-in for a
// server, mirroring FilterPorts. Without a filter it reports every grouped
// process (the collector already noise-filtered them and grouping bounds the
// list to unique names); with a filter it keeps every matching process so
// explicitly monitored ones are always reported even when idle.
func (rt *AgentRuntime) FilterProcesses(serverUUID string, procs []ProcessInfo) []ProcessInfo {
	cfg := rt.config(serverUUID)
	if cfg == nil || cfg.ProcessFilter == nil {
		return procs
	}
	out := make([]ProcessInfo, 0, len(procs))
	for _, p := range procs {
		if cfg.ProcessFilter[strings.ToLower(strings.TrimSpace(p.Name))] {
			out = append(out, p)
		}
	}
	return out
}

// IsNetworkAllowed reports whether an interface should be sent for a server. A nil
// filter allows every non-disconnected interface; a non-nil filter allows only checked ones.
// Interface names compare case-insensitively like process names.
func (rt *AgentRuntime) IsNetworkAllowed(serverUUID, iface string) bool {
	cfg := rt.config(serverUUID)
	if cfg == nil || cfg.NetworkFilter == nil {
		return true
	}
	return cfg.NetworkFilter[strings.ToLower(strings.TrimSpace(iface))]
}

// FilterNetworks drops interfaces not checked for a server, mirroring FilterPorts.
func (rt *AgentRuntime) FilterNetworks(serverUUID string, nets []NetworkMetrics) []NetworkMetrics {
	cfg := rt.config(serverUUID)
	if cfg == nil || cfg.NetworkFilter == nil {
		return nets
	}
	out := make([]NetworkMetrics, 0, len(nets))
	for _, n := range nets {
		if cfg.NetworkFilter[strings.ToLower(strings.TrimSpace(n.Interface))] {
			out = append(out, n)
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
	// Lowercase + trim: DB filters carry the UI/available-list spelling
	// ("MonitorAgent") while collected names vary by platform ("monitoragent",
	// "MONITORAGENT"). Without this, saving any filter silently matches
	// nothing and the agent reports empty lists. Nil stays nil (report all).
	set := make(map[string]bool, len(list))
	for _, v := range list {
		if name := strings.ToLower(strings.TrimSpace(v)); name != "" {
			set[name] = true
		}
	}
	return set
}

// sortedIntKeys returns the integer keys of m as a sorted slice (nil if m is nil).
func sortedIntKeys(m map[int]bool) []int {
	if m == nil {
		return nil
	}
	out := make([]int, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Ints(out)
	return out
}

// sortedStringKeys returns the string keys of m as a sorted slice (nil if m is nil).
func sortedStringKeys(m map[string]bool) []string {
	if m == nil {
		return nil
	}
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// ServerConfigs returns a snapshot of every monitored server's uuid and its
// filters, so the heartbeat builder can emit one partition per server without
// racing the map. The returned slices are freshly allocated.
func (rt *AgentRuntime) ServerConfigs() []ServerRuntimeConfig {
	rt.mu.RLock()
	defer rt.mu.RUnlock()
	out := make([]ServerRuntimeConfig, 0, len(rt.servers))
	for _, cfg := range rt.servers {
		out = append(out, *cfg)
	}
	return out
}
