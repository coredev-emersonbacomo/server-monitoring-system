//go:build windows

package main

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

var (
	kernel32              = syscall.NewLazyDLL("kernel32.dll")
	procGetSystemTimes    = kernel32.NewProc("GetSystemTimes")
	procGlobalMemoryStatusEx = kernel32.NewProc("GlobalMemoryStatusEx")
	procGetDiskFreeSpaceExW = kernel32.NewProc("GetDiskFreeSpaceExW")
	procGetNativeSystemInfo = kernel32.NewProc("GetNativeSystemInfo")
	procGetTickCount64    = kernel32.NewProc("GetTickCount64")
	iphlpapi              = syscall.NewLazyDLL("iphlpapi.dll")
	procGetExtendedTcpTable = iphlpapi.NewProc("GetExtendedTcpTable")
	advapi32              = syscall.NewLazyDLL("advapi32.dll")
	procOpenSCManager     = advapi32.NewProc("OpenSCManagerW")
	procCloseServiceHandle = advapi32.NewProc("CloseServiceHandle")
	procEnumServicesStatusEx = advapi32.NewProc("EnumServicesStatusExW")
)

const (
	SC_MANAGER_ENUMERATE_SERVICE = 0x0004
	SERVICE_WIN32                = 0x00000030
	SERVICE_STATE_ALL            = 0x00000003
	ERROR_MORE_DATA              = 234
	TCP_TABLE_OWNER_PID_LISTENER = 4
	AF_INET                      = 2
)

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

type metricsCollector struct {
	lastIdle   uint64
	lastKernel uint64
	lastUser   uint64
}

func newMetricsCollector() *metricsCollector { return &metricsCollector{} }

func getHostname() string {
	h, _ := os.Hostname()
	return h
}

func getOS() string {
	return "Windows"
}

func getArch() string {
	if runtime.GOARCH == "amd64" {
		return "x86_64"
	}
	return "x86"
}

type memoryStatusEx struct {
	length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

func getCPUSpec() *CPUSpec {
	spec := &CPUSpec{Model: "Unknown CPU", Cores: runtime.NumCPU()}
	out, err := exec.Command("powershell", "-Command",
		"Get-CimInstance Win32_Processor | Select-Object -ExpandProperty Name").Output()
	if err == nil {
		if name := strings.TrimSpace(string(out)); name != "" {
			spec.Model = name
		}
	}
	return spec
}

func getMemorySpec() string {
	var ms memoryStatusEx
	ms.length = uint32(unsafe.Sizeof(ms))
	ret, _, _ := procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&ms)))
	if ret == 0 {
		return "0 GB"
	}
	totalGB := math.Round(float64(ms.TotalPhys)/1024/1024/1024*100) / 100
	return fmt.Sprintf("%.2f GB", totalGB)
}

func getDiskSpec() string {
	var free, total int64
	root := "C:\\"
	rootPtr, _ := syscall.UTF16PtrFromString(root)
	ret, _, _ := procGetDiskFreeSpaceExW.Call(
		uintptr(unsafe.Pointer(rootPtr)),
		uintptr(unsafe.Pointer(&free)),
		uintptr(unsafe.Pointer(&total)),
		0,
	)
	if ret == 0 {
		return "0 GB"
	}
	totalGB := math.Round(float64(total)/1024/1024/1024*100) / 100
	return fmt.Sprintf("%.2f GB", totalGB)
}

func (m *metricsCollector) GetCPUUsage() *CPUMetrics {
	nowIdle, nowKernel, nowUser := getSystemTimes()

	if m.lastIdle > 0 {
		idleDiff := nowIdle - m.lastIdle
		kernelDiff := nowKernel - m.lastKernel
		totalDiff := kernelDiff + (nowUser - m.lastUser)

		load1 := 0.0
		if totalDiff > 0 {
			load1 = math.Round((1-float64(idleDiff)/float64(totalDiff))*10000) / 100
		}
		m.lastIdle = nowIdle
		m.lastKernel = nowKernel
		m.lastUser = nowUser

		return &CPUMetrics{
			Load1:  load1,
			Load5:  load1,
			Load15: load1,
		}
	}

	m.lastIdle = nowIdle
	m.lastKernel = nowKernel
	m.lastUser = nowUser
	time.Sleep(100 * time.Millisecond)

	nowIdle, nowKernel, nowUser = getSystemTimes()
	idleDiff := nowIdle - m.lastIdle
	kernelDiff := nowKernel - m.lastKernel
	totalDiff := kernelDiff + (nowUser - m.lastUser)

	load1 := 0.0
	if totalDiff > 0 {
		load1 = math.Round((1-float64(idleDiff)/float64(totalDiff))*10000) / 100
	}
	m.lastIdle = nowIdle
	m.lastKernel = nowKernel
	m.lastUser = nowUser

	return &CPUMetrics{Load1: load1, Load5: load1, Load15: load1}
}

