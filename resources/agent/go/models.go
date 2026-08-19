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
	AccessToken         string             `json:"access_token"`
	ExpiresIn           int                `json:"expires_in"`
	WebsocketExpiresIn  int                `json:"websocket_expires_in"`
	ServerUUID          string             `json:"server_uuid"` // legacy: first/primary server
	Servers             []ServerAssignment `json:"servers"`
	Config              AuthConfig         `json:"config"`
}

// ServerAssignment is one server an installation monitors, with the SecOps
// filter the agent mirrors in memory. nil filter = monitor everything
// that passes the built-in noise filter; a list = only those ports/processes.
type ServerAssignment struct {
	ServerUUID      string   `json:"server_uuid"`
	PortFilter      []int    `json:"port_filter"`
	ProcessFilter   []string `json:"process_filter"`
}

type AuthConfig struct {
	HeartbeatInterval int              `json:"heartbeat_interval"`
	Realtime          RealtimeConfig   `json:"realtime"`
}

type RealtimeConfig struct {
	Host    string `json:"host"`
	Port    int    `json:"port"`
	Scheme  string `json:"scheme"`
	AppKey  string `json:"app_key"`
}

type HeartbeatRequest struct {
	ServerUUID          string             `json:"server_uuid"`
	AgentVersion         string             `json:"agent_version"`
	ConfigurationVersion int                `json:"configuration_version"`
	Timestamp            int64              `json:"timestamp"`
	Hostname             string             `json:"hostname"`
	Cpu                  *CPUMetrics        `json:"cpu"`
	Memory               *MemoryMetrics     `json:"memory"`
	Disk                 *DiskMetrics       `json:"disk"`
	Uptime               float64            `json:"uptime"`
	Network              []NetworkMetrics   `json:"network"`
	TopProcesses         []ProcessInfo      `json:"top_processes"`
	OpenDbPorts          []PortInfo         `json:"open_db_ports"`
	CompletedCommands    []CommandResult    `json:"completed_commands,omitempty"`
	AgentConfig          *AgentConfigReport `json:"agent_config,omitempty"`
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
	RxBytes   int64  `json:"rx_bytes"`
	TxBytes   int64  `json:"tx_bytes"`
}

type ProcessInfo struct {
	Pid    int32   `json:"pid"`
	Name   string  `json:"name"`
	Cpu    float64 `json:"cpu"`
	Memory float64 `json:"memory"`
}

type PortInfo struct {
	Address  string `json:"address"`
	Port     int    `json:"port"`
	Protocol string `json:"protocol"`
	Process  string `json:"process"`
	State    string `json:"state"`
}

type HeartbeatResponse struct {
	HeartbeatInterval int                    `json:"heartbeat_interval"`
	CurrentTime       int64                  `json:"current_time"`
	PendingCommands   []AgentCommand         `json:"pending_commands,omitempty"`
	Configuration     map[string]interface{} `json:"configuration,omitempty"`
	PendingUpdate     *AgentUpdateInfo       `json:"pending_update,omitempty"`
	ServerUUID       string                 `json:"server_uuid"`
	PortFilter       []int                  `json:"port_filter"`
	ProcessFilter    []string               `json:"process_filter"`
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