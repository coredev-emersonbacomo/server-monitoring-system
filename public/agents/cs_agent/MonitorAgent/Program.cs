using System.Diagnostics;
using System.Text.Json;
using MonitorAgent;

var appDir = Path.GetDirectoryName(Environment.ProcessPath)
    ?? AppContext.BaseDirectory;

var bootstrapPath = Path.Combine(appDir, "bootstrap.json");
if (!File.Exists(bootstrapPath))
{
    Console.Error.WriteLine("bootstrap.json not found in " + appDir);
    return 1;
}

BootstrapConfig config;
try
{
    var json = File.ReadAllText(bootstrapPath);
    config = JsonSerializer.Deserialize<BootstrapConfig>(json)
        ?? throw new InvalidOperationException("Failed to parse bootstrap.json");
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Failed to read bootstrap.json: {ex.Message}");
    return 1;
}

var metrics = new MetricsCollector();
var client = new AgentClient();

Console.WriteLine("MonitorAgent v2 starting...");
Console.WriteLine("Registering with server...");

var registerPayload = new RegisterRequest
{
    Token = config.Token,
    AgentVersion = config.AgentVersion ?? "2.0",
    Hostname = metrics.GetHostname(),
    OperatingSystem = metrics.GetOperatingSystem(),
    Architecture = metrics.GetArchitecture(),
    Cpu = metrics.GetCpuSpec(),
    Memory = metrics.GetMemorySpec(),
    Disk = metrics.GetDiskSpec(),
    Capabilities = ["metrics.cpu", "metrics.memory", "metrics.disk", "metrics.network", "metrics.processes", "ports.scan"],
};

RegisterResponse registerResult;
try
{
    registerResult = await client.RegisterAsync(config.RegisterUrl, registerPayload);
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Registration failed: {ex.Message}");
    return 1;
}

var identityToken = registerResult.Identity;
Console.WriteLine("Registered successfully.");

var heartbeatInterval = registerResult.HeartbeatInterval > 0
    ? registerResult.HeartbeatInterval
    : config.HeartbeatInterval;

if (registerResult.Configuration != null &&
    registerResult.Configuration.TryGetValue("version", out var verObj) &&
    verObj is JsonElement verElem && verElem.ValueKind == JsonValueKind.Number)
{
    config.ConfigurationVersion = verElem.GetInt32();
}

Console.WriteLine($"Starting heartbeat loop (interval: {heartbeatInterval}s)...");

while (true)
{
    var uptime = metrics.GetUptime();
    var payload = new HeartbeatRequest
    {
        AgentVersion = config.AgentVersion ?? "2.0",
        ConfigurationVersion = config.ConfigurationVersion,
        Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
        Hostname = metrics.GetHostname(),
        Cpu = metrics.GetCpuUsage(),
        Memory = metrics.GetMemoryUsage(),
        Disk = metrics.GetDiskUsage(),
        Uptime = uptime,
        Network = metrics.GetNetworkStats(),
        TopProcesses = metrics.GetTopProcesses(),
        OpenDbPorts = metrics.GetOpenDatabasePorts(),
        Services = metrics.GetServices(),
    };

    try
    {
        var response = await client.SendHeartbeatAsync(config.ApiUrl, identityToken, payload);

        if (response.HeartbeatInterval > 0)
            heartbeatInterval = response.HeartbeatInterval;

        if (response.Configuration != null &&
            response.Configuration.TryGetValue("version", out var newVerObj) &&
            newVerObj is JsonElement newVerElem && newVerElem.ValueKind == JsonValueKind.Number)
        {
            config.ConfigurationVersion = newVerElem.GetInt32();
            Console.WriteLine($"Configuration updated to version {config.ConfigurationVersion}");
        }

        if (response.PendingCommands is { Length: > 0 })
        {
            var completed = new List<CommandResultRequest>();
            foreach (var cmd in response.PendingCommands)
            {
                Console.WriteLine($"Executing command: {cmd.Type} (id: {cmd.Id})");
                var sw = System.Diagnostics.Stopwatch.StartNew();
                string output;
                string? error = null;
                try
                {
                    output = client.ExecuteCommand(cmd);
                }
                catch (Exception ex)
                {
                    output = "";
                    error = ex.Message;
                }
                sw.Stop();

                completed.Add(new CommandResultRequest
                {
                    CommandId = cmd.Id,
                    Status = error == null ? "completed" : "failed",
                    Output = output,
                    Error = error,
                    ExecutionTimeMs = (int)sw.ElapsedMilliseconds,
                });
            }

            if (completed.Count > 0)
            {
                var ackPayload = new HeartbeatRequest
                {
                    AgentVersion = config.AgentVersion ?? "2.0",
                    ConfigurationVersion = config.ConfigurationVersion,
                    Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                    Hostname = metrics.GetHostname(),
                    CompletedCommands = completed.ToArray(),
                };
                await client.SendHeartbeatAsync(config.ApiUrl, identityToken, ackPayload);
            }
        }
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Heartbeat failed: {ex.Message}");
    }

    await Task.Delay(TimeSpan.FromSeconds(heartbeatInterval));
}
