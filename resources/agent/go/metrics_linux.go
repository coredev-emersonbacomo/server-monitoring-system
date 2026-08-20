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
	"time"
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

// processNoiseNames are built-in kernel/OS/infra processes that are never
// worth reporting (the "noise filter"). Matched case-insensitively against
// the process comm. A process explicitly selected in a server's DB
// process_filter is still reported (the collector receives the allowed set).
var processNoiseNames = map[string]bool{
	"systemd": true, "kthreadd": true, "kworker": true, "ksoftirqd": true,
	"kdevtmpfs": true, "rcu": true, "migration": true, "watchdog": true,
	"irq": true, "kauditd": true, "khugepaged": true, "ksmd": true,
	"oom_reaper": true, "khungtaskd": true, "kcompactd": true, "kblockd": true,
	"md": true, "jbd2": true, "flush": true, "loop": true, "systemd-journald": true,
	"systemd-udevd": true, "systemd-resolved": true, "systemd-timesyncd": true,
	"systemd-logind": true, "systemd-networkd": true, "systemd-userdbd": true,
	"dbus-daemon": true, "avahi-daemon": true, "acpid": true, "cron": true,
	"atd": true, "rsyslogd": true, "polkitd": true, "unattended-upgr": true,
	"haveged": true, "irqbalance": true, "auditd": true, "modprobe": true,
	"udevd": true, "udevadm": true, "multipathd": true, "rpcbind": true,
	"iscsid": true, "containerd": true, "dockerd": true, "sshd": true,
}

// procProcessSample is the per-PID CPU state read from /proc on one pass.
type procProcessSample struct {
	comm  string
	ticks float64
}

// readProcProcessSamples returns per-PID CPU ticks (utime+stime from /proc/
// <pid>/stat) and the machine-wide total ticks from /proc/stat, both sampled
// at the same instant. The ratio of the two deltas is the process' share of
// total machine CPU — no clock-ticks-per-second constant needed.
func readProcProcessSamples() (map[int]procProcessSample, float64) {
	samples := make(map[int]procProcessSample)
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return nil, 0
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		pid, err := strconv.Atoi(e.Name())
		if err != nil {
			continue
		}
		data, err := os.ReadFile("/proc/" + e.Name() + "/stat")
		if err != nil {
			continue
		}
		content := string(data)
		closeParen := strings.LastIndexByte(content, ')')
		if closeParen < 0 {
			continue
		}
		comm := strings.TrimSpace(content[strings.IndexByte(content, '(')+1 : closeParen])
		rest := strings.Fields(content[closeParen+1:])
		if len(rest) < 13 {
			continue
		}
		utime, _ := strconv.ParseFloat(rest[11], 64)
		stime, _ := strconv.ParseFloat(rest[12], 64)
		samples[pid] = procProcessSample{comm: comm, ticks: utime + stime}
	}

	totalTicks := 0.0
	if stat, err := os.ReadFile("/proc/stat"); err == nil {
		if fields := strings.Fields(strings.SplitN(string(stat), "\n", 2)[0]); len(fields) > 1 {
			for _, f := range fields[1:] {
				v, _ := strconv.ParseFloat(f, 64)
				totalTicks += v
			}
		}
	}
	return samples, totalTicks
}

// getProcesses reports processes sorted by real short-window CPU% (share
// of total machine CPU), noise-filtered and capped at 50. `ps %cpu` is a
// lifetime average and formatted /proc counters are erratic, so we sample the
// raw utime/stime counters over a controlled interval instead.
func getProcesses(allowed map[string]bool) []ProcessInfo {
	s0, total0 := readProcProcessSamples()
	if len(s0) == 0 || total0 <= 0 {
		return nil
	}
	time.Sleep(800 * time.Millisecond)
	s1, total1 := readProcProcessSamples()

	totalDelta := total1 - total0
	if totalDelta <= 0 {
		return nil
	}

	pageSize := float64(os.Getpagesize())
	var result []ProcessInfo
	for pid, cur := range s1 {
		prev, ok := s0[pid]
		if !ok {
			continue
		}
		name := strings.ToLower(cur.comm)
		if processNoiseNames[name] && !allowed[name] {
			continue
		}
		delta := cur.ticks - prev.ticks
		if delta < 0 {
			continue
		}
		mem := 0.0
		if statm, err := os.ReadFile(fmt.Sprintf("/proc/%d/statm", pid)); err == nil {
			if sf := strings.Fields(string(statm)); len(sf) > 1 {
				if pages, err := strconv.ParseFloat(sf[1], 64); err == nil {
					mem = math.Round(pages*pageSize/1024/1024*100) / 100
				}
			}
		}
		result = append(result, ProcessInfo{
			Pid:    int32(pid),
			Name:   cur.comm,
			Cpu:    math.Round(delta/totalDelta*10000) / 100,
			Memory: mem,
		})
	}

	return capProcesses(result, allowed, maxProcesses)
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
		// Filter out internal OS noise ports & dynamic high ports
		ignoredPorts := map[int]bool{
			135: true, 137: true, 138: true, 139: true, 445: true, 500: true, 4500: true,
			5353: true, 5355: true, 7680: true, 5985: true, 5986: true,
		}
		if ignoredPorts[port] || port >= 49152 {
			continue
		}

		if process != "" {
			procLower := strings.ToLower(process)
			if strings.Contains(procLower, "systemd") || strings.Contains(procLower, "rpcbind") ||
				strings.Contains(procLower, "avahi") || strings.Contains(procLower, "dbus") {
				continue
			}
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

func (m *metricsCollector) GetCPUSpec() *CPUSpec              { return getCPUSpec() }
func (m *metricsCollector) GetMemorySpec() string             { return getMemorySpec() }
func (m *metricsCollector) GetDiskSpec() string               { return getDiskSpec() }
func (m *metricsCollector) GetOS() string                     { return getOS() }
func (m *metricsCollector) GetArch() string                   { return getArch() }
func (m *metricsCollector) GetHostname() string               { return getHostname() }
func (m *metricsCollector) GetCPUUsage() *CPUMetrics          { return getCPUUsage() }
func (m *metricsCollector) GetMemoryUsage() *MemoryMetrics    { return getMemoryUsage() }
func (m *metricsCollector) GetDiskUsage() *DiskMetrics        { return getDiskUsage() }
func (m *metricsCollector) GetUptime() float64                { return getUptime() }
func (m *metricsCollector) GetNetworkStats() []NetworkMetrics { return getNetworkStats() }
func (m *metricsCollector) GetProcesses(allowed map[string]bool) []ProcessInfo {
	return getProcesses(allowed)
}
func (m *metricsCollector) GetOpenDatabasePorts() []PortInfo { return getOpenDatabasePorts() }