func getSystemTimes() (idle, kernel, user uint64) {
	var idleTime, kernelTime, userTime syscall.Filetime
	ret, _, _ := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idleTime)),
		uintptr(unsafe.Pointer(&kernelTime)),
		uintptr(unsafe.Pointer(&userTime)),
	)
	if ret == 0 {
		return 0, 0, 0
	}
	return uint64(idleTime.LowDateTime) | (uint64(idleTime.HighDateTime) << 32),
		uint64(kernelTime.LowDateTime) | (uint64(kernelTime.HighDateTime) << 32),
		uint64(userTime.LowDateTime) | (uint64(userTime.HighDateTime) << 32)
}

func (m *metricsCollector) GetMemoryUsage() *MemoryMetrics {
	var ms memoryStatusEx
	ms.length = uint32(unsafe.Sizeof(ms))
	ret, _, _ := procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&ms)))
	if ret == 0 {
		return &MemoryMetrics{}
	}
	totalKb := ms.TotalPhys / 1024
	freeKb := ms.AvailPhys / 1024
	usedKb := totalKb - freeKb
	percent := 0.0
	if totalKb > 0 {
		percent = math.Round(float64(usedKb)/float64(totalKb)*10000) / 100
	}
	return &MemoryMetrics{
		TotalKb: int64(totalKb),
		UsedKb:  int64(usedKb),
		FreeKb:  int64(freeKb),
		Percent: percent,
	}
}

func (m *metricsCollector) GetDiskUsage() *DiskMetrics {
	var free, total int64
	root, _ := syscall.UTF16PtrFromString("C:\\")
	ret, _, _ := procGetDiskFreeSpaceExW.Call(
		uintptr(unsafe.Pointer(root)),
		uintptr(unsafe.Pointer(&free)),
		uintptr(unsafe.Pointer(&total)),
		0,
	)
	if ret == 0 {
		return &DiskMetrics{}
	}
	used := total - free
	percent := 0.0
	if total > 0 {
		percent = math.Round(float64(used)/float64(total)*10000) / 100
	}
	return &DiskMetrics{Total: total, Used: used, Free: free, Percent: percent}
}

func (m *metricsCollector) GetUptime() float64 {
	ret, _, _ := procGetTickCount64.Call()
	if ret == 0 {
		return 0
	}
	return float64(ret) / 1000
}

func (m *metricsCollector) GetNetworkStats() []NetworkMetrics {
	out, err := exec.Command("powershell", "-Command",
		"Get-NetAdapterStatistics | Where-Object { $_.State -eq 'Enabled' } | Select-Object Name,ReceivedBytes,SentBytes | ConvertTo-Json").Output()
	if err != nil {
		return nil
	}

	var result []NetworkMetrics
	lines := strings.Split(string(out), "\n")
	inObj := false
	var current NetworkMetrics

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "{" {
			inObj = true
			current = NetworkMetrics{}
			continue
		}
		if line == "}" {
			inObj = false
			if current.Interface != "" {
				result = append(result, current)
			}
			continue
		}
		if !inObj || !strings.Contains(line, ":") {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		key := strings.Trim(strings.TrimSpace(parts[0]), "\"")
		val := strings.Trim(strings.TrimSpace(parts[1]), "\",")
		switch key {
		case "Name":
			current.Interface = val
		case "ReceivedBytes":
			current.RxBytes, _ = strconv.ParseInt(val, 10, 64)
		case "SentBytes":
			current.TxBytes, _ = strconv.ParseInt(val, 10, 64)
		}
	}
	return result
}

