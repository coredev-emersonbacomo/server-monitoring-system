package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// httpStatusError carries a non-2xx HTTP response so callers can react to
// specific codes (e.g. 401 → refresh the session).
type httpStatusError struct {
	Status int
	Body   []byte
}

func (e *httpStatusError) Error() string {
	return fmt.Sprintf("HTTP %d", e.Status)
}

type AgentClient struct {
	http             *http.Client
	baseURL          string
	keystore         KeyStore
	key              KeyHandle
	pubHash          string
	installationUUID string

	mu   sync.Mutex
	sess *AgentSession
}

func NewAgentClient(keystore KeyStore, key KeyHandle, baseURL, installationUUID string) *AgentClient {
	baseURL = strings.TrimRight(baseURL, "/")
	return &AgentClient{
		http:             &http.Client{Timeout: 15 * time.Second},
		baseURL:          baseURL,
		keystore:         keystore,
		key:              key,
		installationUUID: installationUUID,
	}
}

// SetPublicKeyHash wires the agent's derived identifier used to start
// challenge-response authentication.
func (c *AgentClient) SetPublicKeyHash(hash string) {
	c.pubHash = hash
}

func (c *AgentClient) apiURL(path string) string {
	return c.baseURL + path
}

// ---- session management ----------------------------------------------------

// AgentSession holds the short-lived credentials in process memory only.
type AgentSession struct {
	AccessToken       string
	ExpiresAt         time.Time
	ServerUUID        string
	Servers           []ServerAssignment
	WatchedPaths      []WatchedPath
	HeartbeatInterval int
	ReverbHost        string
	ReverbPort        int
	ReverbScheme      string
	ReverbAppKey      string
}

// ensureSession returns a valid session, re-running challenge-response
// authentication whenever the current one is missing or expired.
func (c *AgentClient) ensureSession() (*AgentSession, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.sess != nil && time.Now().Before(c.sess.ExpiresAt) {
		return c.sess, nil
	}

	sess, err := c.authenticate()
	if err != nil {
		return nil, err
	}
	c.sess = sess
	return sess, nil
}

// invalidate forces the next call to re-authenticate.
func (c *AgentClient) invalidate() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.sess = nil
}

// refreshSession discards the cached session and re-authenticates, so the
// returned session carries the freshest server filters. Used on WS control
// channel (re)connect: an event broadcast while the socket was down is
// recovered from the auth response, which is the source of truth for filters.
func (c *AgentClient) refreshSession() (*AgentSession, error) {
	c.mu.Lock()
	c.sess = nil
	c.mu.Unlock()
	return c.ensureSession()
}

// authenticate performs the challenge-response handshake:
//
//	agent_id (public key fingerprint)  →  backend
//	backend  →  random single-use challenge
//	agent  →  signature(challenge)
//	backend  →  short-lived session
func (c *AgentClient) authenticate() (*AgentSession, error) {
	chal, err := c.requestChallenge(c.installationUUID)
	if err != nil {
		return nil, err
	}

	// The challenge is an opaque string on the wire; the backend verifies the
	// signature over the raw challenge text, so sign it verbatim.
	sig, err := c.keystore.Sign(context.Background(), c.key, []byte(chal.Challenge))
	if err != nil {
		return nil, fmt.Errorf("sign challenge: %w", err)
	}

	authResp, err := c.verifyChallenge(chal.ChallengeID, base64.StdEncoding.EncodeToString(sig))
	if err != nil {
		return nil, err
	}

	return &AgentSession{
		AccessToken:       authResp.AccessToken,
		ExpiresAt:         time.Now().Add(time.Duration(authResp.ExpiresIn) * time.Second),
		ServerUUID:        authResp.ServerUUID,
		Servers:           authResp.Servers,
		WatchedPaths:      authResp.Config.WatchedPaths,
		HeartbeatInterval: authResp.Config.HeartbeatInterval,
		ReverbHost:        authResp.Config.Realtime.Host,
		ReverbPort:        authResp.Config.Realtime.Port,
		ReverbScheme:      authResp.Config.Realtime.Scheme,
		ReverbAppKey:      authResp.Config.Realtime.AppKey,
	}, nil
}

