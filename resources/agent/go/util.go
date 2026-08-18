package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
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