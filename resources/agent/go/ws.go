package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"nhooyr.io/websocket"
)

// Pusher protocol event names
const (
	pusherSubscribe  = "pusher:subscribe"
	pusherPing       = "pusher:ping"
	pusherPong       = "pusher:pong"
	pusherConnected  = "pusher:connection_established"
	pusherSubscribed = "pusher:subscription_succeeded"
	pusherError      = "pusher:error"
)

// pusherMsg is the envelope for all Pusher-protocol WebSocket frames.
type pusherMsg struct {
	Event   string `json:"event"`
	Channel string `json:"channel,omitempty"`
	Data    string `json:"data,omitempty"` // Pusher protocol: data is always a JSON-encoded STRING
}

// configUpdatePayload is the payload delivered on config.update events.
type configUpdatePayload struct {
	Type              string `json:"type"`
	HeartbeatInterval int    `json:"heartbeat_interval"`
	Version           string `json:"version"`
	BinaryURL         string `json:"binary_url"`
}

// connectControlChannel maintains a persistent WebSocket connection to Reverb.
// It runs as a goroutine alongside the heartbeat ticker.
func connectControlChannel(config *BootstrapConfig, identityToken string, heartbeatInterval *int, stop <-chan struct{}) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "[WS] PANIC RECOVERED in control channel: %v\n", r)
			reportAgentPanic(config, identityToken, r)
		}
	}()

	if config.ReverbHost == "" || config.ReverbAppKey == "" {
		fmt.Println("[WS] Reverb config not available — control channel disabled.")
		return
	}

	backoff := 2 * time.Second
	const maxBackoff = 60 * time.Second

	for {
		select {
		case <-stop:
			return
		default:
		}

		err := runWsSession(config, identityToken, heartbeatInterval, stop)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[WS] Session ended with error: %v — retrying in %s\n", err, backoff)
		} else {
			// Clean stop
			return
		}

		select {
		case <-stop:
			return
		case <-time.After(backoff):
		}

		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

// runWsSession opens one WebSocket session and handles the full Pusher handshake:
//  1. Connect → receive pusher:connection_established (get real socket_id)
//  2. Call HTTP auth endpoint with real socket_id → get signed auth token
//  3. Send pusher:subscribe with auth token
//  4. Listen for events; send pusher:ping every 30s
func runWsSession(config *BootstrapConfig, identityToken string, heartbeatInterval *int, stop <-chan struct{}) error {
	scheme := "ws"
	if config.ReverbScheme == "https" {
		scheme = "wss"
	}

	wsURL := fmt.Sprintf("%s://%s:%d/app/%s?protocol=7&client=go-agent&version=1.0",
		scheme, config.ReverbHost, config.ReverbPort, config.ReverbAppKey)

	fmt.Printf("[WS] Connecting to %s\n", wsURL)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Cancel our ctx when stop is signalled
	go func() {
		select {
		case <-stop:
			cancel()
		case <-ctx.Done():
		}
	}()

	conn, _, err := websocket.Dial(ctx, wsURL, &websocket.DialOptions{
		HTTPHeader: http.Header{},
	})
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer conn.CloseNow()

	// --- Step 1: Wait for pusher:connection_established to get the real socket_id ---
	socketID, err := waitForSocketID(ctx, conn)
	if err != nil {
		return fmt.Errorf("connection_established: %w", err)
	}
	fmt.Printf("[WS] Got socket_id: %s\n", socketID)

	// --- Step 2: Authenticate the private channel using the real socket_id ---
	channelName := "private-agent." + config.ServerUUID
	authToken, err := requestChannelAuth(config, identityToken, channelName, socketID)
	if err != nil {
		return fmt.Errorf("channel auth: %w", err)
	}

	// --- Step 3: Subscribe to the private channel ---
	if err := subscribeToPusherChannel(ctx, conn, channelName, authToken); err != nil {
		return fmt.Errorf("subscribe: %w", err)
	}

	// --- Step 4: Read loop ---
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	pingMsg := pusherMsg{Event: pusherPing}
	pingJSON, _ := json.Marshal(pingMsg)

	msgCh := make(chan pusherMsg, 8)
	errCh := make(chan error, 1)

	// Read goroutine — blocks on conn.Read without a timeout
	go func() {
		for {
			_, raw, err := conn.Read(ctx)
			if err != nil {
				errCh <- err
				return
			}
			var msg pusherMsg
			if jsonErr := json.Unmarshal(raw, &msg); jsonErr != nil {
				fmt.Fprintf(os.Stderr, "[WS] Parse error: %v — raw: %s\n", jsonErr, string(raw))
				continue
			}
			msgCh <- msg
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return nil

		case err := <-errCh:
			if ctx.Err() != nil {
				return nil // clean stop
			}
			return fmt.Errorf("read: %w", err)

		case <-pingTicker.C:
			if err := conn.Write(ctx, websocket.MessageText, pingJSON); err != nil {
				return fmt.Errorf("ping write: %w", err)
			}

		case msg := <-msgCh:
			handlePusherEvent(msg, config, identityToken, heartbeatInterval)
		}
	}
}

