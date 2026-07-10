//go:build linux

package main

import (
	"fmt"
	"math"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

const dbProcessNames = "mysqld|mariadbd|mariadb|postgres|postmaster|mongod|redis-server|memcached|cassandra|rabbitmq-server|beam\\.smp|influxd|clickhouse-server|elasticsearch"

var dbPortNames = map[int]string{
	3306:  "mysql/mariadb",
	5432:  "postgresql",
	27017: "mongodb",
	6379:  "redis",
	11211: "memcached",
	9042:  "cassandra",
	5672:  "rabbitmq",
	8086:  "influxdb",
	9000:  "clickhouse",
	9200:  "elasticsearch",
}

func getCPUSpec() *CPUSpec {
	spec := &CPUSpec{Model: "Unknown CPU", Cores: 0}
	data, err := os.ReadFile("/proc/cpuinfo")
	if err != nil {
		return spec
	}

	re := regexp.MustCompile(`model name\s*:\s*(.*)`)
	if m := re.FindStringSubmatch(string(data)); len(m) > 1 {
		spec.Model = strings.TrimSpace(m[1])
	}

	out, _ := exec.Command("nproc").Output()
	if n, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
		spec.Cores = n
	}
	return spec
}

func getMemorySpec() string {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return "0 GB"
	}
	re := regexp.MustCompile(`MemTotal:\s+(\d+)`)
	if m := re.FindStringSubmatch(string(data)); len(m) > 1 {
		if kb, err := strconv.ParseFloat(m[1], 64); err == nil {
			return fmt.Sprintf("%.2f GB", kb/1024/1024)
		}
	}
	return "0 GB"
}

func getDiskSpec() string {
	out, err := exec.Command("df", "-B1", "/").Output()
	if err != nil {
		return "0 GB"
	}
	lines := strings.Split(string(out), "\n")
	if len(lines) < 2 {
		return "0 GB"
	}
	fields := strings.Fields(lines[1])
	if len(fields) < 2 {
		return "0 GB"
	}
	total, _ := strconv.ParseInt(fields[1], 10, 64)
	return fmt.Sprintf("%.2f GB", float64(total)/1024/1024/1024)
}

func getOS() string {
	data, err := os.ReadFile("/etc/os-release")
	if err != nil {
		out, _ := exec.Command("lsb_release", "-ds").Output()
		if len(out) > 0 {
			return strings.TrimSpace(string(out))
		}
		return "Unknown Linux"
	}
	re := regexp.MustCompile(`PRETTY_NAME="?(.*?)"?\n`)
	if m := re.FindStringSubmatch(string(data)); len(m) > 1 {
		return strings.TrimSpace(m[1])
	}
	return "Unknown Linux"
}

func getArch() string {
	out, _ := exec.Command("uname", "-m").Output()
	return strings.TrimSpace(string(out))
}

func getHostname() string {
	h, _ := os.Hostname()
	return h
}

func getCPUUsage() *CPUMetrics {
	load1 := readProcLoadAvg(0)
	load5 := readProcLoadAvg(1)
	load15 := readProcLoadAvg(2)
	return &CPUMetrics{Load1: load1, Load5: load5, Load15: load15}
}

func readProcLoadAvg(index int) float64 {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(data))
	if len(fields) < 3 {
		return 0
	}
	v, _ := strconv.ParseFloat(fields[index], 64)
	return v
}

func getMemoryUsage() *MemoryMetrics {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return &MemoryMetrics{}
	}
	re := regexp.MustCompile(`(\w+):\s+(\d+)`)
	matches := re.FindAllStringSubmatch(string(data), -1)
	mem := make(map[string]int64)
	for _, m := range matches {
		v, _ := strconv.ParseInt(m[2], 10, 64)
		mem[m[1]] = v
	}

	total := mem["MemTotal"]
	available := mem["MemAvailable"]
	used := total - available
	percent := 0.0
	if total > 0 {
		percent = math.Round(float64(used)/float64(total)*10000) / 100
	}
	return &MemoryMetrics{
		TotalKb: total,
		UsedKb:  used,
		FreeKb:  available,
		Percent: percent,
	}
}

func getDiskUsage() *DiskMetrics {
	out, err := exec.Command("df", "-B1", "/").Output()
	if err != nil {
		return &DiskMetrics{}
	}
	lines := strings.Split(string(out), "\n")
	if len(lines) < 2 {
		return &DiskMetrics{}
	}
	fields := strings.Fields(lines[1])
	if len(fields) < 4 {
		return &DiskMetrics{}
	}
	total, _ := strconv.ParseInt(fields[1], 10, 64)
	used, _ := strconv.ParseInt(fields[2], 10, 64)
	free, _ := strconv.ParseInt(fields[3], 10, 64)
	percent := 0.0
	if total > 0 {
		percent = math.Round(float64(used)/float64(total)*10000) / 100
	}
	return &DiskMetrics{Total: total, Used: used, Free: free, Percent: percent}
}

