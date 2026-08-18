//go:build linux

package main

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Linux key storage.
//
// The agent runs under a dedicated service account ("monitor"). The strongest
// practical protection for a signing key in this deployment is a private key
// file owned by that account with mode 0600, placed OUTSIDE the instance
// configuration directory (which is under /var/lib/monitor-agent/instances).
//
// Keys are per-installation: the file name is derived from the installation
// UUID (identity-<uuid>.pem), so two installations on the same machine never
// share an identity.
//
// Security difference vs. Windows/TPM:
//   - A 0600 file is only as strong as OS file permissions — anyone with root
//     (or the service account) can read the key. It is exportable by design.
//   - A TPM-backed or kernel-backed key is non-exportable: the material never
//     leaves the hardware, and a stolen disk/VM snapshot cannot reproduce it.
//
// If a TPM/systemd-backed signer is required, replace this file with a
// pkcs11/tpm2-backed KeyStore; nothing else in the agent changes.

// defaultKeyDir is where per-installation identity files live. Overridable
// via MONITOR_AGENT_KEY_DIR (used by tests / unusual deployments).
const defaultKeyDir = "/var/lib/monitor-agent"

type fileKeyStore struct {
	base string
	key  *rsa.PrivateKey
}

func newPlatformKeyStore() KeyStore {
	base := os.Getenv("MONITOR_AGENT_KEY_DIR")
	if base == "" {
		base = defaultKeyDir
	}
	return &fileKeyStore{base: base}
}

// pathForKey maps a key name (installation UUID-scoped) to a key file path.
// Keys live directly under the key dir, never inside an instance directory.
func (s *fileKeyStore) pathForKey(keyID string) string {
	uuid := strings.TrimPrefix(keyID, "MonitorAgentIdentity-")
	return filepath.Join(s.base, "identity-"+uuid+".pem")
}

func (s *fileKeyStore) HasKey(ctx context.Context, keyID string) (bool, error) {
	_, err := os.Stat(s.pathForKey(keyID))
	if err == nil {
		return true, nil
	}
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	return false, err
}

func (s *fileKeyStore) GetOrCreateKey(ctx context.Context, keyID string) (KeyHandle, error) {
	if s.key != nil {
		return keyID, nil
	}

	path := s.pathForKey(keyID)

	data, err := os.ReadFile(path)
	if err == nil {
		block, _ := pem.Decode(data)
		if block == nil {
			return "", fmt.Errorf("invalid key file %s: not PEM", path)
		}
		parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return "", fmt.Errorf("parse key file %s: %w", path, err)
		}
		key, ok := parsed.(*rsa.PrivateKey)
		if !ok {
			return "", fmt.Errorf("key file %s is not an RSA key", path)
		}
		s.key = key
		return keyID, nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return "", fmt.Errorf("read key file %s: %w", path, err)
	}

	// Generate a fresh keypair on first run. The private key never leaves disk
	// after this point — only its public half is ever transmitted.
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return "", fmt.Errorf("generate key: %w", err)
	}

	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return "", fmt.Errorf("marshal key: %w", err)
	}
	pemBytes := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})

	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return "", fmt.Errorf("create key dir: %w", err)
	}
	if err := os.WriteFile(path, pemBytes, 0600); err != nil {
		return "", fmt.Errorf("write key file: %w", err)
	}
	_ = os.Chmod(path, 0600)

	s.key = key
	return keyID, nil
}

func (s *fileKeyStore) DeleteKey(ctx context.Context, keyID string) error {
	if err := os.Remove(s.pathForKey(keyID)); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ErrKeyNotFound // nothing to delete; uninstall stays side-effect-free
		}
		return fmt.Errorf("remove key file %s: %w", s.pathForKey(keyID), err)
	}
	s.key = nil
	return nil
}

func (s *fileKeyStore) PublicKey(ctx context.Context, key KeyHandle) ([]byte, error) {
	if s.key == nil {
		if _, err := s.GetOrCreateKey(ctx, key); err != nil {
			return nil, err
		}
	}
	return x509.MarshalPKIXPublicKey(&s.key.PublicKey)
}

func (s *fileKeyStore) Sign(ctx context.Context, key KeyHandle, data []byte) ([]byte, error) {
	if s.key == nil {
		if _, err := s.GetOrCreateKey(ctx, key); err != nil {
			return nil, err
		}
	}
	digest := sha256.Sum256(data)
	return rsa.SignPKCS1v15(rand.Reader, s.key, crypto.SHA256, digest[:])
}