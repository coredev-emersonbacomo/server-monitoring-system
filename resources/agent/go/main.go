package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"time"
)

// currentInstance records the installation UUID of the running loop so the
// restart helper can relaunch the same installation after a binary update.
var currentInstance string

// writeStartupLog appends a line to <dataRoot>/startup.log. It exists because
// early failures in runAgentLoop happen before agent.log is wired up, and a
// service's stderr is invisible to the SCM. LocalSystem owns ProgramData, so
// this file is always writable.
func writeStartupLog(format string, args ...interface{}) {
	dir := dataRoot()
	_ = os.MkdirAll(dir, 0755)
	f, err := os.OpenFile(filepath.Join(dir, "startup.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return
	}
	defer f.Close()
	fmt.Fprintf(f, "%s %s\n", time.Now().Format("2006-01-02 15:04:05"), fmt.Sprintf(format, args...))
}

func main() {
	// Global panic recovery and logging. crash.log lives in the instance
	// directory when we know the instance, else in the data root.
	defer func() {
		if r := recover(); r != nil {
			dir := dataRoot()
			if inst := parseInstance(os.Args); inst != "" {
				dir = instanceDir(inst)
			}
			_ = os.MkdirAll(dir, 0755)
			logFile := filepath.Join(dir, "crash.log")
			f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
			if err == nil {
				defer f.Close()
				timestamp := time.Now().Format("2006-01-02 15:04:05")
				fmt.Fprintf(f, "\n=== CRASH LOG %s ===\n", timestamp)
				fmt.Fprintf(f, "Panic: %v\n", r)
				buf := make([]byte, 2048)
				n := runtime.Stack(buf, false)
				f.Write(buf[:n])
				fmt.Fprintln(f, "=====================")
			}
			fmt.Fprintf(os.Stderr, "Fatal crash: %v. Check crash.log for details.\n", r)
			os.Exit(1)
		}
	}()

	if len(os.Args) > 1 {
		cmd := os.Args[1]
		switch cmd {
		case "-install", "--install":
			instance := parseInstance(os.Args)
			if instance == "" {
				fatalUsage("-install requires -instance <uuid>")
			}
			if err := installService(serviceNameFor(instance), instance); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to install service: %v\n", err)
				os.Exit(1)
			}
			fmt.Printf("Service %s installed successfully.\n", serviceNameFor(instance))
			return
		case "-uninstall", "--uninstall":
			instance := parseInstance(os.Args)
			if instance == "" {
				fatalUsage("-uninstall requires -instance <uuid>")
			}
			if err := uninstallWithMarker(instance); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to uninstall: %v\n", err)
				os.Exit(1)
			}
			return
		case "-has-key", "--has-key":
			keyName := flagValue(os.Args, "-key")
			if keyName == "" {
				fatalUsage("-has-key requires -key <keyName>")
			}
			ok, err := newKeyStore().HasKey(context.Background(), keyName)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Failed to check key store: %v\n", err)
				os.Exit(1)
			}
			if ok {
				fmt.Println("present")
			} else {
				fmt.Println("absent")
				os.Exit(1)
			}
			return
		case "-selftest", "--selftest":
			if err := runSelfTest(); err != nil {
				fmt.Fprintf(os.Stderr, "Self-test failed: %v\n", err)
				os.Exit(1)
			}
			fmt.Println("Self-test passed.")
			return
		}
	}

	instance := parseInstance(os.Args)
	if instance == "" {
		instance = os.Getenv("MONITOR_AGENT_INSTANCE")
	}
	if instance == "" {
		log.SetOutput(os.Stderr)
		log.Println("Fatal: no installation UUID given. Run with -instance <uuid> or set MONITOR_AGENT_INSTANCE.")
		os.Exit(1)
	}

	isSvc, err := isServiceSession()
	if err == nil && isSvc {
		writeStartupLog("service mode: instance=%s running %s", instance, serviceNameFor(instance))
		IsService = true
		if err := runService(serviceNameFor(instance)); err != nil {
			writeStartupLog("runService error: %v", err)
			fmt.Fprintf(os.Stderr, "Service execution failed: %v\n", err)
			os.Exit(1)
		}
		writeStartupLog("runService returned")
		return
	}
	writeStartupLog("foreground mode: instance=%s", instance)

	stopChan := make(chan struct{})
	runAgentLoop(instance, stopChan)
}

