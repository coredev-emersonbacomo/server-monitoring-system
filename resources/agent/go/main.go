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
	"strings"
	"sync/atomic"
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
		case "-detach", "--detach":
			instance := parseInstance(os.Args)
			serverUuid := flagValue(os.Args, "-server")
			if serverUuid == "" {
				serverUuid = flagValue(os.Args, "--server")
			}
			if instance == "" {
				fatalUsage("-detach requires -instance <uuid> -server <server-uuid>")
			}
			if serverUuid == "" {
				fatalUsage("-detach requires -server <server-uuid>")
			}
			if err := detachWithMarker(instance, serverUuid); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to detach: %v\n", err)
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

// serviceNameFor is the single stable Windows service name for this agent
// installation. Under the one-agent-per-computer model there is exactly one
// service per host ("MonitorAgent"), so the installation UUID is NOT part of
// the service name — it is pinned via the service's "-instance <uuid>" argument
// instead. The parameter is retained for call-site compatibility.
func serviceNameFor(instance string) string {
	return "MonitorAgent"
}

const uninstallFlagFile = "uninstall.flag"
const detachFlagFile = "detach.flag"

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
	// animate ellipsis while waiting so a 90s stop doesn't look hung — \r cycle 1..3 dots.
	// Only animate when stdout is a real console; when piped (e.g. PowerShell Start-Job captures stdout)
	// PowerShell's own Write-Host animation takes over — otherwise the \r gets buffered and looks frozen.
	isTTY := false
	if fi, err := os.Stdout.Stat(); err == nil {
		isTTY = (fi.Mode() & os.ModeCharDevice) != 0
	}
	var stopDone chan struct{}
	if isTTY {
		fmt.Print("Uninstall marker written; stopping service for cleanup")
		stopDone = make(chan struct{})
		go animateEllipsis("Uninstall marker written; stopping service for cleanup", stopDone)
	} else {
		fmt.Println("Uninstall marker written; stopping service for cleanup...")
	}
	stopErr := stopServiceAndWait(serviceName, 90*time.Second)
	if isTTY {
		close(stopDone)
		time.Sleep(80 * time.Millisecond)
		fmt.Printf("\rUninstall marker written; stopping service for cleanup...   \n")
	}
	if stopErr != nil {
		return fmt.Errorf("service did not stop cleanly (identity key may remain): %w", stopErr)
	}

	if data, err := os.ReadFile(marker); err == nil && string(data) == "done" {
		fmt.Println("Agent revoked and identity key deleted.")
	} else {
		fmt.Println("Warning: service did not confirm cleanup; the identity key may remain.")
	}

	if err := deleteService(serviceName); err != nil {
		return fmt.Errorf("failed to delete service: %w", err)
	}
	// The stopped service may still hold agent.log open for a moment after the
	// SCM reports Stopped, so retry the removal to avoid a spurious
	// "file in use" error.
	if err := removeAllWithRetry(dir, 20, 250*time.Millisecond); err != nil {
		return fmt.Errorf("failed to remove instance directory: %w", err)
	}
	fmt.Println("Uninstall complete.")
	return nil
}

// animateEllipsis prints msg with a cycling 1..3 dot ellipsis on the same line
// until done is closed. Keeps long waits from looking stuck. Only the "..."
// animates and the cursor follows the last visible dot (not the padded end).
func animateEllipsis(msg string, done <-chan struct{}) {
	for i := 0; ; i++ {
		select {
		case <-done:
			return
		default:
		}
		dots := strings.Repeat(".", i%3+1)
		pad := 3 - len(dots)
		spaces := strings.Repeat(" ", pad)
		backs := strings.Repeat("\b", pad)
		fmt.Printf("\r%s%s%s%s", msg, dots, spaces, backs)
		_ = os.Stdout.Sync()
		time.Sleep(400 * time.Millisecond)
	}
}

