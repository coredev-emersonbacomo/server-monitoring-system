package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type AgentClient struct {
	http *http.Client
}

func NewAgentClient() *AgentClient {
	return &AgentClient{
		http: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *AgentClient) sendWithRetry(url string, payload interface{}, extraHeaders map[string]string, maxAttempts int) (map[string]interface{}, error) {
	delay := 2 * time.Second
	maxDelay := 60 * time.Second
	attempt := 0

	for {
		attempt++

		body, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("marshal error: %w", err)
		}

		req, err := http.NewRequest("POST", url, bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("request error: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")
		for k, v := range extraHeaders {
			req.Header.Set(k, v)
		}

		resp, err := c.http.Do(req)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[attempt %d] network error: %v — waiting for internet...\n", attempt, err)
			waitForInternet()
			continue
		}

		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			var result map[string]interface{}
			if err := json.Unmarshal(respBody, &result); err != nil {
				return nil, fmt.Errorf("decode error: %w", err)
			}
			return result, nil
		}

		fmt.Fprintf(os.Stderr, "[attempt %d] HTTP %d from %s\n", attempt, resp.StatusCode, url)
		if msg, ok := tryGetMessage(respBody); ok {
			fmt.Fprintf(os.Stderr, "  Response: %s\n", msg)
		}

		if maxAttempts > 0 && attempt >= maxAttempts {
			return nil, fmt.Errorf("max attempts (%d) reached, last status: %d", maxAttempts, resp.StatusCode)
		}

		time.Sleep(delay)
		delay *= 2
		if delay > maxDelay {
			delay = maxDelay
		}
	}
}

func (c *AgentClient) register(url string, req *RegisterRequest) (*RegisterResponse, error) {
	result, err := c.sendWithRetry(url, req, nil, 5)
	if err != nil {
		return nil, err
	}

	identity, ok := result["identity"].(string)
	if !ok || identity == "" {
		return nil, fmt.Errorf("registration returned no identity token")
	}

	resp := &RegisterResponse{Identity: identity}
	if hb, ok := result["heartbeat_interval"].(float64); ok {
		resp.HeartbeatInterval = int(hb)
	}
	if cfg, ok := result["configuration"].(map[string]interface{}); ok {
		resp.Configuration = cfg
	}
	return resp, nil
}

func (c *AgentClient) sendHeartbeat(url, token string, payload *HeartbeatRequest) (*HeartbeatResponse, error) {
	headers := map[string]string{"Authorization": "Bearer " + token}
	result, err := c.sendWithRetry(url, payload, headers, 0)
	if err != nil {
		return nil, err
	}

	resp := &HeartbeatResponse{}
	if hb, ok := result["heartbeat_interval"].(float64); ok {
		resp.HeartbeatInterval = int(hb)
	}
	if ct, ok := result["current_time"].(float64); ok {
		resp.CurrentTime = int64(ct)
	}
	if cfg, ok := result["configuration"].(map[string]interface{}); ok {
		resp.Configuration = cfg
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

func tryGetMessage(body []byte) (string, bool) {
	var m map[string]interface{}
	if json.Unmarshal(body, &m) != nil {
		return "", false
	}
	msg, ok := m["message"].(string)
	return msg, ok
}