// waitForSocketID reads messages until pusher:connection_established is received,
// then extracts and returns the socket_id.
func waitForSocketID(ctx context.Context, conn *websocket.Conn) (string, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	for {
		_, raw, err := conn.Read(timeoutCtx)
		if err != nil {
			return "", fmt.Errorf("waiting for connection_established: %w", err)
		}

		var msg pusherMsg
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}

		if msg.Event == pusherConnected {
			// Data is a JSON string containing {"socket_id":"...", "activity_timeout":...}
			var connData struct {
				SocketID string `json:"socket_id"`
			}
			if err := json.Unmarshal([]byte(msg.Data), &connData); err != nil {
				return "", fmt.Errorf("parse connection_established data: %w", err)
			}
			if connData.SocketID == "" {
				return "", fmt.Errorf("socket_id missing in connection_established")
			}
			return connData.SocketID, nil
		}
	}
}

// subscribeToPusherChannel sends a pusher:subscribe message.
// In Pusher protocol the data field must be a JSON-encoded STRING.
func subscribeToPusherChannel(ctx context.Context, conn *websocket.Conn, channelName, authToken string) error {
	subDataObj := map[string]string{"channel": channelName, "auth": authToken}
	subDataJSON, _ := json.Marshal(subDataObj)

	subMsg := pusherMsg{
		Event: pusherSubscribe,
		Data:  string(subDataJSON), // data is a string in Pusher protocol
	}
	subMsgJSON, _ := json.Marshal(subMsg)

	return conn.Write(ctx, websocket.MessageText, subMsgJSON)
}

// handlePusherEvent dispatches a parsed Pusher message.
func handlePusherEvent(msg pusherMsg, config *BootstrapConfig, identityToken string, heartbeatInterval *int) {
	switch msg.Event {
	case pusherSubscribed:
		fmt.Printf("[WS] Subscribed to channel: %s\n", msg.Channel)

	case pusherPong:
		// Server pong — no action needed

	case pusherError:
		fmt.Fprintf(os.Stderr, "[WS] Pusher error: %s\n", msg.Data)

	case "config.update":
		var payload configUpdatePayload
		if err := json.Unmarshal([]byte(msg.Data), &payload); err != nil {
			fmt.Fprintf(os.Stderr, "[WS] Failed to decode event payload: %v\n", err)
			return
		}
		switch payload.Type {
		case "binary_update":
			handleBinaryUpdate(payload, config, identityToken, heartbeatInterval)
		default:
			handleConfigUpdate(payload, config, identityToken, heartbeatInterval)
		}

	default:
		fmt.Printf("[WS] Event: %s\n", msg.Event)
	}
}

// handleConfigUpdate processes a config_update pushed from the server.
// Reverb's broadcastWith() wraps the payload as a JSON-encoded string in the data field.
func handleConfigUpdate(payload configUpdatePayload, config *BootstrapConfig, identityToken string, heartbeatInterval *int) {
	fmt.Printf("[WS] Config update received: heartbeat_interval=%d\n", payload.HeartbeatInterval)

	if payload.HeartbeatInterval > 0 {
		*heartbeatInterval = payload.HeartbeatInterval
		config.HeartbeatInterval = payload.HeartbeatInterval
	}

	// Persist to bootstrap.json
	appDir := filepath.Dir(os.Args[0])
	if execPath, err := os.Executable(); err == nil {
		appDir = filepath.Dir(execPath)
	}
	bootstrapPath := filepath.Join(appDir, "bootstrap.json")
	if err := writeConfig(bootstrapPath, config); err != nil {
		fmt.Fprintf(os.Stderr, "[WS] Failed to persist updated config: %v\n", err)
	}

	// Notify backend that update was applied
	postConfigUpdateAck(config, identityToken, payload.HeartbeatInterval)
}

