package main

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"time"
)

func readConfig(path string) (*BootstrapConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read %s: %w", path, err)
	}

	var cfg BootstrapConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", path, err)
	}
	cfg.confVersion = 1
	return &cfg, nil
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