func getUptime() float64 {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(data))
	if len(fields) < 1 {
		return 0
	}
	v, _ := strconv.ParseFloat(fields[0], 64)
	return v
}

func getNetworkStats() []NetworkMetrics {
	data, err := os.ReadFile("/proc/net/dev")
	if err != nil {
		return nil
	}

	var result []NetworkMetrics
	re := regexp.MustCompile(`^\s*(eth\w*|en\w*|ens\w*|eno\w*):\s*(\d+)\s+(?:\d+\s+){6}\s*(\d+)`)
	for _, line := range strings.Split(string(data), "\n") {
		m := re.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		rx, _ := strconv.ParseInt(m[2], 10, 64)
		tx, _ := strconv.ParseInt(m[3], 10, 64)
		result = append(result, NetworkMetrics{
			Interface: m[1],
			RxBytes:   rx,
			TxBytes:   tx,
		})
	}
	return result
}

func getTopProcesses() []ProcessInfo {
	out, err := exec.Command("ps", "-eo", "pid,comm,%cpu,%mem", "--sort=-%cpu").Output()
	if err != nil {
		return nil
	}

	var result []ProcessInfo
	lines := strings.Split(string(out), "\n")
	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		pid, _ := strconv.ParseInt(fields[0], 10, 32)
		cpu, _ := strconv.ParseFloat(fields[2], 64)
		mem, _ := strconv.ParseFloat(fields[3], 64)
		result = append(result, ProcessInfo{
			Pid:    int32(pid),
			Name:   fields[1],
			Cpu:    cpu,
			Memory: mem,
		})
		if len(result) >= 5 {
			break
		}
	}
	return result
}

func getOpenDatabasePorts() []PortInfo {
	out, err := exec.Command("ss", "-tlnp").Output()
	if err != nil {
		out2, err2 := exec.Command("netstat", "-tlnp").Output()
		if err2 != nil {
			return nil
		}
		out = out2
	}

	var result []PortInfo
	procRe := regexp.MustCompile(`users:\(\([""]([^""]+)`)
	dbProcRe := regexp.MustCompile(dbProcessNames)
	dbPortSet := make(map[int]string)
	for k, v := range dbPortNames {
		dbPortSet[k] = v
	}

	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "State") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 4 {
			continue
		}

		localAddr := parts[3]
		colonIdx := strings.LastIndex(localAddr, ":")
		if colonIdx < 0 {
			continue
		}
		portStr := localAddr[colonIdx+1:]
		port, err := strconv.Atoi(portStr)
		if err != nil {
			continue
		}

		process := ""
		if procM := procRe.FindStringSubmatch(line); len(procM) > 1 {
			process = procM[1]
		}

		addr := localAddr[:colonIdx]
		if addr == "127.0.0.1" || addr == "[::1]" || addr == "::1" || addr == "localhost" {
			continue
		}
		if addr == "0.0.0.0" || addr == "*" || addr == "::" {
			addr = "0.0.0.0"
		}
		if process == "" {
			if name, ok := dbPortSet[port]; ok {
				process = name
			} else {
				process = "unknown"
			}
		}

		result = append(result, PortInfo{
			Address:  addr,
			Port:     port,
			Protocol: "tcp",
			Process:  process,
			State:    "listening",
		})
	}
	return result
}

type metricsCollector struct{}

func newMetricsCollector() *metricsCollector { return &metricsCollector{} }

func (m *metricsCollector) GetCPUSpec() *CPUSpec          { return getCPUSpec() }
func (m *metricsCollector) GetMemorySpec() string         { return getMemorySpec() }
func (m *metricsCollector) GetDiskSpec() string           { return getDiskSpec() }
func (m *metricsCollector) GetOS() string                 { return getOS() }
func (m *metricsCollector) GetArch() string               { return getArch() }
func (m *metricsCollector) GetHostname() string           { return getHostname() }
func (m *metricsCollector) GetCPUUsage() *CPUMetrics      { return getCPUUsage() }
func (m *metricsCollector) GetMemoryUsage() *MemoryMetrics { return getMemoryUsage() }
func (m *metricsCollector) GetDiskUsage() *DiskMetrics     { return getDiskUsage() }
func (m *metricsCollector) GetUptime() float64             { return getUptime() }
func (m *metricsCollector) GetNetworkStats() []NetworkMetrics { return getNetworkStats() }
func (m *metricsCollector) GetTopProcesses() []ProcessInfo { return getTopProcesses() }
func (m *metricsCollector) GetOpenDatabasePorts() []PortInfo { return getOpenDatabasePorts() }