// handleBinaryUpdate downloads a new agent binary and restarts the process.
func handleBinaryUpdate(payload configUpdatePayload, config *BootstrapConfig, identityToken string, heartbeatInterval *int) {
	if payload.BinaryURL == "" {
		fmt.Fprintln(os.Stderr, "[WS] binary_update received but no binary_url provided — skipping.")
		return
	}

	fmt.Printf("[WS] Binary update received: version=%s url=%s\n", payload.Version, payload.BinaryURL)

	// First apply any config changes
	if payload.HeartbeatInterval > 0 {
		*heartbeatInterval = payload.HeartbeatInterval
		config.HeartbeatInterval = payload.HeartbeatInterval
	}
	if payload.Version != "" {
		config.AgentVersion = payload.Version
	}

	// Persist updated config before replacing binary
	appDir := filepath.Dir(os.Args[0])
	if execPath, err := os.Executable(); err == nil {
		appDir = filepath.Dir(execPath)
	}
	bootstrapPath := filepath.Join(appDir, "bootstrap.json")
	if err := writeConfig(bootstrapPath, config); err != nil {
		fmt.Fprintf(os.Stderr, "[WS] Failed to persist config before update: %v\n", err)
	}

	// Download and replace the binary
	fmt.Printf("[WS] Downloading new binary from %s...\n", payload.BinaryURL)
	postConfigUpdatingLog(config, identityToken, payload.Version)
	if err := updateBinary(payload.BinaryURL); err != nil {
		fmt.Fprintf(os.Stderr, "[WS] Binary update failed: %v\n", err)
		return
	}

	fmt.Println("[WS] Binary updated successfully — exiting to allow restart...")
	restartAgent()
	os.Exit(0)
}

// postConfigUpdatingLog POSTs to /api/v1/agent/{serverUUID}/updating to log that the update process has begun.
func postConfigUpdatingLog(config *BootstrapConfig, identityToken string, newVersion string) {
	if config.UpdateURL == "" {
		return
	}
	// Derive updating URL from update URL
	updatingURL := extractBaseURL(config.UpdateURL) + "/api/v1/agent/" + config.ServerUUID + "/updating"

	body, _ := json.Marshal(map[string]interface{}{
		"version": newVersion,
	})

	req, err := http.NewRequest(http.MethodPost, updatingURL, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+identityToken)

	resp, err := http.DefaultClient.Do(req)
	if err == nil {
		resp.Body.Close()
	}
}

// postConfigUpdateAck POSTs to /api/v1/agent/{serverUUID}/update to confirm the update was applied.
func postConfigUpdateAck(config *BootstrapConfig, identityToken string, heartbeatInterval int) {
	if config.UpdateURL == "" {
		return
	}

	body, _ := json.Marshal(map[string]interface{}{
		"agent_version":      config.AgentVersion,
		"heartbeat_interval": heartbeatInterval,
	})

	req, err := http.NewRequest(http.MethodPost, config.UpdateURL, bytes.NewReader(body))
	if err != nil {
		fmt.Fprintf(os.Stderr, "[WS] Failed to create update ack: %v\n", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+identityToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[WS] Update ack failed: %v\n", err)
		return
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body)

	fmt.Printf("[WS] Update ack sent, status: %d\n", resp.StatusCode)
}

// requestChannelAuth calls the agent-specific broadcasting auth endpoint.
// The real socket_id from Reverb's connection_established message must be passed.
func requestChannelAuth(config *BootstrapConfig, identityToken, channelName, socketID string) (string, error) {
	apiHost := extractBaseURL(config.ApiURL)
	authURL := apiHost + "/api/broadcasting/auth/agent"

	bodyData := fmt.Sprintf("socket_id=%s&channel_name=%s", socketID, channelName)
	req, err := http.NewRequest(http.MethodPost, authURL, bytes.NewBufferString(bodyData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+identityToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("channel auth request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("channel auth HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var authResp struct {
		Auth string `json:"auth"`
	}
	if err := json.Unmarshal(respBody, &authResp); err != nil {
		return "", fmt.Errorf("parse auth response: %w", err)
	}
	return authResp.Auth, nil
}

// extractBaseURL strips the path from a full URL, returning scheme://host[:port].
func extractBaseURL(rawURL string) string {
	for _, pfx := range []string{"https://", "http://"} {
		if len(rawURL) >= len(pfx) && rawURL[:len(pfx)] == pfx {
			rest := rawURL[len(pfx):]
			for i, c := range rest {
				if c == '/' {
					return pfx + rest[:i]
				}
			}
			return pfx + rest
		}
	}
	return rawURL
}