func (m *metricsCollector) GetTopProcesses() []ProcessInfo {
	// Wrap in @(...) to guarantee a JSON array is always returned by ConvertTo-Json
	out, err := exec.Command("powershell", "-Command",
		"@(Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Sort-Object PercentProcessorTime -Descending | Select-Object -First 5 IDProcess,Name,PercentProcessorTime,WorkingSetPrivate) | ConvertTo-Json").Output()
	if err != nil {
		return nil
	}

	type wmiProcess struct {
		IDProcess            int32   `json:"IDProcess"`
		Name                 string  `json:"Name"`
		PercentProcessorTime float64 `json:"PercentProcessorTime"`
		WorkingSetPrivate    float64 `json:"WorkingSetPrivate"`
	}

	var wmiList []wmiProcess
	if err := json.Unmarshal(out, &wmiList); err != nil {
		// If unmarshalling as array fails, try unmarshalling as a single object
		var single wmiProcess
		if errSingle := json.Unmarshal(out, &single); errSingle == nil {
			wmiList = []wmiProcess{single}
		} else {
			fmt.Fprintf(os.Stderr, "[Metrics] Failed to parse top processes JSON: %v\n", err)
			return nil
		}
	}

	numCores := float64(runtime.NumCPU())
	if numCores <= 0 {
		numCores = 1
	}

	var result []ProcessInfo
	for _, p := range wmiList {
		result = append(result, ProcessInfo{
			Pid:    p.IDProcess,
			Name:   p.Name,
			Cpu:    math.Round((p.PercentProcessorTime/numCores)*100) / 100,
			Memory: math.Round(p.WorkingSetPrivate/1024/1024*100) / 100,
		})
	}
	return result
}

func (m *metricsCollector) GetOpenDatabasePorts() []PortInfo {
	out, err := exec.Command("netstat", "-ano").Output()
	if err != nil {
		return nil
	}

	// Build a map of PID to Process Name using tasklist (extremely fast, ~50ms once)
	pidMap := make(map[int]string)
	if tasklistOut, err := exec.Command("tasklist", "/FO", "CSV", "/NH").Output(); err == nil {
		reader := csv.NewReader(bytes.NewReader(tasklistOut))
		if records, err := reader.ReadAll(); err == nil {
			for _, record := range records {
				if len(record) >= 2 {
					name := record[0]
					pidStr := record[1]
					if pid, err := strconv.Atoi(pidStr); err == nil {
						pidMap[pid] = name
					}
				}
			}
		}
	}

	procPorts := make(map[int]string)

	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "TCP") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		localPart := fields[1]
		colonIdx := strings.LastIndex(localPart, ":")
		if colonIdx < 0 {
			continue
		}
		portStr := localPart[colonIdx+1:]
		port, err := strconv.Atoi(portStr)
		if err != nil {
			continue
		}
		pid, err := strconv.Atoi(fields[4])
		if err != nil {
			continue
		}
		if _, exists := procPorts[port]; !exists {
			procPorts[port] = fmt.Sprintf("pid:%d", pid)
		}
	}

	var result []PortInfo

	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "TCP") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		localPart := fields[1]
		colonIdx := strings.LastIndex(localPart, ":")
		if colonIdx < 0 {
			continue
		}
		portStr := localPart[colonIdx+1:]
		port, err := strconv.Atoi(portStr)
		if err != nil {
			continue
		}
		addr := localPart[:colonIdx]

		process := ""
		if len(fields) >= 5 {
			pid, _ := strconv.Atoi(fields[4])
			process = pidMap[pid]
		}

		// Only collect LISTENING sockets
		state := ""
		if len(fields) >= 4 {
			state = strings.ToUpper(fields[3])
		}
		if state != "LISTENING" && state != "LISTEN" {
			continue
		}

		if addr == "127.0.0.1" || addr == "[::1]" || addr == "::1" || addr == "localhost" {
			continue
		}

		// Filter out internal OS noise ports & RPC dynamic high ports
		ignoredPorts := map[int]bool{
			135: true, 137: true, 138: true, 139: true, 445: true, 500: true, 4500: true,
			5353: true, 5355: true, 7680: true, 5985: true, 5986: true,
		}
		if ignoredPorts[port] || port >= 49152 {
			continue
		}

		if process != "" {
			procLower := strings.ToLower(process)
			if strings.Contains(procLower, "svchost") || strings.Contains(procLower, "lsass") ||
				strings.Contains(procLower, "services") || strings.Contains(procLower, "system") ||
				strings.Contains(procLower, "spoolsv") || strings.Contains(procLower, "smss") ||
				strings.Contains(procLower, "csrss") || strings.Contains(procLower, "wininit") ||
				strings.Contains(procLower, "alg") || strings.Contains(procLower, "dashost") {
				continue
			}
		}

		if process == "" {
			if name, ok := dbPortNames[port]; ok {
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



func (m *metricsCollector) GetCPUSpec() *CPUSpec           { return getCPUSpec() }
func (m *metricsCollector) GetMemorySpec() string          { return getMemorySpec() }
func (m *metricsCollector) GetDiskSpec() string            { return getDiskSpec() }
func (m *metricsCollector) GetOS() string                  { return getOS() }
func (m *metricsCollector) GetArch() string                { return getArch() }
func (m *metricsCollector) GetHostname() string            { return getHostname() }
