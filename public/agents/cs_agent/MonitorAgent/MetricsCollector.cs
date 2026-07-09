using System.Diagnostics;
using System.Management;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace MonitorAgent;

public class MetricsCollector
{
    private static readonly HashSet<string> DbProcessNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "mysqld", "mariadbd", "mariadb", "postgres", "postmaster",
        "mongod", "redis-server", "memcached", "cassandra",
        "rabbitmq-server", "beam.smp", "influxd", "clickhouse-server", "elasticsearch"
    };

    private static readonly Dictionary<int, string> DbDefaultPorts = new()
    {
        [3306] = "mysql/mariadb",
        [5432] = "postgresql",
        [27017] = "mongodb",
        [6379] = "redis",
        [11211] = "memcached",
        [9042] = "cassandra",
        [5672] = "rabbitmq",
        [8086] = "influxdb",
        [9000] = "clickhouse",
        [9200] = "elasticsearch",
    };

    public CpuMetrics GetCpuUsage()
    {
        var cpu = new CpuMetrics();
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor");
            foreach (var obj in searcher.Get())
            {
                cpu.Load1 = Convert.ToDouble(obj["LoadPercentage"]);
                break;
            }
        }
        catch
        {
            try
            {
                var counter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                counter.NextValue();
                Thread.Sleep(100);
                cpu.Load1 = counter.NextValue();
                counter.Dispose();
            }
            catch { }
        }

        // Windows doesn't have load5/load15 like Linux, approximate with same value
        cpu.Load5 = cpu.Load1;
        cpu.Load15 = cpu.Load1;
        return cpu;
    }

    public MemoryMetrics GetMemoryUsage()
    {
        var mem = new MemoryMetrics();
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_OperatingSystem");
            foreach (var obj in searcher.Get())
            {
                mem.TotalKb = Convert.ToInt64(obj["TotalVisibleMemorySize"]);
                var freeKb = Convert.ToInt64(obj["FreePhysicalMemory"]);
                mem.FreeKb = freeKb;
                mem.UsedKb = mem.TotalKb - freeKb;
                mem.Percent = mem.TotalKb > 0
                    ? Math.Round((double)mem.UsedKb / mem.TotalKb * 100, 2)
                    : 0;
                break;
            }
        }
        catch
        {
            try
            {
                var memInfo = GC.GetGCMemoryInfo();
                mem.TotalKb = (long)(memInfo.TotalAvailableMemoryBytes / 1024);
                var process = Process.GetCurrentProcess();
                mem.UsedKb = process.WorkingSet64 / 1024;
                mem.FreeKb = mem.TotalKb - mem.UsedKb;
                mem.Percent = mem.TotalKb > 0
                    ? Math.Round((double)mem.UsedKb / mem.TotalKb * 100, 2)
                    : 0;
            }
            catch { }
        }
        return mem;
    }

    public DiskMetrics GetDiskUsage()
    {
        var disk = new DiskMetrics();
        try
        {
            foreach (var drive in DriveInfo.GetDrives())
            {
                if (drive.IsReady && drive.Name == @"C:\")
                {
                    disk.Total = drive.TotalSize;
                    disk.Free = drive.AvailableFreeSpace;
                    disk.Used = disk.Total - disk.Free;
                    disk.Percent = disk.Total > 0
                        ? Math.Round((double)disk.Used / disk.Total * 100, 2)
                        : 0;
                    break;
                }
            }
        }
        catch { }
        return disk;
    }

    public double GetUptime()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT LastBootUpTime FROM Win32_OperatingSystem");
            foreach (var obj in searcher.Get())
            {
                var bootTime = ManagementDateTimeConverter.ToDateTime(obj["LastBootUpTime"].ToString()!);
                return (DateTime.Now - bootTime).TotalSeconds;
            }
        }
        catch
        {
            return Environment.TickCount64 / 1000.0;
        }
        return 0;
    }

    public NetworkMetrics[] GetNetworkStats()
    {
        var results = new List<NetworkMetrics>();
        try
        {
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus != OperationalStatus.Up) continue;
                var stats = ni.GetIPStatistics();
                results.Add(new NetworkMetrics
                {
                    Interface = ni.Name,
                    RxBytes = (long)stats.BytesReceived,
                    TxBytes = (long)stats.BytesSent,
                });
            }
        }
        catch { }
        return results.ToArray();
    }

    public ProcessInfo[] GetTopProcesses()
    {
        var result = new List<ProcessInfo>();
        try
        {
            var processes = Process.GetProcesses()
                .Where(p =>
                {
                    try { _ = p.Handle; return true; }
                    catch { return false; }
                })
                .OrderByDescending(p =>
                {
                    try { return p.TotalProcessorTime.TotalMilliseconds; }
                    catch { return 0.0; }
                })
                .Take(5);

            foreach (var p in processes)
            {
                try
                {
                    result.Add(new ProcessInfo
                    {
                        Pid = p.Id,
                        Name = p.ProcessName,
                        Cpu = Math.Round(p.TotalProcessorTime.TotalSeconds, 2),
                        Memory = Math.Round(p.WorkingSet64 / (1024.0 * 1024.0), 2),
                    });
                }
                catch { }
            }
        }
        catch { }
        return result.ToArray();
    }

    public PortInfo[] GetOpenDatabasePorts()
    {
        var result = new List<PortInfo>();
        try
        {
            var properties = IPGlobalProperties.GetIPGlobalProperties();
            var listeners = properties.GetActiveTcpListeners();

            // Get process-to-port mapping via netstat
            var procPorts = new Dictionary<int, string>();
            try
            {
                var psi = new ProcessStartInfo("netstat", "-ano")
                {
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                using var proc = Process.Start(psi);
                if (proc != null)
                {
                    var output = proc.StandardOutput.ReadToEnd();
                    proc.WaitForExit();

                    foreach (var line in output.Split('\n'))
                    {
                        var trimmed = line.Trim();
                        if (!trimmed.StartsWith("TCP", StringComparison.OrdinalIgnoreCase)) continue;

                        var parts = trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length < 5) continue;

                        var localPart = parts[1];
                        var colonIdx = localPart.LastIndexOf(':');
                        if (colonIdx < 0) continue;

                        if (int.TryParse(localPart[(colonIdx + 1)..], out var portNum) &&
                            int.TryParse(parts[4], out var pid))
                        {
                            if (!procPorts.ContainsKey(portNum))
                            {
                                try
                                {
                                    var process = Process.GetProcessById(pid);
                                    procPorts[portNum] = process.ProcessName;
                                }
                                catch { procPorts[portNum] = "unknown"; }
                            }
                        }
                    }
                }
            }
            catch { }

            foreach (var ep in listeners)
            {
                var port = ep.Port;
                var process = procPorts.GetValueOrDefault(port);

                var isDbPort = DbDefaultPorts.ContainsKey(port);
                var isDbProcess = process != null && DbProcessNames.Contains(process);

                if (!isDbPort && !isDbProcess) continue;
                if (!isDbProcess && port < 1024 && !isDbPort) continue;

                result.Add(new PortInfo
                {
                    Address = ep.Address.Equals(IPAddress.Any) ? "0.0.0.0" : ep.Address.ToString(),
                    Port = port,
                    Protocol = "tcp",
                    Process = process ?? (DbDefaultPorts.GetValueOrDefault(port) ?? "unknown"),
                    State = "listening",
                });
            }
        }
        catch { }
        return result.ToArray();
    }

    public ServiceInfo[] GetServices()
    {
        var result = new List<ServiceInfo>();
        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT Name, State, Status FROM Win32_Service");
            foreach (var obj in searcher.Get())
            {
                var name = obj["Name"]?.ToString();
                var state = obj["State"]?.ToString()?.ToLower();
                if (string.IsNullOrEmpty(name)) continue;
                result.Add(new ServiceInfo
                {
                    Identifier = name,
                    Name = name,
                    State = state ?? "unknown",
                });
            }
        }
        catch { }
        return result.ToArray();
    }

    public string GetOperatingSystem()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Caption FROM Win32_OperatingSystem");
            foreach (var obj in searcher.Get())
            {
                return obj["Caption"]?.ToString()?.Trim() ?? "Windows Unknown";
            }
        }
        catch { }
        return Environment.OSVersion.ToString();
    }

    public string GetArchitecture()
    {
        return Environment.Is64BitOperatingSystem ? "x86_64" : "x86";
    }

    public string GetHostname()
    {
        return Environment.MachineName;
    }

    public CpuSpec GetCpuSpec()
    {
        var spec = new CpuSpec();
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Name, NumberOfCores FROM Win32_Processor");
            foreach (var obj in searcher.Get())
            {
                spec.Model = obj["Name"]?.ToString()?.Trim();
                spec.Cores = Convert.ToInt32(obj["NumberOfCores"]);
                break;
            }
        }
        catch { }
        return spec;
    }

    public string GetMemorySpec()
    {
        long totalKb = 0;
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT TotalVisibleMemorySize FROM Win32_OperatingSystem");
            foreach (var obj in searcher.Get())
            {
                totalKb = Convert.ToInt64(obj["TotalVisibleMemorySize"]);
                break;
            }
        }
        catch { }
        var totalGb = Math.Round(totalKb / (1024.0 * 1024.0), 2);
        return $"{totalGb} GB";
    }

    public string GetDiskSpec()
    {
        long totalBytes = 0;
        try
        {
            foreach (var drive in DriveInfo.GetDrives())
            {
                if (drive.IsReady && drive.Name == @"C:\")
                {
                    totalBytes = drive.TotalSize;
                    break;
                }
            }
        }
        catch { }
        var totalGb = Math.Round(totalBytes / (1024.0 * 1024.0 * 1024.0), 2);
        return $"{totalGb} GB";
    }
}