func (c *AgentClient) requestChallenge(installationUUID string) (*ChallengeResponse, error) {
	url := c.apiURL("/api/v1/agent/auth/challenge")
	result, err := c.sendWithRetry(url, map[string]string{"installation_uuid": installationUUID}, nil, 3, nil, time.Time{})
	if err != nil {
		return nil, err
	}

	chal := &ChallengeResponse{}
	if id, ok := result["challenge_id"].(float64); ok {
		chal.ChallengeID = int64(id)
	}
	if c, ok := result["challenge"].(string); ok {
		chal.Challenge = c
	}
	if ei, ok := result["expires_in"].(float64); ok {
		chal.ExpiresIn = int(ei)
	}
	if chal.ChallengeID == 0 || chal.Challenge == "" {
		return nil, fmt.Errorf("challenge response missing challenge")
	}
	return chal, nil
}

func (c *AgentClient) verifyChallenge(challengeID int64, signature string) (*AuthResponse, error) {
	url := c.apiURL("/api/v1/agent/auth/verify")
	payload := map[string]interface{}{
		"challenge_id": challengeID,
		"signature":    signature,
	}
	result, err := c.sendWithRetry(url, payload, nil, 3, nil, time.Time{})
	if err != nil {
		return nil, err
	}

	return parseAuthResponse(result)
}

func parseAuthResponse(result map[string]interface{}) (*AuthResponse, error) {
	resp := &AuthResponse{}
	if tok, ok := result["access_token"].(string); ok {
		resp.AccessToken = tok
	}
	if ei, ok := result["expires_in"].(float64); ok {
		resp.ExpiresIn = int(ei)
	}
	if uuid, ok := result["server_uuid"].(string); ok {
		resp.ServerUUID = uuid
	}
	if servers, ok := result["servers"].([]interface{}); ok {
		for _, item := range servers {
			m, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			assignment := ServerAssignment{}
			if u, ok := m["server_uuid"].(string); ok {
				assignment.ServerUUID = u
			}
			assignment.PortFilter = parseIntList(m["port_filter"])
			assignment.ProcessFilter = parseStringList(m["process_filter"])
			assignment.NetworkFilter = parseStringList(m["network_filter"])
			if assignment.ServerUUID != "" {
				resp.Servers = append(resp.Servers, assignment)
			}
		}
	}
	if cfg, ok := result["config"].(map[string]interface{}); ok {
		if hb, ok := cfg["heartbeat_interval"].(float64); ok {
			resp.Config.HeartbeatInterval = int(hb)
		}
		if rt, ok := cfg["realtime"].(map[string]interface{}); ok {
			if h, ok := rt["host"].(string); ok {
				resp.Config.Realtime.Host = h
			}
			if p, ok := rt["port"].(float64); ok {
				resp.Config.Realtime.Port = int(p)
			}
			if s, ok := rt["scheme"].(string); ok {
				resp.Config.Realtime.Scheme = s
			}
			if k, ok := rt["app_key"].(string); ok {
				resp.Config.Realtime.AppKey = k
			}
		}
		if wps, ok := cfg["watched_paths"].([]interface{}); ok {
			for _, item := range wps {
				m, ok := item.(map[string]interface{})
				if !ok {
					continue
				}
				wp := WatchedPath{}
				if p, ok := m["path"].(string); ok {
					wp.Path = p
				}
				if s, ok := m["scope"].(string); ok {
					wp.Scope = s
				}
				if u, ok := m["server_uuid"].(string); ok {
					wp.ServerUUID = u
				}
				if e, ok := m["enabled"].(bool); ok {
					wp.Enabled = e
				}
				if pats, ok := m["exclude_patterns"].([]interface{}); ok {
					for _, pat := range pats {
						if s, ok := pat.(string); ok && s != "" {
							wp.ExcludePatterns = append(wp.ExcludePatterns, s)
						}
					}
				}
				if d, ok := m["description"].(string); ok {
					wp.Description = d
				}
				if wp.Path != "" {
					resp.Config.WatchedPaths = append(resp.Config.WatchedPaths, wp)
				}
			}
		}
	}

	if resp.AccessToken == "" {
		return nil, fmt.Errorf("auth response missing access_token")
	}
	return resp, nil
}