// removeAllWithRetry removes a directory tree, retrying for transient errors
// such as a file still held by a just-exited process on Windows.
func removeAllWithRetry(path string, attempts int, delay time.Duration) error {
	var err error
	for i := 0; i < attempts; i++ {
		if err = os.RemoveAll(path); err == nil {
			return nil
		}
		time.Sleep(delay)
	}
	return err
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
		// revoke must not block SCM Stop indefinitely – 8s best-effort, then continue to key deletion.
		done := make(chan error, 1)
		go func() { done <- client.revokeInstallation() }()
		select {
		case err := <-done:
			if err != nil {
				log.Printf("Warning: revocation request failed: %v", err)
			}
		case <-time.After(8 * time.Second):
			log.Println("Warning: revocation timed out, continuing to delete identity key")
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

func detachWithMarker(instance, serverUuid string) error {
	// The value is written to a marker file and concatenated into a request
	// URL — reject path separators rather than breaking routing.
	serverUuid = strings.TrimSpace(serverUuid)
	if serverUuid == "" || strings.ContainsAny(serverUuid, "/\\") {
		return fmt.Errorf("invalid server uuid %q", serverUuid)
	}
	dir := instanceDir(instance)
	marker := filepath.Join(dir, detachFlagFile)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to access instance directory: %w", err)
	}
	if err := os.WriteFile(marker, []byte(serverUuid), 0644); err != nil {
		return fmt.Errorf("failed to write detach marker: %w", err)
	}
	isDetachTTY := false
	if fi, err := os.Stdout.Stat(); err == nil {
		isDetachTTY = (fi.Mode() & os.ModeCharDevice) != 0
	}
	var sigDone chan struct{}
	if isDetachTTY {
		fmt.Printf("Detach marker written for server %s; signalling running agent", serverUuid)
		sigDone = make(chan struct{})
		go animateEllipsis(fmt.Sprintf("Detach marker written for server %s; signalling running agent", serverUuid), sigDone)
	} else {
		fmt.Printf("Detach marker written for server %s; signalling running agent...\n", serverUuid)
	}
	// Try an immediate POST only when THIS process can reach the agent's
	// identity key. The key lives in the installed service's per-user key store
	// (LocalSystem on Windows), so a human running this script from their own
	// account cannot open it — GetOrCreateKey would mint a brand-new key and
	// signature verification would fail (HTTP 403), with the single-use
	// challenge then returning 401 on retry. In that common case the marker is
	// enough: the running service picks it up on its next tick. (Like
	// handleDetachMarker, which always runs in the service's own context.)
	immediateDone := false
	if keystore := newKeyStore(); keystore != nil {
		if keyName := keyIDForInstallation(instance); keyName != "" {
			if ok, _ := keystore.HasKey(context.Background(), keyName); ok {
				if key, err := keystore.GetOrCreateKey(context.Background(), keyName); err == nil {
					if pub, err := keystore.PublicKey(context.Background(), key); err == nil {
						if cfg, _, err := loadConfig(dir); err == nil {
							client := NewAgentClient(keystore, key, cfg.ServerURL, instance)
							client.SetPublicKeyHash(publicKeyHashHex(pub))
							if err := client.detachServer(serverUuid); err != nil {
								if isDetachTTY {
									close(sigDone)
									time.Sleep(50 * time.Millisecond)
									fmt.Printf("\rDetach marker written for server %s; signalling running agent...   \n", serverUuid)
								}
								fmt.Printf("Warning: immediate detach failed (will retry on next heartbeat): %v\n", err)
							} else {
								if isDetachTTY {
									close(sigDone)
									time.Sleep(50 * time.Millisecond)
									fmt.Printf("\rDetach marker written for server %s; signalling running agent...   \n", serverUuid)
								}
								fmt.Println("Server detached immediately.")
								_ = os.WriteFile(marker, []byte("done"), 0644)
								go func() { time.Sleep(2 * time.Second); os.Remove(marker) }()
								return nil
							}
							immediateDone = true
						}
					}
				}
			}
		}
	}
	if !immediateDone && isDetachTTY {
		close(sigDone)
		time.Sleep(50 * time.Millisecond)
		fmt.Printf("\rDetach marker written for server %s; signalling running agent...   \n", serverUuid)
	}
	fmt.Println("Detach signal queued — the running agent will detach on its next heartbeat.")
	return nil
}

func handleDetachMarker(dir string, client *AgentClient) bool {
	marker := filepath.Join(dir, detachFlagFile)
	data, err := os.ReadFile(marker)
	if err != nil {
		return false
	}
	serverUuid := strings.TrimSpace(string(data))
	if serverUuid == "" || serverUuid == "pending" {
		return false
	}
	if serverUuid == "done" {
		// Already handled, clean up
		os.Remove(marker)
		return false
	}
	log.Printf("Detach marker detected for server %s — detaching from agent.", serverUuid)
	if client != nil {
		if err := client.detachServer(serverUuid); err != nil {
			log.Printf("Warning: detach request failed for %s: %v", serverUuid, err)
			// Leave the uuid in place for retry on the next loop (the marker
			// is only rewritten to "done" on success — never to "pending",
			// which means "ignore").
			return false
		}
		log.Printf("Server %s detached successfully.", serverUuid)
	}
	if err := os.WriteFile(marker, []byte("done"), 0644); err != nil {
		log.Printf("Warning: failed to record detach result: %v", err)
	}
	// Clean up the marker after a short delay so the uninstaller can confirm
	go func() {
		time.Sleep(2 * time.Second)
		os.Remove(marker)
	}()
	return false // do not exit — agent stays for other servers
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
	// log package writes timestamped lines to the same file. Rotated at open
	// so a chatty outage cannot fill the disk: 3 × 10 MB generations.
	rotateAgentLog(filepath.Join(dir, "agent.log"))
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

	// Handle a pending uninstall/detach before doing anything else.
	if handleUninstallMarker(instance, dir, keyName, keystore, client) {
		return
	}
	handleDetachMarker(dir, client)

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

	// Shared with the WS goroutine (config/binary updates change it) — atomic
	// so heartbeat and WS goroutines never race on it.
	var heartbeatInterval atomic.Int64
	heartbeatInterval.Store(int64(sess.HeartbeatInterval))
	if heartbeatInterval.Load() <= 0 {
		heartbeatInterval.Store(5)
	}

	log.Printf("Starting heartbeat loop (interval: %ds)...", heartbeatInterval.Load())

	ticker := time.NewTicker(time.Duration(heartbeatInterval.Load()) * time.Second)
	defer ticker.Stop()

	// Run once initially to register the first heartbeat. Drain any tick that
	// expired during that blocking collection so we don't double-fire.
	sendHeartbeatStep(config, configPath, client, metrics, runtime, &heartbeatInterval)
	select {
	case <-ticker.C:
	default:
	}

	// Start the WebSocket control channel goroutine
	go connectControlChannel(client, runtime, &heartbeatInterval, stopChan)

	// --- Audit: file activity + agent lifecycle -------------------------------
	// Durable queue + OS watcher over the backend-delivered watched paths. Events
	// are enqueued to disk and drained to the backend on a ticker so a crash
	// never loses an audited event. Agent lifecycle events are emitted alongside.
	queue, qerr := NewEventQueue(instance)
	if qerr != nil {
		log.Printf("[AUDIT] queue init failed (audit disabled): %v", qerr)
	} else {
		watcher := NewFileWatcher(runtime)
		watcher.Start()

		// Enqueue every correlated event to the durable queue.
		go func() {
			for {
				select {
				case ev := <-watcher.Events():
					enqueueLog(queue, ev)
				case <-stopChan:
					return
				}
			}
		}()

		// Drain the queue to the backend on a fixed cadence.
		go func() {
			drainTicker := time.NewTicker(5 * time.Second)
			defer drainTicker.Stop()
			for {
				select {
				case <-drainTicker.C:
					if err := queue.Drain(client); err != nil {
						log.Printf("[AUDIT] drain failed: %v", err)
					}
				case <-stopChan:
					return
				}
			}
		}()

		// Emit an agent "started" lifecycle event per monitored server.
		for _, su := range runtime.ServerUUIDs() {
			enqueueLog(queue, LifecycleEvent(su, "started"))
		}

		defer func() {
			enqueueLog(queue, LifecycleEvent("", "stopping"))
			// Flush whatever the watcher still has buffered, then stop it.
			watcher.Stop()
			for {
				select {
				case ev := <-watcher.Events():
					enqueueLog(queue, ev)
				default:
					enqueueLog(queue, LifecycleEvent("", "stopped"))
					// shutdown drain must not block SCM Stop – best-effort with hard timeout,
					// durable queue file survives so missed events are sent on next start.
					done := make(chan error, 1)
					go func() { done <- queue.Drain(client) }()
					select {
					case <-done:
					case <-time.After(5 * time.Second):
						log.Println("[AUDIT] shutdown drain timed out, leaving events on disk for next start")
					}
					_ = queue.Close()
					return
				}
			}
		}()
	}

	for {
		select {
		case <-stopChan:
			// Service is being stopped. If this is an uninstall, the marker is
			// already pending and this is the last chance to revoke + delete
			// the identity key under the service account.
			handleUninstallMarker(instance, dir, keyName, keystore, client)
			return
		case <-ticker.C:
			// A marker may appear mid-run (admin starts uninstall/detach while the
			// agent is healthy). Handle it, then exit or continue.
			if handleUninstallMarker(instance, dir, keyName, keystore, client) {
				return
			}
			handleDetachMarker(dir, client)
			sendHeartbeatStep(config, configPath, client, metrics, runtime, &heartbeatInterval)
			ticker.Reset(time.Duration(heartbeatInterval.Load()) * time.Second)
		}
	}
}

// lastSentAvailable* hold the identity signature of the discoverable set last
// reported to the backend. The available set is agent-wide (not per-server), so
// a single package-level snapshot is correct. sendHeartbeatStep is the only
// writer and runs on the heartbeat goroutine, so no lock is needed.
var (
	lastSentProcesses  []string
	lastSentPorts      []int
	lastSentInterfaces []string
	// pendingCompleted accumulates command results between ticks. The agent
	// executes commands it received in the previous heartbeat and acks them
	// on the NEXT aggregated heartbeat (a one-tick delay is acceptable).
	pendingCompleted []CommandResult
	// executedCommandIDs dedupes command execution: the backend resends
	// un-acked commands on every heartbeat, so without this a failed tick
	// would re-run non-idempotent shell commands. Bounded to avoid
	// unbounded growth on a long outage (oldest IDs are forgotten first,
	// re-allowing execution rather than leaking memory).
	executedCommandIDs []int
)

// maxPendingCommands bounds the ack buffer and the dedup set.
const maxPendingCommands = 200

func sendHeartbeatStep(config *BootstrapConfig, configPath string, client *AgentClient, metrics *metricsCollector, runtime *AgentRuntime, heartbeatInterval *atomic.Int64) {
	// Collect agent-wide state ONCE per tick — the process collector samples
	// over a controlled interval (~1s), so per-server collection would multiply
	// that latency. Each server's DB filter is applied into its partition below.
	allowedProcesses := runtime.AllowedProcessNames()
	processes := metrics.GetProcesses(allowedProcesses)
	processes = groupProcesses(processes)
	openPorts := metrics.GetOpenDatabasePorts()
	allNetworks := metrics.GetNetworkStats()
	// Available interfaces are non-disconnected ones (state == "up"); they drive the checklist.
	availableNetworks := filterAvailableNetworks(allNetworks)

	// The noise-filtered discoverable set is agent-wide. Only re-send it when
	// its signature changed since the last send; the backend keeps the prior
	// snapshot until then.
	procSig := processSetSignature(processes)
	portSig := portSetSignature(openPorts)
	ifaceSig := interfaceSetSignature(availableNetworks)
	availableChanged := !slices.Equal(procSig, lastSentProcesses) || !slices.Equal(portSig, lastSentPorts) || !slices.Equal(ifaceSig, lastSentInterfaces)

	// Build ONE partition per monitored server, applying that server's filter
	// to the shared collected set. This is the only per-server work.
	// For dedup, top-level dicts hold the union of per-server filtered objects
	// and per-server partitions hold only keys referencing those dicts.
	partitions := make([]ServerPartition, 0, len(runtime.ServerUUIDs()))
	procDict := make(map[string]ProcessInfo)
	portDict := make(map[string]PortInfo)
	netDict := make(map[string]NetworkMetrics)
	for _, uuid := range runtime.ServerUUIDs() {
		if !runtime.HasServer(uuid) {
			continue
		}
		cfg := runtime.config(uuid)
		if cfg == nil {
			continue
		}
		portFilter := sortedIntKeys(cfg.PortFilter)
		if portFilter == nil {
			portFilter = []int{}
		}
		procFilter := sortedStringKeys(cfg.ProcessFilter)
		if procFilter == nil {
			procFilter = []string{}
		}
		networkFilter := sortedStringKeys(cfg.NetworkFilter)
		if networkFilter == nil {
			networkFilter = []string{}
		}
		filtProcs := runtime.FilterProcesses(uuid, processes)
		filtPorts := runtime.FilterPorts(uuid, openPorts)
		filtNets := runtime.FilterNetworks(uuid, allNetworks)
		// Union into top-level dicts
		for _, p := range filtProcs {
			procDict[p.Name] = p
		}
		for _, p := range filtPorts {
			key := fmt.Sprintf("%s:%d", strings.ToLower(p.Protocol), p.Port)
			portDict[key] = p
		}
		for _, n := range filtNets {
			netDict[n.Interface] = n
		}
		// Per-server lists are just keys
		procNames := make([]string, 0, len(filtProcs))
		for _, p := range filtProcs {
			procNames = append(procNames, p.Name)
		}
		portKeys := make([]string, 0, len(filtPorts))
		for _, p := range filtPorts {
			portKeys = append(portKeys, fmt.Sprintf("%s:%d", strings.ToLower(p.Protocol), p.Port))
		}
		netNames := make([]string, 0, len(filtNets))
		for _, n := range filtNets {
			netNames = append(netNames, n.Interface)
		}
		partitions = append(partitions, ServerPartition{
			ServerUUID:    uuid,
			PortFilter:    portFilter,
			ProcessFilter: procFilter,
			NetworkFilter: networkFilter,
			Processes:     procNames,
			OpenDbPorts:   portKeys,
			Network:       netNames,
		})
	}

	payload := &AgentHeartbeatRequest{
		AgentVersion:         config.AgentVersion,
		ConfigurationVersion: config.confVersion,
		Timestamp:            time.Now().Unix(),
		Hostname:             metrics.GetHostname(),
		Cpu:                  metrics.GetCPUUsage(),
		Memory:               metrics.GetMemoryUsage(),
		Disk:                 metrics.GetDiskUsage(),
		Uptime:               metrics.GetUptime(),
		AgentConfig: &AgentConfigReport{
			HeartbeatInterval: int(heartbeatInterval.Load()),
			AgentVersion:      config.AgentVersion,
		},
		ProcessesDict: procDict,
		PortsDict:     portDict,
		NetworksDict:  netDict,
		Servers:       partitions,
	}
	if availableChanged {
		// Available is just details (for filter UI), not live data — heartbeat partitions carry the data
		lightProcs := make([]ProcessInfo, 0, len(processes))
		for _, p := range processes {
			lightProcs = append(lightProcs, ProcessInfo{Name: p.Name, Pids: p.Pids, Pid: p.Pid})
		}
		lightPorts := make([]PortInfo, 0, len(openPorts))
		for _, p := range openPorts {
			lightPorts = append(lightPorts, PortInfo{Port: p.Port, Protocol: p.Protocol, Process: p.Process})
		}
		lightIfaces := make([]NetworkMetrics, 0, len(availableNetworks))
		for _, n := range availableNetworks {
			lightIfaces = append(lightIfaces, NetworkMetrics{Interface: n.Interface, Type: n.Type, State: n.State})
		}
		payload.AvailableProcesses = lightProcs
		payload.AvailablePorts = lightPorts
		payload.AvailableInterfaces = lightIfaces
	}
	if len(pendingCompleted) > 0 {
		payload.CompletedCommands = pendingCompleted
	}

	// Only bother sending if we actually monitor something — unless there
	// are command acks to deliver, which must not be stranded.
	if len(payload.Servers) == 0 && payload.AgentVersion == "" && len(pendingCompleted) == 0 {
		return
	}

	// Bound the send by the tick cadence: a stale payload is dropped so the
	// next tick sends fresh data instead of blocking on it.
	response, err := client.sendAgentHeartbeat(payload, time.Duration(heartbeatInterval.Load())*time.Second)
	if err != nil {
		log.Printf("Aggregated heartbeat failed: %v", err)
		return
	}

	// Send succeeded: drop acked commands and record the sent Available
	// snapshot (a failed send must not consume them).
	pendingCompleted = nil
	if availableChanged {
		lastSentProcesses = procSig
		lastSentPorts = portSig
		lastSentInterfaces = ifaceSig
	}

	// Drop servers the backend no longer wants this agent to monitor.
	for _, uuid := range response.RevokedServerUUIDs {
		log.Printf("Server %s revoked by backend — removing from monitored set.", uuid)
		runtime.Remove(uuid)
	}

	if response.HeartbeatInterval > 0 && int(heartbeatInterval.Load()) != response.HeartbeatInterval {
		heartbeatInterval.Store(int64(response.HeartbeatInterval))
		log.Printf("Heartbeat interval updated to %ds", response.HeartbeatInterval)
	}

	if v, ok := response.Configuration["version"].(float64); ok {
		config.confVersion = int(v)
		log.Printf("Configuration updated to version %d", config.confVersion)
	}

	if response.PendingUpdate != nil {
		log.Printf("Received agent update notification to version %s", response.PendingUpdate.Version)

		if response.PendingUpdate.HeartbeatInterval > 0 {
			heartbeatInterval.Store(int64(response.PendingUpdate.HeartbeatInterval))
		}

		config.AgentVersion = response.PendingUpdate.Version
		_ = writeConfig(configPath, config)

		if response.PendingUpdate.BinaryURL != "" && !skipFailedUpdate(response.PendingUpdate.Version) {
			log.Printf("Updating agent binary from %s...", response.PendingUpdate.BinaryURL)
			if err := updateBinary(response.PendingUpdate.BinaryURL); err != nil {
				log.Printf("Binary update failed: %v", err)
				noteUpdateResult(response.PendingUpdate.Version, err)
			} else {
				noteUpdateResult(response.PendingUpdate.Version, nil)
				log.Println("Binary updated successfully! Exiting to allow restart.")
				restartAgent()
				os.Exit(0)
			}
		}
	}

	// Execute pending commands and ack them on the next aggregated tick.
	// Already-executed IDs are skipped: the backend resends un-acked commands
	// on every heartbeat, and re-running shell commands is not idempotent.
	if len(response.PendingCommands) > 0 {
		for _, cmd := range filterNewCommands(response.PendingCommands) {
			log.Printf("Executing command: %s (id: %d)", cmd.Type, cmd.Id)
			result := executeCommand(cmd)
			pendingCompleted = append(pendingCompleted, result)
			if len(pendingCompleted) > maxPendingCommands {
				pendingCompleted = pendingCompleted[len(pendingCompleted)-maxPendingCommands:]
			}
		}
	}
}

// filterNewCommands drops already-executed command IDs (backend resends
// un-acked commands every heartbeat) and records the new ones, bounded so a
// long outage cannot grow the set without limit. Pure for testability; the
// caller owns the single-goroutine contract.
func filterNewCommands(cmds []AgentCommand) []AgentCommand {
	fresh := cmds[:0]
	for _, cmd := range cmds {
		if slices.Contains(executedCommandIDs, cmd.Id) {
			continue
		}
		fresh = append(fresh, cmd)
		executedCommandIDs = append(executedCommandIDs, cmd.Id)
		if len(executedCommandIDs) > maxPendingCommands {
			executedCommandIDs = executedCommandIDs[len(executedCommandIDs)-maxPendingCommands:]
		}
	}
	return fresh
}
