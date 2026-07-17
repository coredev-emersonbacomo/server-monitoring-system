package main

type BootstrapConfig struct {
	Token             string `json:"token"`
	ApiURL            string `json:"api_url"`
	RegisterURL       string `json:"register_url"`
	HeartbeatInterval int    `json:"heartbeat_interval"`
	Hostname          string `json:"hostname"`
	AgentVersion      string `json:"agent_version"`
	ServerUUID        string `json:"server_uuid"`
	UpdateURL         string `json:"update_url"`
	ReverbHost        string `json:"reverb_host"`
	ReverbPort        int    `json:"reverb_port"`
	ReverbScheme      string `json:"reverb_scheme"`
	ReverbAppKey      string `json:"reverb_app_key"`
	IdentityToken     string `json:"identity_token"`
	confVersion       int
}

type RegisterRequest struct {
	Token           string   `json:"token"`
	AgentVersion    string   `json:"agent_version"`
	Hostname        string   `json:"hostname"`
	OperatingSystem string   `json:"operating_system"`
	Architecture    string   `json:"architecture"`
	Cpu             *CPUSpec `json:"cpu"`
	Memory          string   `json:"memory"`
	Disk            string   `json:"disk"`
	Capabilities    []string `json:"capabilities"`
}

type CPUSpec struct {
	Model string `json:"model"`
	Cores int    `json:"cores"`
}

type RegisterResponse struct {
	Identity          string                 `json:"identity"`
	Configuration     map[string]interface{} `json:"configuration,omitempty"`
	HeartbeatInterval int                    `json:"heartbeat_interval"`
	ServerUUID        string                 `json:"server_uuid"`
	UpdateURL         string                 `json:"update_url"`
	ReverbHost        string                 `json:"reverb_host"`
	ReverbPort        int                    `json:"reverb_port"`
	ReverbScheme      string                 `json:"reverb_scheme"`
	ReverbAppKey      string                 `json:"reverb_app_key"`
}

type HeartbeatRequest struct {
	ConfigurationVersion int               `json:"configuration_version"`
	Timestamp            int64             `json:"timestamp"`
	Hostname             string            `json:"hostname"`
	Cpu                  *CPUMetrics       `json:"cpu"`
	Memory               *MemoryMetrics    `json:"memory"`
	Disk                 *DiskMetrics      `json:"disk"`
	Uptime               float64           `json:"uptime"`
	Network              []NetworkMetrics  `json:"network"`
	TopProcesses         []ProcessInfo     `json:"top_processes"`
	OpenDbPorts          []PortInfo        `json:"open_db_ports"`
	CompletedCommands    []CommandResult   `json:"completed_commands,omitempty"`
	AgentConfig          *AgentConfigReport `json:"agent_config,omitempty"`
}

// AgentConfigReport is sent with every heartbeat so the backend can use
// bootstrap.json values as the source of truth for the Agent tab.
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
	// Reverb credentials — always returned so bootstrap.json disk state is not required
	ServerUUID    string `json:"server_uuid"`
	UpdateURL     string `json:"update_url"`
	ReverbHost    string `json:"reverb_host"`
	ReverbPort    int    `json:"reverb_port"`
	ReverbScheme  string `json:"reverb_scheme"`
	ReverbAppKey  string `json:"reverb_app_key"`
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
