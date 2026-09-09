package main

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

// A persistently failing backend must not trap the heartbeat loop: the send
// gives up at the deadline so the next tick sends fresh data.
func TestSendWithRetryDeadlineBoundsFailingEndpoint(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	c := &AgentClient{http: &http.Client{Timeout: 5 * time.Second}, baseURL: srv.URL}
	start := time.Now()
	_, err := c.sendWithRetry(srv.URL+"/x", map[string]string{"a": "b"}, nil, 0, nil, time.Now().Add(1200*time.Millisecond))
	elapsed := time.Since(start)

	if err == nil {
		t.Fatal("expected a deadline error, got success")
	}
	if elapsed > 10*time.Second {
		t.Fatalf("send was not bounded by the deadline, took %v", elapsed)
	}
	if calls.Load() < 1 {
		t.Fatal("expected at least one attempt before the deadline")
	}
}

// Zero deadline preserves the old behavior: eventual success on a flapping
// endpoint (fail once, then recover).
func TestSendWithRetryNoDeadlineRecovers(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	c := &AgentClient{http: &http.Client{Timeout: 5 * time.Second}, baseURL: srv.URL}
	res, err := c.sendWithRetry(srv.URL+"/x", map[string]string{"a": "b"}, nil, 0, nil, time.Time{})
	if err != nil {
		t.Fatalf("expected recovery, got %v", err)
	}
	if res["ok"] != true {
		t.Fatalf("unexpected body: %v", res)
	}
	if calls.Load() != 2 {
		t.Fatalf("expected 2 attempts, got %d", calls.Load())
	}
}

func TestFilterNewCommandsDedupesAndCaps(t *testing.T) {
	executedCommandIDs = nil

	first := filterNewCommands([]AgentCommand{{Id: 1}, {Id: 2}, {Id: 3}})
	if len(first) != 3 {
		t.Fatalf("expected 3 fresh, got %d", len(first))
	}
	again := filterNewCommands([]AgentCommand{{Id: 2}, {Id: 3}, {Id: 4}})
	if len(again) != 1 || again[0].Id != 4 {
		t.Fatalf("expected only id 4 fresh, got %+v", again)
	}

	// Flood past the cap: the set stays bounded, newest IDs win.
	many := make([]AgentCommand, 0, maxPendingCommands+50)
	for i := 1000; i < 1000+maxPendingCommands+50; i++ {
		many = append(many, AgentCommand{Id: i})
	}
	filterNewCommands(many)
	if len(executedCommandIDs) != maxPendingCommands {
		t.Fatalf("expected dedup set capped at %d, got %d", maxPendingCommands, len(executedCommandIDs))
	}

	executedCommandIDs = nil
}
