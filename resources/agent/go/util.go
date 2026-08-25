package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"sort"
	"strings"
	"time"
)

const configFileName = "config.json"

// dataRoot is the root of all agent state, shared by every installation on the
// machine. Each installation lives under instances/<uuid>.
func dataRoot() string {
	if d := os.Getenv("MONITOR_AGENT_DATA_DIR"); d != "" {
		return d
	}
	if runtime.GOOS == "windows" {
		if pd := os.Getenv("ProgramData"); pd != "" {
			return filepath.Join(pd, "MonitorAgent")
		}
		return `C:\ProgramData\MonitorAgent`
	}
	return "/var/lib/monitor-agent"
}

// instanceDir is the isolated home of a single installation. Nothing of one
// installation ever leaks into another: config, logs and the uninstall marker
// all live here.
func instanceDir(instance string) string {
	return filepath.Join(dataRoot(), "instances", instance)
}

// parseInstance extracts the -instance <uuid> argument. Service runs get their
// args from the SCM/systemd; foreground runs read os.Args.
func parseInstance(args []string) string {
	for i := 0; i < len(args); i++ {
		if args[i] == "-instance" && i+1 < len(args) {
			return args[i+1]
		}
	}
	return ""
}

// loadConfig reads the config.json of one installation. There is no legacy
// fallback: every installation writes its own config at install time.
func loadConfig(dir string) (*BootstrapConfig, string, error) {
	cfgPath := filepath.Join(dir, configFileName)
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		return nil, "", fmt.Errorf("no config found at %s: %w", cfgPath, err)
	}
	cfg, err := parseConfig(data)
	if err != nil {
		return nil, "", err
	}
	return cfg, cfgPath, nil
}

func parseConfig(data []byte) (*BootstrapConfig, error) {
	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	cfg := &BootstrapConfig{confVersion: 1}
	if s, ok := raw["server_url"].(string); ok {
		cfg.ServerURL = s
	}
	if s, ok := raw["agent_version"].(string); ok {
		cfg.AgentVersion = s
	}
	if s, ok := raw["installation_id"].(string); ok {
		cfg.InstallationID = s
	}
	if s, ok := raw["provision_token"].(string); ok {
		cfg.ProvisionToken = s
	}

	if cfg.ServerURL == "" {
		return nil, fmt.Errorf("config is missing server_url")
	}
	return cfg, nil
}

func readConfig(path string) (*BootstrapConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read %s: %w", path, err)
	}
	return parseConfig(data)
}

func writeConfig(path string, cfg *BootstrapConfig) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// bootstrapDefaultConfig creates a minimal config.json when one is missing, so
// the file is always produced at the canonical instance location. It contains
// no secrets and no server_url — the external installer fills those in. The
// agent logs clearly and exits; the file existing (rather than a silent
// missing-config exit) is what makes the failure diagnosable.
func bootstrapDefaultConfig(dir, instance string) (*BootstrapConfig, string, error) {
	cfgPath := filepath.Join(dir, configFileName)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, "", fmt.Errorf("mkdir: %w", err)
	}
	cfg := &BootstrapConfig{
		InstallationID: instance,
	}
	if err := writeConfig(cfgPath, cfg); err != nil {
		return nil, "", fmt.Errorf("write config: %w", err)
	}
	return cfg, cfgPath, nil
}

// maxProcesses caps how many processes the collector reports when no explicit
// process filter is set. Grouping by name happens after collection, so the
// payload is bounded by unique names, not by this raw-process cap.
const maxProcesses = 500

// groupProcesses collapses processes with the same name into one row (Task
// Manager style): CPU and memory are summed, PIDs collected (sorted), and the
// lowest PID is kept as the row's representative pid. The returned list is
// sorted by total CPU descending. The count is the length of the PID list.
func groupProcesses(procs []ProcessInfo) []ProcessInfo {
	if len(procs) == 0 {
		return nil
	}
	type group struct {
		name   string
		cpu    float64
		memory float64
		pids   []int32
	}
	byName := make(map[string]*group, len(procs))
	order := make([]string, 0, len(procs))
	for _, p := range procs {
		key := strings.ToLower(strings.TrimSpace(p.Name))
		if key == "" {
			continue
		}
		g, ok := byName[key]
		if !ok {
			g = &group{name: p.Name}
			byName[key] = g
			order = append(order, key)
		}
		g.cpu += p.Cpu
		g.memory += p.Memory
		g.pids = append(g.pids, p.Pid)
	}
	out := make([]ProcessInfo, 0, len(order))
	for _, key := range order {
		g := byName[key]
		sort.Slice(g.pids, func(i, j int) bool { return g.pids[i] < g.pids[j] })
		out = append(out, ProcessInfo{
			Pid:    g.pids[0],
			Name:   g.name,
			Cpu:    math.Round(g.cpu*100) / 100,
			Memory: math.Round(g.memory*100) / 100,
			Pids:   g.pids,
		})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Cpu > out[j].Cpu })
	return out
}

