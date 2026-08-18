package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
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
// All Reverb config and credentials come from the authenticated session, never
// from disk.
func connectControlChannel(client *AgentClient, heartbeatInterval *int, stop <-chan struct{}) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[WS] PANIC RECOVERED in control channel: %v", r)
			reportAgentPanic(client, r)
		}
	}()

	backoff := 2 * time.Second
	const maxBackoff = 60 * time.Second

	for {
		select {
		case <-stop:
			return
		default:
		}

		err := runWsSession(client, heartbeatInterval, stop)
		if err != nil {
			log.Printf("[WS] Session ended with error: %v — retrying in %s", err, backoff)
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
//  1. Connect -> receive pusher:connection_established (get real socket_id)
//  2. Call HTTP auth endpoint with real socket_id -> get signed auth token
//  3. Send pusher:subscribe with auth token
//  4. Listen for events; send pusher:ping every 30s
func runWsSession(client *AgentClient, heartbeatInterval *int, stop <-chan struct{}) error {
	sess, err := client.ensureSession()
	if err != nil {
		return fmt.Errorf("session: %w", err)
	}
	if sess.ReverbHost == "" || sess.ReverbAppKey == "" {
		return fmt.Errorf("reverb config not available")
	}

	scheme := "ws"
	if sess.ReverbScheme == "https" {
		scheme = "wss"
	}

	wsURL := fmt.Sprintf("%s://%s:%d/app/%s?protocol=7&client=go-agent&version=1.0",
		scheme, sess.ReverbHost, sess.ReverbPort, sess.ReverbAppKey)

	log.Printf("[WS] Connecting to %s", wsURL)

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

	conn, _, err := websocket.Dial(ctx, wsURL, &websocket.DialOptions{})
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer conn.CloseNow()

	// --- Step 1: Wait for pusher:connection_established to get the real socket_id ---
	socketID, err := waitForSocketID(ctx, conn)
	if err != nil {
		return fmt.Errorf("connection_established: %w", err)
	}
	log.Printf("[WS] Got socket_id: %s", socketID)

	// --- Step 2: Authenticate the private channel using the real socket_id ---
	channelName := "private-agent." + sess.ServerUUID
	authToken, err := requestChannelAuth(client, channelName, socketID)
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
				log.Printf("[WS] Parse error: %v", jsonErr)
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
			handlePusherEvent(client, msg, heartbeatInterval)
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
func handlePusherEvent(client *AgentClient, msg pusherMsg, heartbeatInterval *int) {
	switch msg.Event {
	case pusherSubscribed:
		log.Printf("[WS] Subscribed to channel: %s", msg.Channel)

	case pusherPong:
		// Server pong — no action needed

	case pusherError:
		log.Printf("[WS] Pusher error: %s", msg.Data)

	case "config.update":
		var payload configUpdatePayload
		if err := json.Unmarshal([]byte(msg.Data), &payload); err != nil {
			log.Printf("[WS] Failed to decode event payload: %v", err)
			return
		}
		switch payload.Type {
		case "binary_update":
			handleBinaryUpdate(client, payload, heartbeatInterval)
		default:
			handleConfigUpdate(client, payload, heartbeatInterval)
		}

	default:
		log.Printf("[WS] Event: %s", msg.Event)
	}
}

// handleConfigUpdate applies a config.update pushed from the server. The
// effective heartbeat interval is persisted via the next heartbeat's
// agent_config payload.
func handleConfigUpdate(client *AgentClient, payload configUpdatePayload, heartbeatInterval *int) {
	log.Printf("[WS] Config update received: heartbeat_interval=%d", payload.HeartbeatInterval)

	if payload.HeartbeatInterval > 0 {
		*heartbeatInterval = payload.HeartbeatInterval
	}
}

// handleBinaryUpdate downloads a new agent binary and restarts the process.
// The heartbeat's pending_update is the fallback trigger; the WS broadcast
// makes updates immediate after e.g. a compileagent run.
func handleBinaryUpdate(client *AgentClient, payload configUpdatePayload, heartbeatInterval *int) {
	if payload.BinaryURL == "" {
		log.Println("[WS] binary_update received but no binary_url provided — skipping.")
		return
	}

	log.Printf("[WS] Binary update received: version=%s url=%s", payload.Version, payload.BinaryURL)

	if payload.HeartbeatInterval > 0 {
		*heartbeatInterval = payload.HeartbeatInterval
	}

	log.Printf("[WS] Downloading new binary from %s...", payload.BinaryURL)
	if err := updateBinary(payload.BinaryURL); err != nil {
		log.Printf("[WS] Binary update failed: %v", err)
		return
	}

	log.Println("[WS] Binary updated successfully — exiting to allow restart...")
	restartAgent()
	os.Exit(0)
}

// requestChannelAuth calls the agent-specific broadcasting auth endpoint using
// the short-lived session token. The real socket_id from Reverb's
// connection_established message must be passed.
func requestChannelAuth(client *AgentClient, channelName, socketID string) (string, error) {
	authURL := client.apiURL("/api/broadcasting/auth/agent")
	bodyData := fmt.Sprintf("socket_id=%s&channel_name=%s", socketID, channelName)

	respBody, status, err := client.postAuthenticated(authURL, bodyData)
	if err != nil {
		return "", fmt.Errorf("channel auth request: %w", err)
	}

	if status != 200 {
		return "", fmt.Errorf("channel auth HTTP %d: %s", status, string(respBody))
	}

	var authResp struct {
		Auth string `json:"auth"`
	}
	if err := json.Unmarshal(respBody, &authResp); err != nil {
		return "", fmt.Errorf("parse auth response: %w", err)
	}
	return authResp.Auth, nil
}