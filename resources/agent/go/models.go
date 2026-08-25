package main

// BootstrapConfig is the persistent, non-sensitive agent configuration.
//
// It intentionally contains no secrets: no tokens, keys, JWTs, WebSocket
// credentials or machine identifiers. The server URL is public bootstrap
// information; everything sensitive is obtained in-memory after
// challenge-response authentication.
type BootstrapConfig struct {
	ServerURL      string `json:"server_url"`
	AgentVersion   string `json:"agent_version"`
	InstallationID string `json:"installation_id"`
	ProvisionToken string `json:"provision_token,omitempty"` // one-time, stripped after registration

	confVersion int
}

// RegisterRequest is sent once during first install. The public key (and its
// fingerprint) is the only authentication material; the private key stays on
// the machine. InstallationID is the immutable per-installation UUID the
// backend uses to bind the identity.
type RegisterRequest struct {
	Token           string   `json:"token"`
	InstallationID  string   `json:"installation_id"`
	PublicKey       string   `json:"public_key"`
	PublicKeyHash   string   `json:"public_key_hash"`
	AgentVersion    string   `json:"agent_version"`
	Capabilities    []string `json:"capabilities"`
	Hostname        string   `json:"hostname"`
	OperatingSystem string   `json:"operating_system"`
	Architecture    string   `json:"architecture"`
	Cpu             *CPUSpec `json:"cpu"`
	Memory          string   `json:"memory"`
	Disk            string   `json:"disk"`
}

type CPUSpec struct {
	Model string `json:"model"`
	Cores int    `json:"cores"`
}

type RegisterResponse struct {
	Registered bool   `json:"registered"`
	AgentID    int    `json:"agent_id"`
	ServerUUID string `json:"server_uuid"`
}

// ChallengeResponse is the backend's answer to a challenge request.
type ChallengeResponse struct {
	ChallengeID int64  `json:"challenge_id"`
	Challenge   string `json:"challenge"`
	ExpiresIn   int    `json:"expires_in"`
}

// AuthResponse is the short-lived session credential payload issued after a
// successful challenge-response verification.
type AuthResponse struct {
	AccessToken        string             `json:"access_token"`
	ExpiresIn          int                `json:"expires_in"`
	WebsocketExpiresIn int                `json:"websocket_expires_in"`
	ServerUUID         string             `json:"server_uuid"` // legacy: first/primary server
	Servers            []ServerAssignment `json:"servers"`
	Config             AuthConfig         `json:"config"`
}

// ServerAssignment is one server an installation monitors, with the SecOps
// filter the agent mirrors in memory. nil filter = monitor everything
// that passes the built-in noise filter; a list = only those ports/processes/interfaces.
type ServerAssignment struct {
	ServerUUID    string   `json:"server_uuid"`
	PortFilter    []int    `json:"port_filter"`
	ProcessFilter []string `json:"process_filter"`
	NetworkFilter []string `json:"network_filter"`
}

type AuthConfig struct {
	HeartbeatInterval int            `json:"heartbeat_interval"`
	Realtime          RealtimeConfig `json:"realtime"`
}

type RealtimeConfig struct {
	Host   string `json:"host"`
	Port   int    `json:"port"`
	Scheme string `json:"scheme"`
	AppKey string `json:"app_key"`
}

// AgentHeartbeatRequest is the single aggregated heartbeat an agent sends
// per tick for ALL its monitored servers. Agent-wide metrics are sent once;
// each server's filtered processes/ports/interfaces travel in the Servers partitions.
// Network at top level is deprecated (kept for backward compat with older backends);
// new agents send per-partition Network and AvailableInterfaces at top level.
// For dedup (2.7+), top-level dicts hold the union of per-server filtered objects
// and per-partition lists are just keys referencing those dicts.
type AgentHeartbeatRequest struct {
	AgentVersion         string                    `json:"agent_version"`
	ConfigurationVersion int                       `json:"configuration_version"`
	Timestamp            int64                     `json:"timestamp"`
	Hostname             string                    `json:"hostname"`
	Cpu                  *CPUMetrics               `json:"cpu"`
	Memory               *MemoryMetrics            `json:"memory"`
	Disk                 *DiskMetrics              `json:"disk"`
	Uptime               float64                   `json:"uptime"`
	Network              []NetworkMetrics          `json:"network,omitempty"`
	CompletedCommands    []CommandResult           `json:"completed_commands,omitempty"`
	AvailableProcesses   []ProcessInfo             `json:"available_processes,omitempty"`
	AvailablePorts       []PortInfo                `json:"available_ports,omitempty"`
	AvailableInterfaces  []NetworkMetrics          `json:"available_interfaces,omitempty"`
	AgentConfig          *AgentConfigReport        `json:"agent_config,omitempty"`
	ProcessesDict        map[string]ProcessInfo    `json:"processes_dict,omitempty"`
	PortsDict            map[string]PortInfo       `json:"ports_dict,omitempty"`
	NetworksDict         map[string]NetworkMetrics `json:"networks_dict,omitempty"`
	Servers              []ServerPartition         `json:"servers"`
}