// parseIntList converts a JSON filter value into []int. A JSON null /
// absent value yields nil (meaning "no filter"); an empty array yields an
// empty non-nil slice (meaning "filter to nothing").
func parseIntList(v interface{}) []int {
	list, ok := v.([]interface{})
	if !ok || list == nil {
		return nil
	}
	out := make([]int, 0, len(list))
	for _, item := range list {
		if n, ok := item.(float64); ok {
			out = append(out, int(n))
		}
	}
	return out
}

// parseStringList converts a JSON string filter value into []string with
// the same null vs empty semantics as parseIntList.
func parseStringList(v interface{}) []string {
	list, ok := v.([]interface{})
	if !ok || list == nil {
		return nil
	}
	out := make([]string, 0, len(list))
	for _, item := range list {
		if s, ok := item.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

// ---- HTTP helpers ----------------------------------------------------------

func (c *AgentClient) doOnce(url string, payload interface{}, extraHeaders map[string]string) (int, []byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, fmt.Errorf("marshal error: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return 0, nil, fmt.Errorf("request error: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range extraHeaders {
		req.Header.Set(k, v)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return 0, nil, err // network error — caller decides whether to retry
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, respBody, nil
}

// sendWithRetry posts payload, retrying on network errors (waiting for the
// network to come back) and on non-2xx responses until maxAttempts (0 =
// unlimited). stopOn, if set, short-circuits the retry for a given status.
// A zero deadline means no timeout; otherwise the call gives up once the
// deadline passes so stale payloads (heartbeats) are dropped instead of
// blocking their loop forever. The next tick sends fresh data.
func (c *AgentClient) sendWithRetry(url string, payload interface{}, extraHeaders map[string]string, maxAttempts int, stopOn func(int) bool, deadline time.Time) (map[string]interface{}, error) {
	delay := 2 * time.Second
	maxDelay := 60 * time.Second
	attempt := 0
	expired := func() bool {
		return !deadline.IsZero() && !time.Now().Before(deadline)
	}

	for {
		if expired() {
			return nil, fmt.Errorf("send deadline exceeded for %s", url)
		}
		attempt++

		status, respBody, err := c.doOnce(url, payload, extraHeaders)
		if err != nil {
			log.Printf("[attempt %d] network error: %v — waiting for internet...", attempt, err)
			waitForInternetUntil(deadline)
			continue
		}

		if status >= 200 && status < 300 {
			var result map[string]interface{}
			if err := json.Unmarshal(respBody, &result); err != nil {
				return nil, fmt.Errorf("decode error: %w", err)
			}
			return result, nil
		}

		if stopOn != nil && stopOn(status) {
			return nil, &httpStatusError{Status: status, Body: respBody}
		}

		log.Printf("[attempt %d] HTTP %d from %s", attempt, status, url)

		if maxAttempts > 0 && attempt >= maxAttempts {
			return nil, &httpStatusError{Status: status, Body: respBody}
		}

		sleep := delay
		if !deadline.IsZero() {
			if remain := time.Until(deadline); remain < sleep {
				sleep = remain
			}
		}
		time.Sleep(sleep)
		delay *= 2
		if delay > maxDelay {
			delay = maxDelay
		}
	}
}

// waitForInternetUntil blocks until connectivity returns or the deadline
// passes. A zero deadline waits indefinitely (previous behavior for
// non-heartbeat sends).
func waitForInternetUntil(deadline time.Time) {
	for {
		if !deadline.IsZero() && !time.Now().Before(deadline) {
			return
		}
		if hasInternet() {
			return
		}
		sleep := 5 * time.Second
		if !deadline.IsZero() {
			if remain := time.Until(deadline); remain < sleep {
				sleep = remain
			}
		}
		if sleep > 0 {
			time.Sleep(sleep)
		}
	}
}

// ---- agent operations ------------------------------------------------------

func (c *AgentClient) register(req *RegisterRequest) (*RegisterResponse, error) {
	url := c.apiURL("/api/v1/register")
	result, err := c.sendWithRetry(url, req, nil, 5, nil, time.Time{})
	if err != nil {
		return nil, err
	}

	resp := &RegisterResponse{}
	if reg, ok := result["registered"].(bool); ok {
		resp.Registered = reg
	}
	if id, ok := result["agent_id"].(float64); ok {
		resp.AgentID = int(id)
	}
	if uuid, ok := result["server_uuid"].(string); ok {
		resp.ServerUUID = uuid
	}
	return resp, nil
}

// sendAgentHeartbeat sends one aggregated heartbeat covering every monitored
// server. On a 401 the session is refreshed once and the call retried; all
// other HTTP errors are returned for the caller to classify.
// The send is bounded by timeout (stale payloads are dropped so the next tick
// sends fresh data); a non-positive timeout keeps the old unbounded behavior.
func (c *AgentClient) sendAgentHeartbeat(payload *AgentHeartbeatRequest, timeout time.Duration) (*AgentHeartbeatResponse, error) {
	url := c.apiURL("/api/v1/agent/heartbeat")

	deadline := time.Time{}
	if timeout > 0 {
		deadline = time.Now().Add(timeout)
	}

	for attempt := 0; attempt < 2; attempt++ {
		sess, err := c.ensureSession()
		if err != nil {
			return nil, err
		}

		headers := map[string]string{"Authorization": "Bearer " + sess.AccessToken}
		result, err := c.sendWithRetry(url, payload, headers, 0, func(status int) bool { return status == 401 }, deadline)
		if err != nil {
			var hse *httpStatusError
			if errors.As(err, &hse) && hse.Status == http.StatusUnauthorized {
				log.Println("Session token rejected — re-authenticating.")
				c.invalidate()
				continue
			}
			return nil, err
		}

		resp := &AgentHeartbeatResponse{}
		if hb, ok := result["heartbeat_interval"].(float64); ok {
			resp.HeartbeatInterval = int(hb)
		}
		if ct, ok := result["current_time"].(float64); ok {
			resp.CurrentTime = int64(ct)
		}
		if uuids, ok := result["server_uuids"].([]interface{}); ok {
			for _, u := range uuids {
				if s, ok := u.(string); ok {
					resp.ServerUUIDs = append(resp.ServerUUIDs, s)
				}
			}
		}
		if rev, ok := result["revoked_server_uuids"].([]interface{}); ok {
			for _, u := range rev {
				if s, ok := u.(string); ok {
					resp.RevokedServerUUIDs = append(resp.RevokedServerUUIDs, s)
				}
			}
		}
		if cfg, ok := result["configuration"].(map[string]interface{}); ok {
			resp.Configuration = cfg
		}
		if pu, ok := result["pending_update"].(map[string]interface{}); ok {
			resp.PendingUpdate = &AgentUpdateInfo{}
			if v, ok := pu["version"].(string); ok {
				resp.PendingUpdate.Version = v
			}
			if hb, ok := pu["heartbeat_interval"].(float64); ok {
				resp.PendingUpdate.HeartbeatInterval = int(hb)
			}
			if bu, ok := pu["binary_url"].(string); ok {
				resp.PendingUpdate.BinaryURL = bu
			}
		}
		if cmds, ok := result["pending_commands"].([]interface{}); ok {
			for _, c := range cmds {
				if cmdMap, ok := c.(map[string]interface{}); ok {
					cmd := AgentCommand{}
					if id, ok := cmdMap["id"].(float64); ok {
						cmd.Id = int(id)
					}
					if t, ok := cmdMap["type"].(string); ok {
						cmd.Type = t
					}
					if p, ok := cmdMap["payload"].(map[string]interface{}); ok {
						cmd.Payload = p
					}
					resp.PendingCommands = append(resp.PendingCommands, cmd)
				}
			}
		}
		return resp, nil
	}

	return nil, fmt.Errorf("heartbeat failed after session refresh")
}

// sendAuditEvents delivers a batch of audit events, splitting by type into the
// file-activity and lifecycle ingestion endpoints. Events that fail to send are
// returned so the caller can re-enqueue them for the next drain. Empty batches
// are skipped (the backend requires at least one event per request).
func (c *AgentClient) sendAuditEvents(events []*AuditEvent) []*AuditEvent {
	var fileEvents, lifeEvents []AuditEvent
	for _, ev := range events {
		if ev.Type == auditTypeLifecycle {
			lifeEvents = append(lifeEvents, *ev)
		} else {
			fileEvents = append(fileEvents, *ev)
		}
	}

	failed := make([]*AuditEvent, 0)
	if len(fileEvents) > 0 {
		if err := c.sendAuthenticated("/api/v1/agent/audit/file-activity", map[string]interface{}{"events": fileEvents}); err != nil {
			log.Printf("[AUDIT] file-activity send failed: %v", err)
			for i := range fileEvents {
				e := fileEvents[i]
				failed = append(failed, &e)
			}
		}
	}
	if len(lifeEvents) > 0 {
		if err := c.sendAuthenticated("/api/v1/agent/audit/lifecycle", map[string]interface{}{"events": lifeEvents}); err != nil {
			log.Printf("[AUDIT] lifecycle send failed: %v", err)
			for i := range lifeEvents {
				e := lifeEvents[i]
				failed = append(failed, &e)
			}
		}
	}
	return failed
}

// sendAuthenticated posts payload to an agent-signed endpoint, refreshing the
// session once on a 401. Non-401 errors are returned for the caller to decide
// whether to retry (the queue does, on the next drain).
func (c *AgentClient) sendAuthenticated(path string, payload interface{}) error {
	url := c.apiURL(path)
	for attempt := 0; attempt < 2; attempt++ {
		sess, err := c.ensureSession()
		if err != nil {
			return err
		}
		headers := map[string]string{"Authorization": "Bearer " + sess.AccessToken}
		_, err = c.sendWithRetry(url, payload, headers, 0, func(status int) bool { return status == 401 }, time.Time{})
		if err != nil {
			var hse *httpStatusError
			if errors.As(err, &hse) && hse.Status == http.StatusUnauthorized {
				c.invalidate()
				continue
			}
			return err
		}
		return nil
	}
	return fmt.Errorf("audit send gave up after session refresh")
}

func (c *AgentClient) postNotification(url string, payload interface{}) error {
	if url == "" {
		return fmt.Errorf("empty notification URL")
	}

	sess, err := c.ensureSession()
	if err != nil {
		return err
	}

	headers := map[string]string{"Authorization": "Bearer " + sess.AccessToken}
	_, err = c.sendWithRetry(url, payload, headers, 3, nil, time.Time{})
	if err != nil {
		var hse *httpStatusError
		if errors.As(err, &hse) && hse.Status == http.StatusUnauthorized {
			c.invalidate()
		}
		return err
	}
	return nil
}

// postAuthenticated is a raw POST that attaches the current session token.
func (c *AgentClient) postAuthenticated(url string, formBody string) ([]byte, int, error) {
	sess, err := c.ensureSession()
	if err != nil {
		return nil, 0, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBufferString(formBody))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return body, resp.StatusCode, nil
}

// revokeInstallation tells the backend this installation is being uninstalled.
// It is JWT-authenticated (the agent proves it still holds the identity key),
// so only the installation itself can revoke itself. The backend marks the
// agent revoked and archives the server; the key is deleted locally afterwards.
func (c *AgentClient) revokeInstallation() error {
	url := c.apiURL("/api/v1/agent/uninstall")
	sess, err := c.ensureSession()
	if err != nil {
		return err
	}
	headers := map[string]string{"Authorization": "Bearer " + sess.AccessToken}
	_, err = c.sendWithRetry(url, map[string]string{"reason": "uninstall"}, headers, 3, nil, time.Time{})
	if err != nil {
		var hse *httpStatusError
		if errors.As(err, &hse) && hse.Status == http.StatusUnauthorized {
			c.invalidate()
		}
		return err
	}
	return nil
}

func (c *AgentClient) detachServer(serverUuid string) error {
	url := c.apiURL("/api/v1/agent/servers/" + serverUuid + "/uninstall")
	sess, err := c.ensureSession()
	if err != nil {
		return err
	}
	headers := map[string]string{"Authorization": "Bearer " + sess.AccessToken}
	_, err = c.sendWithRetry(url, map[string]string{"reason": "detach"}, headers, 3, nil, time.Time{})
	if err != nil {
		var hse *httpStatusError
		if errors.As(err, &hse) && hse.Status == http.StatusUnauthorized {
			c.invalidate()
		}
		return err
	}
	return nil
}