// processSetSignature returns the sorted, unique, lowercase set of process
// names. Two snapshots with the same discoverable processes produce the same
// signature, regardless of CPU/pid churn, so the agent can skip re-sending
// available_processes until the discoverable set actually changes.
func processSetSignature(procs []ProcessInfo) []string {
	seen := make(map[string]struct{}, len(procs))
	for _, p := range procs {
		name := strings.ToLower(strings.TrimSpace(p.Name))
		if name == "" {
			continue
		}
		seen[name] = struct{}{}
	}
	out := make([]string, 0, len(seen))
	for name := range seen {
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

// portSetSignature is the numeric analogue of processSetSignature for ports.
func portSetSignature(ports []PortInfo) []int {
	seen := make(map[int]struct{}, len(ports))
	for _, p := range ports {
		seen[p.Port] = struct{}{}
	}
	out := make([]int, 0, len(seen))
	for port := range seen {
		out = append(out, port)
	}
	sort.Ints(out)
	return out
}

// interfaceSetSignature returns sorted unique interface names for available_interfaces change detection.
func interfaceSetSignature(nets []NetworkMetrics) []string {
	seen := make(map[string]struct{}, len(nets))
	for _, n := range nets {
		name := strings.TrimSpace(n.Interface)
		if name == "" {
			continue
		}
		seen[name] = struct{}{}
	}
	out := make([]string, 0, len(seen))
	for name := range seen {
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

// filterAvailableNetworks returns only non-disconnected interfaces (state == "up") for the available set.
func filterAvailableNetworks(nets []NetworkMetrics) []NetworkMetrics {
	out := make([]NetworkMetrics, 0, len(nets))
	for _, n := range nets {
		if strings.EqualFold(strings.TrimSpace(n.State), "up") {
			out = append(out, n)
		}
	}
	return out
}

// capProcesses keeps every explicitly filtered-in process (the `allowed` set)
// regardless of CPU, then fills the cap with the highest-CPU remainder. The
// collector truncates by CPU alone, so an idle monitored process would
// otherwise be dropped before the per-server DB filter ever sees it.
func capProcesses(procs []ProcessInfo, allowed map[string]bool, cap int) []ProcessInfo {
	sort.SliceStable(procs, func(i, j int) bool {
		ai := allowed[strings.ToLower(strings.TrimSpace(procs[i].Name))]
		aj := allowed[strings.ToLower(strings.TrimSpace(procs[j].Name))]
		if ai != aj {
			return ai
		}
		return procs[i].Cpu > procs[j].Cpu
	})
	if len(procs) > cap {
		return procs[:cap]
	}
	return procs
}

func downloadFile(urlStr string, destPath string) error {
	resp, err := http.Get(urlStr)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func updateBinary(binaryURL string) error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}

	oldPath := exePath + ".old"
	_ = os.Remove(oldPath)

	err = os.Rename(exePath, oldPath)
	if err != nil {
		return err
	}

	err = downloadFile(binaryURL, exePath)
	if err != nil {
		_ = os.Rename(oldPath, exePath)
		return err
	}

	_ = os.Chmod(exePath, 0755)
	return nil
}

func hasInternet() bool {
	conn, err := net.DialTimeout("tcp", "1.1.1.1:443", 5*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func waitForInternet() {
	for !hasInternet() {
		time.Sleep(5 * time.Second)
	}
}

// reportAgentPanic reports a crash to the backend. It never includes the
// private key, signatures or credentials.
func reportAgentPanic(client *AgentClient, errVal interface{}) {
	if client == nil || client.baseURL == "" {
		return
	}
	stack := string(debug.Stack())
	payload := map[string]string{
		"error":       fmt.Sprintf("%v", errVal),
		"stack_trace": stack,
	}
	_ = client.postNotification(client.apiURL("/api/v1/agent/error"), payload)
}

// runSelfTest exercises the platform key store round-trip: create/get the key,
// sign a random challenge and verify the signature with the public key. This is
// the runnable check for the OS key-store integration.
func runSelfTest() error {
	ctx := context.Background()
	ks := newKeyStore()

	keyName := selftestKeyID()
	key, err := ks.GetOrCreateKey(ctx, keyName)
	if err != nil {
		return fmt.Errorf("GetOrCreateKey: %w", err)
	}

	pub, err := ks.PublicKey(ctx, key)
	if err != nil {
		return fmt.Errorf("PublicKey: %w", err)
	}
	if len(pub) == 0 {
		return fmt.Errorf("PublicKey returned empty blob")
	}

	challenge := make([]byte, 32)
	for i := range challenge {
		challenge[i] = byte(i)
	}

	sig, err := ks.Sign(ctx, key, challenge)
	if err != nil {
		return fmt.Errorf("Sign: %w", err)
	}
	if len(sig) == 0 {
		return fmt.Errorf("Sign returned empty signature")
	}

	if !verifySignature(pub, challenge, sig) {
		return fmt.Errorf("signature did not verify against public key")
	}

	fmt.Printf("  key: %s\n  public key hash: %s\n", keyName, publicKeyHashHex(pub))
	return nil
}