// ServerPartition is one server's filtered processes/ports/interfaces within the
// aggregated heartbeat. The backend treats its own DB filter as source of
// truth; the echoed port_filter/process_filter/network_filter are advisory.
// For dedup (2.7+), Processes/OpenDbPorts/Network are lists of keys referencing
// top-level dicts; older agents sent full objects here (handled backward-compat).
type ServerPartition struct {
	ServerUUID    string   `json:"server_uuid"`
	PortFilter    []int    `json:"port_filter,omitempty"`
	ProcessFilter []string `json:"process_filter,omitempty"`
	NetworkFilter []string `json:"network_filter,omitempty"`
	Processes     []string `json:"processes,omitempty"`
	OpenDbPorts   []string `json:"open_db_ports,omitempty"`
	Network       []string `json:"network,omitempty"`
}

// AgentConfigReport is sent with every heartbeat so the backend can use the
// agent's effective values as the source of truth for the Agent tab.
type AgentConfigReport struct {
	HeartbeatInterval int    `json:"heartbeat_interval"`
	AgentVersion      string `json:"agent_version"`
}

type CPUMetrics struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}

type MemoryMetrics struct {
	TotalKb int64   `json:"total_kb"`
	UsedKb  int64   `json:"used_kb"`
	FreeKb  int64   `json:"free_kb"`
	Percent float64 `json:"percent"`
}

type DiskMetrics struct {
	Total   int64   `json:"total"`
	Used    int64   `json:"used"`
	Free    int64   `json:"free"`
	Percent float64 `json:"percent"`
}

type NetworkMetrics struct {
	Interface string `json:"interface"`
	Type      string `json:"type"`      // ethernet, wifi, loopback, vpn, etc.
	State     string `json:"state"`     // up, down, unknown
	RxBytes   int64  `json:"rx_bytes,omitempty"`
	TxBytes   int64  `json:"tx_bytes,omitempty"`
}

type ProcessInfo struct {
	Pid    int32   `json:"pid"`
	Name   string  `json:"name"`
	Cpu    float64 `json:"cpu,omitempty"`
	Memory float64 `json:"memory,omitempty"`
	Pids   []int32 `json:"pids,omitempty"`
}

type PortInfo struct {
	Address  string `json:"address,omitempty"`
	Port     int    `json:"port"`
	Protocol string `json:"protocol"`
	Process  string `json:"process,omitempty"`
	State    string `json:"state,omitempty"`
}

// AgentHeartbeatResponse is the backend's answer to an aggregated heartbeat.
// server_uuids lists the servers the backend accepted from this tick; any
// server that is decommissioned, archived, or no longer owned by this agent is
// returned in revoked_server_uuids so the agent drops it locally.
type AgentHeartbeatResponse struct {
	HeartbeatInterval  int                    `json:"heartbeat_interval"`
	CurrentTime        int64                  `json:"current_time"`
	ServerUUIDs        []string               `json:"server_uuids"`
	RevokedServerUUIDs []string               `json:"revoked_server_uuids,omitempty"`
	PendingCommands    []AgentCommand         `json:"pending_commands,omitempty"`
	Configuration      map[string]interface{} `json:"configuration,omitempty"`
	PendingUpdate      *AgentUpdateInfo       `json:"pending_update,omitempty"`
}

type AgentUpdateInfo struct {
	Version           string `json:"version"`
	HeartbeatInterval int    `json:"heartbeat_interval"`
	BinaryURL         string `json:"binary_url"`
}

type AgentCommand struct {
	Id      int                    `json:"id"`
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
}

type CommandResult struct {
	CommandId       int    `json:"command_id"`
	Status          string `json:"status"`
	Output          string `json:"output"`
	Error           string `json:"error,omitempty"`
	ExecutionTimeMs int    `json:"execution_time_ms"`
}
