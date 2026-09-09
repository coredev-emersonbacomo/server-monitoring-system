package main

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestRotateAgentLog(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "agent.log")

	// Below cap: untouched.
	if err := os.WriteFile(path, make([]byte, 1024), 0644); err != nil {
		t.Fatal(err)
	}
	rotateAgentLog(path)
	if _, err := os.Stat(path + ".1"); !os.IsNotExist(err) {
		t.Fatal("small log should not rotate")
	}

	// Over cap: rotates, keeping at most maxAgentLogFiles generations.
	big := make([]byte, maxAgentLogBytes+1)
	for i := range big {
		big[i] = 'x'
	}
	if err := os.WriteFile(path, big, 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path+".1", []byte("old1"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path+".2", []byte("old2"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path+".3", []byte("old3"), 0644); err != nil {
		t.Fatal(err)
	}
	rotateAgentLog(path)
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("current log should have moved to .1")
	}
	for _, want := range []string{".1", ".2", ".3"} {
		if _, err := os.Stat(path + want); err != nil {
			t.Fatalf("expected generation %s: %v", want, err)
		}
	}
	if _, err := os.Stat(path + ".4"); !os.IsNotExist(err) {
		t.Fatal("rotation must not keep more than maxAgentLogFiles generations")
	}
}

func TestUpdateCooldown(t *testing.T) {
	failedUpdateVersion = ""
	cooldownLoggedVersion = ""

	if skipFailedUpdate("v9") {
		t.Fatal("no failure recorded, should not skip")
	}
	noteUpdateResult("v9", errors.New("boom"))
	if !skipFailedUpdate("v9") {
		t.Fatal("recently failed version should be skipped")
	}
	if skipFailedUpdate("v10") {
		t.Fatal("different version should not be skipped")
	}
	// Simulate expiry.
	failedUpdateAt = time.Now().Add(-updateRetryCooldown - time.Minute)
	if skipFailedUpdate("v9") {
		t.Fatal("expired cooldown should allow retry")
	}
	noteUpdateResult("v9", nil)
	if skipFailedUpdate("v9") {
		t.Fatal("success should clear the cooldown")
	}
}
