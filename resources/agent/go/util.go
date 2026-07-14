package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
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
