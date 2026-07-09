using System.Text.Json.Serialization;

namespace MonitorAgent;

public class BootstrapConfig
{
    [JsonPropertyName("token")] public string Token { get; set; } = "";
    [JsonPropertyName("api_url")] public string ApiUrl { get; set; } = "";
    [JsonPropertyName("register_url")] public string RegisterUrl { get; set; } = "";
    [JsonPropertyName("heartbeat_interval")] public int HeartbeatInterval { get; set; } = 5;
    [JsonPropertyName("hostname")] public string? Hostname { get; set; }
    [JsonPropertyName("agent_version")] public string? AgentVersion { get; set; }

    [JsonIgnore] public int ConfigurationVersion { get; set; } = 1;
}

public class RegisterRequest
{
    [JsonPropertyName("token")] public required string Token { get; set; }
    [JsonPropertyName("agent_version")] public string? AgentVersion { get; set; }
    [JsonPropertyName("hostname")] public string? Hostname { get; set; }
    [JsonPropertyName("operating_system")] public string? OperatingSystem { get; set; }
    [JsonPropertyName("architecture")] public string? Architecture { get; set; }
    [JsonPropertyName("cpu")] public CpuSpec? Cpu { get; set; }
    [JsonPropertyName("memory")] public string? Memory { get; set; }
    [JsonPropertyName("disk")] public string? Disk { get; set; }
    [JsonPropertyName("capabilities")] public string[]? Capabilities { get; set; }
}

public class CpuSpec
{
    [JsonPropertyName("model")] public string? Model { get; set; }
    [JsonPropertyName("cores")] public int? Cores { get; set; }
}

public class RegisterResponse
{
    [JsonPropertyName("identity")] public required string Identity { get; set; }
    [JsonPropertyName("configuration")] public Dictionary<string, object>? Configuration { get; set; }
    [JsonPropertyName("heartbeat_interval")] public int HeartbeatInterval { get; set; } = 5;
}

public class HeartbeatRequest
{
    [JsonPropertyName("agent_version")] public string? AgentVersion { get; set; }
    [JsonPropertyName("configuration_version")] public int ConfigurationVersion { get; set; } = 1;
    [JsonPropertyName("timestamp")] public long Timestamp { get; set; }
    [JsonPropertyName("hostname")] public string? Hostname { get; set; }
    [JsonPropertyName("cpu")] public CpuMetrics? Cpu { get; set; }
    [JsonPropertyName("memory")] public MemoryMetrics? Memory { get; set; }
    [JsonPropertyName("disk")] public DiskMetrics? Disk { get; set; }
    [JsonPropertyName("uptime")] public double Uptime { get; set; }
    [JsonPropertyName("network")] public NetworkMetrics[]? Network { get; set; }
    [JsonPropertyName("top_processes")] public ProcessInfo[]? TopProcesses { get; set; }
    [JsonPropertyName("open_db_ports")] public PortInfo[]? OpenDbPorts { get; set; }
    [JsonPropertyName("services")] public ServiceInfo[]? Services { get; set; }
    [JsonPropertyName("completed_commands")] public CommandResultRequest[]? CompletedCommands { get; set; }
}

public class CpuMetrics
{
    [JsonPropertyName("load1")] public double Load1 { get; set; }
    [JsonPropertyName("load5")] public double Load5 { get; set; }
    [JsonPropertyName("load15")] public double Load15 { get; set; }
}

public class MemoryMetrics
{
    [JsonPropertyName("total_kb")] public long TotalKb { get; set; }
    [JsonPropertyName("used_kb")] public long UsedKb { get; set; }
    [JsonPropertyName("free_kb")] public long FreeKb { get; set; }
    [JsonPropertyName("percent")] public double Percent { get; set; }
}

public class DiskMetrics
{
    [JsonPropertyName("total")] public long Total { get; set; }
    [JsonPropertyName("used")] public long Used { get; set; }
    [JsonPropertyName("free")] public long Free { get; set; }
    [JsonPropertyName("percent")] public double Percent { get; set; }
}

public class NetworkMetrics
{
    [JsonPropertyName("interface")] public string? Interface { get; set; }
    [JsonPropertyName("rx_bytes")] public long RxBytes { get; set; }
    [JsonPropertyName("tx_bytes")] public long TxBytes { get; set; }
}

public class ProcessInfo
{
    [JsonPropertyName("pid")] public int Pid { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("cpu")] public double Cpu { get; set; }
    [JsonPropertyName("memory")] public double Memory { get; set; }
}

public class PortInfo
{
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("port")] public int Port { get; set; }
    [JsonPropertyName("protocol")] public string? Protocol { get; set; }
    [JsonPropertyName("process")] public string? Process { get; set; }
    [JsonPropertyName("state")] public string? State { get; set; }
}

public class ServiceInfo
{
    [JsonPropertyName("identifier")] public string? Identifier { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("state")] public string? State { get; set; }
}

public class HeartbeatResponse
{
    [JsonPropertyName("heartbeat_interval")] public int HeartbeatInterval { get; set; } = 5;
    [JsonPropertyName("current_time")] public long CurrentTime { get; set; }
    [JsonPropertyName("pending_commands")] public AgentCommand[]? PendingCommands { get; set; }
    [JsonPropertyName("configuration")] public Dictionary<string, object>? Configuration { get; set; }
}

public class AgentCommand
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("payload")] public Dictionary<string, object>? Payload { get; set; }
}

public class CommandResultRequest
{
    [JsonPropertyName("command_id")] public int CommandId { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("output")] public string? Output { get; set; }
    [JsonPropertyName("error")] public string? Error { get; set; }
    [JsonPropertyName("execution_time_ms")] public int ExecutionTimeMs { get; set; }
}