func fatalUsage(msg string) {
	fmt.Fprintf(os.Stderr, "%s\n", msg)
	os.Exit(1)
}

// flagValue returns the value following the named flag, or "" if absent.
func flagValue(args []string, name string) string {
	for i := 0; i < len(args); i++ {
		if args[i] == name && i+1 < len(args) {
			return args[i+1]
		}
	}
	return ""
}

// serviceNameFor derives the per-installation service name. Every installation
// gets its own service, so multiple agents on one machine are fully isolated
// and can be managed (start/stop/uninstall) independently.
func serviceNameFor(instance string) string {
	return "MonitorAgent-" + instance
}

const uninstallFlagFile = "uninstall.flag"

// uninstallWithMarker performs a marker-based uninstall. The uninstaller runs
// as the administrator, but the identity key lives in the keystore of the
// service account (LocalSystem on Windows) — which the administrator cannot
// read or delete. So the key deletion is delegated to the running service:
//
//  1. write uninstall.flag into the instance directory
//  2. stop the service; the service, upon seeing the flag, revokes the agent
//     on the backend, deletes its own identity key and records "done"
//  3. when the service has stopped, remove the service registration and the
//     instance directory
func uninstallWithMarker(instance string) error {
	dir := instanceDir(instance)
	marker := filepath.Join(dir, uninstallFlagFile)
	serviceName := serviceNameFor(instance)

	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to access instance directory: %w", err)
	}
	if err := os.WriteFile(marker, []byte("pending"), 0644); err != nil {
		return fmt.Errorf("failed to write uninstall marker: %w", err)
	}
	fmt.Println("Uninstall marker written; stopping service for cleanup...")

	if err := stopServiceAndWait(serviceName, 90*time.Second); err != nil {
		return fmt.Errorf("service did not stop cleanly (identity key may remain): %w", err)
	}

	if data, err := os.ReadFile(marker); err == nil && string(data) == "done" {
		fmt.Println("Agent revoked and identity key deleted.")
	} else {
		fmt.Println("Warning: service did not confirm cleanup; the identity key may remain.")
	}

	if err := deleteService(serviceName); err != nil {
		return fmt.Errorf("failed to delete service: %w", err)
	}
	if err := os.RemoveAll(dir); err != nil {
		return fmt.Errorf("failed to remove instance directory: %w", err)
	}
	fmt.Println("Uninstall complete.")
	return nil
}

// handleUninstallMarker runs at agent startup. If an uninstall.flag is present,
// the agent revokes itself on the backend, deletes its own identity key and
// records the result so the uninstaller can confirm. Returns true when the
// agent should exit (it is being uninstalled).
func handleUninstallMarker(instance, dir, keyName string, keystore KeyStore, client *AgentClient) bool {
	marker := filepath.Join(dir, uninstallFlagFile)
	if _, err := os.Stat(marker); err != nil {
		return false
	}

	log.Println("Uninstall marker detected — revoking agent and removing identity key.")
	if client != nil {
		if err := client.revokeInstallation(); err != nil {
			log.Printf("Warning: revocation request failed: %v", err)
		}
	}
	if err := keystore.DeleteKey(context.Background(), keyName); err != nil {
		if errors.Is(err, ErrKeyNotFound) {
			log.Println("No identity key found — nothing to remove.")
		} else {
			log.Printf("Warning: failed to delete identity key: %v", err)
		}
	}
	if err := os.WriteFile(marker, []byte("done"), 0644); err != nil {
		log.Printf("Warning: failed to record uninstall result: %v", err)
	}
	return true
}

func runAgentLoop(instance string, stopChan <-chan struct{}) {
	currentInstance = instance
	dir := instanceDir(instance)
	writeStartupLog("runAgentLoop start: instance=%s dir=%s", instance, dir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		writeStartupLog("MkdirAll failed: %v", err)
		log.Printf("Failed to create instance directory %s: %v", dir, err)
		return
	}

	// Redirect stdout and stderr to agent.log in the instance directory. The
	// log package writes timestamped lines to the same file.
	logFile, err := os.OpenFile(filepath.Join(dir, "agent.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err == nil {
		os.Stdout = logFile
		os.Stderr = logFile
		log.SetOutput(logFile)
		log.SetFlags(log.LstdFlags)
	} else {
		writeStartupLog("agent.log open failed: %v", err)
	}

	config, configPath, err := loadConfig(dir)
	if err != nil {
		writeStartupLog("loadConfig failed: %v", err)
		log.Printf("Failed to load config: %v", err)

		// Root cause of "config.json never produced": the agent never created
		// it — only the external installer did, so a bare/moved installation
		// exited silently. Self-bootstrap a minimal default so the file always
		// exists at the canonical location and the failure stays visible.
		if cfg, path, cerr := bootstrapDefaultConfig(dir, instance); cerr == nil {
			config, configPath = cfg, path
			writeStartupLog("Created default config at %s — installer must supply server_url", path)
			log.Printf("Created default config at %s — the installer will fill in server_url.", path)
			return
		} else {
			writeStartupLog("bootstrapDefaultConfig failed: %v", cerr)
			log.Printf("Failed to create default config: %v", cerr)
			return
		}
	}

	// The -instance argument is the source of truth for the installation UUID.
	// Persist it once so the config always records which installation this is.
	if config.InstallationID == "" {
		config.InstallationID = instance
		_ = writeConfig(configPath, config)
	}

	keyName := keyIDForInstallation(instance)
	keystore := newKeyStore()
	key, err := keystore.GetOrCreateKey(context.Background(), keyName)
	if err != nil {
		writeStartupLog("GetOrCreateKey failed: %v", err)
		log.Printf("Failed to obtain agent key: %v", err)
		return
	}
	log.Printf("Identity key stored: %s", keyName)
	pub, err := keystore.PublicKey(context.Background(), key)
	if err != nil {
		writeStartupLog("PublicKey failed: %v", err)
		log.Printf("Failed to read public key: %v", err)
		return
	}
	pubHash := publicKeyHashHex(pub)

	metrics := newMetricsCollector()
	client := NewAgentClient(keystore, key, config.ServerURL, instance)
	client.SetPublicKeyHash(pubHash)

	// Handle a pending uninstall before doing anything else.
	if handleUninstallMarker(instance, dir, keyName, keystore, client) {
		return
	}

	defer func() {
		if r := recover(); r != nil {
			log.Printf("PANIC RECOVERED: %v", r)
			reportAgentPanic(client, r)
		}
	}()

	log.Println("Agent starting...")

	// First install: register the public key using the one-time provision token,
	// then strip the token so the persistent config contains no secret.
	if config.ProvisionToken != "" {
		log.Println("Registering with server...")
		registerPayload := &RegisterRequest{
			Token:           config.ProvisionToken,
			InstallationID:  instance,
			PublicKey:       publicKeyBase64(pub),
			PublicKeyHash:   pubHash,
			AgentVersion:    config.AgentVersion,
			Hostname:        metrics.GetHostname(),
			OperatingSystem: metrics.GetOS(),
			Architecture:    metrics.GetArch(),
			Cpu:             metrics.GetCPUSpec(),
			Memory:          metrics.GetMemorySpec(),
			Disk:            metrics.GetDiskSpec(),
			Capabilities:    []string{"metrics.cpu", "metrics.memory", "metrics.disk", "metrics.network", "metrics.processes", "ports.scan"},
		}
		if _, err := client.register(registerPayload); err != nil {
			log.Printf("Registration failed: %v", err)
			// Not fatal — the agent may already be registered (stale token).
			// Proceed to challenge-response; the backend will reject us if not.
		} else {
			log.Println("Registered successfully.")
			config.ProvisionToken = ""
			if err := writeConfig(configPath, config); err != nil {
				log.Printf("Warning: failed to persist config: %v", err)
			}
		}
	}

	// Authenticate with the backend using the private key.
	sess, err := client.ensureSession()
	if err != nil {
		log.Printf("Authentication failed: %v", err)
		return
	}
	log.Println("Authenticated with server.")

	// Rebuild the per-server runtime config from the auth response. The agent
	// monitors one or more servers, each with its own filter, all held in
	// memory (the backend remains the source of truth).
	runtime := NewAgentRuntime(sess)
	log.Printf("Monitoring %d server(s).", len(runtime.ServerUUIDs()))

	// A successful auth also proves registration — drop any stale provision token.
	if config.ProvisionToken != "" {
		config.ProvisionToken = ""
		_ = writeConfig(configPath, config)
	}

	heartbeatInterval := sess.HeartbeatInterval
	if heartbeatInterval <= 0 {
		heartbeatInterval = 5
	}

	log.Printf("Starting heartbeat loop (interval: %ds)...", heartbeatInterval)

	ticker := time.NewTicker(time.Duration(heartbeatInterval) * time.Second)
	defer ticker.Stop()

	// Run once initially to register the first heartbeat
	sendHeartbeatStep(config, configPath, client, metrics, runtime, &heartbeatInterval)

	// Start the WebSocket control channel goroutine
	go connectControlChannel(client, runtime, &heartbeatInterval, stopChan)

	for {
		select {
		case <-stopChan:
			// Service is being stopped. If this is an uninstall, the marker is
			// already pending and this is the last chance to revoke + delete
			// the identity key under the service account.
			handleUninstallMarker(instance, dir, keyName, keystore, client)
			return
		case <-ticker.C:
			// A marker may appear mid-run (admin starts uninstall while the
			// agent is healthy). Handle it, then exit so the service stops.
			if handleUninstallMarker(instance, dir, keyName, keystore, client) {
				return
			}
			sendHeartbeatStep(config, configPath, client, metrics, runtime, &heartbeatInterval)
			ticker.Reset(time.Duration(heartbeatInterval) * time.Second)
		}
	}
}

// lastSentAvailable* hold the identity signature of the discoverable set last
// reported to the backend. The available set is agent-wide (not per-server), so
// a single package-level snapshot is correct. sendHeartbeatStep is the only
// writer and runs on the heartbeat goroutine, so no lock is needed.
var (
	lastSentProcesses []string
	lastSentPorts     []int
)

func sendHeartbeatStep(config *BootstrapConfig, configPath string, client *AgentClient, metrics *metricsCollector, runtime *AgentRuntime, heartbeatInterval *int) {
	// Collect processes and ports once per cycle, not per server: the process
	// collector samples over a controlled interval (~1s), so per-server
	// collection would multiply that latency. Each server's DB filter is
	// applied separately below.
	allowedProcesses := runtime.AllowedProcessNames()
	processes := metrics.GetProcesses(allowedProcesses)
	processes = groupProcesses(processes)
	openPorts := metrics.GetOpenDatabasePorts()

	// Only include the discoverable set in the heartbeat when its identity
	// actually changed since the last send. The backend keeps the previous
	// snapshot until then.
	procSig := processSetSignature(processes)
	portSig := portSetSignature(openPorts)
	availableChanged := !slices.Equal(procSig, lastSentProcesses) || !slices.Equal(portSig, lastSentPorts)
	if availableChanged {
		lastSentProcesses = procSig
		lastSentPorts = portSig
	}

	for _, serverUUID := range runtime.ServerUUIDs() {
		if !runtime.HasServer(serverUUID) {
			continue
		}

		payload := &HeartbeatRequest{
			ServerUUID:           serverUUID,
			AgentVersion:         config.AgentVersion,
			ConfigurationVersion: config.confVersion,
			Timestamp:            time.Now().Unix(),
			Hostname:             metrics.GetHostname(),
			Cpu:                  metrics.GetCPUUsage(),
			Memory:               metrics.GetMemoryUsage(),
			Disk:                 metrics.GetDiskUsage(),
			Uptime:               metrics.GetUptime(),
			Network:              metrics.GetNetworkStats(),
			Processes:            runtime.FilterProcesses(serverUUID, processes),
			OpenDbPorts:          runtime.FilterPorts(serverUUID, openPorts),
			AgentConfig: &AgentConfigReport{
				HeartbeatInterval: *heartbeatInterval,
				AgentVersion:      config.AgentVersion,
			},
		}
		// The noise-filtered discovered set, sent only when it changes, is what
		// the backend shows in the monitoring filter so new/unmonitored
		// processes and ports can be checked on.
		if availableChanged {
			payload.AvailableProcesses = processes
			payload.AvailablePorts = openPorts
		}

		response, err := client.sendHeartbeat(payload)
		if err != nil {
			// A decommissioned / reassigned server must stop being monitored,
			// not flap. Remove it from the runtime until it is assigned again.
			var hse *httpStatusError
			if errors.As(err, &hse) && (hse.Status == 403 || hse.Status == 404 || hse.Status == 410) {
				log.Printf("Server %s rejected by backend (%d) — removing from monitored set.", serverUUID, hse.Status)
				runtime.Remove(serverUUID)
			} else {
				log.Printf("Heartbeat failed for %s: %v", serverUUID, err)
			}
			continue
		}

		// Per-server filters are NOT refreshed from the heartbeat response —
		// the backend no longer returns them there. They arrive on auth/startup
		// and via the WS control channel (config.update), which re-syncs from a
		// fresh session on every reconnect.

		if response.HeartbeatInterval > 0 && *heartbeatInterval != response.HeartbeatInterval {
			*heartbeatInterval = response.HeartbeatInterval
			log.Printf("Heartbeat interval updated to %ds", *heartbeatInterval)
		}

		if v, ok := response.Configuration["version"].(float64); ok {
			config.confVersion = int(v)
			log.Printf("Configuration updated to version %d", config.confVersion)
		}

		if response.PendingUpdate != nil {
			log.Printf("Received agent update notification to version %s", response.PendingUpdate.Version)

			if response.PendingUpdate.HeartbeatInterval > 0 {
				*heartbeatInterval = response.PendingUpdate.HeartbeatInterval
			}

			config.AgentVersion = response.PendingUpdate.Version
			_ = writeConfig(configPath, config)

			if response.PendingUpdate.BinaryURL != "" {
				log.Printf("Updating agent binary from %s...", response.PendingUpdate.BinaryURL)
				if err := updateBinary(response.PendingUpdate.BinaryURL); err != nil {
					log.Printf("Binary update failed: %v", err)
				} else {
					log.Println("Binary updated successfully! Exiting to allow restart.")
					restartAgent()
					os.Exit(0)
				}
			}
		}

		if len(response.PendingCommands) > 0 {
			var completed []CommandResult
			for _, cmd := range response.PendingCommands {
				log.Printf("Executing command: %s (id: %d)", cmd.Type, cmd.Id)
				result := executeCommand(cmd)
				completed = append(completed, result)
			}
			if len(completed) > 0 {
				ackPayload := &HeartbeatRequest{
					ServerUUID:           serverUUID,
					ConfigurationVersion: config.confVersion,
					Timestamp:            time.Now().Unix(),
					Hostname:             metrics.GetHostname(),
					CompletedCommands:    completed,
				}
				client.sendHeartbeat(ackPayload)
			}
		}
	}
}
