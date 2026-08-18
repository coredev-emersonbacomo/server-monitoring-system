package main

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"errors"
)

// keyIDForInstallation derives the OS keystore key name from the immutable
// installation UUID. This is what makes identities per-installation: the same
// physical computer can host many keys, one per installation. Two installations
// can never share an identity.
func keyIDForInstallation(uuid string) string {
	return "MonitorAgentIdentity-" + uuid
}

// selftestKeyID is the key used only by the -selftest command. It never
// collides with a real installation key because its UUID is a fixed test value.
func selftestKeyID() string {
	return keyIDForInstallation("00000000-0000-4000-8000-00000000selftest")
}

// ErrKeyNotFound is returned by DeleteKey when the named key is not present
// in the store, so callers can distinguish "deleted" from "nothing to remove".
var ErrKeyNotFound = errors.New("identity key not found")

// KeyHandle is an opaque identifier for a key inside a KeyStore.
type KeyHandle = string

// KeyStore is the platform-neutral private-key abstraction.
//
// Higher-level code never knows whether the key lives in Windows CNG, a
// TPM-backed provider, or a protected file on Linux. The private key never
// leaves the store and is never serialized by the caller.
type KeyStore interface {
	// GetOrCreateKey returns the handle for the named persistent key,
	// creating it on first use.
	GetOrCreateKey(ctx context.Context, keyID string) (KeyHandle, error)
	// PublicKey returns the PKIX SubjectPublicKeyInfo (SPKI) DER encoding.
	// Safe to transmit — it is the public half of the key pair.
	PublicKey(ctx context.Context, key KeyHandle) ([]byte, error)
	// Sign produces a PKCS#1 v1.5 signature over data using SHA-256.
	Sign(ctx context.Context, key KeyHandle, data []byte) ([]byte, error)
	// DeleteKey permanently removes the named key from the store. It returns
	// ErrKeyNotFound if the key is not present, so uninstall can report
	// "deleted" vs "nothing to remove" without pretending both are the same.
	DeleteKey(ctx context.Context, keyID string) error
	// HasKey reports whether the named key already exists in the store. Used
	// by the installer to detect UUID/keystore collisions before creating a
	// new installation.
	HasKey(ctx context.Context, keyID string) (bool, error)
}

// newKeyStore returns the platform implementation (build tags select it).
func newKeyStore() KeyStore {
	return newPlatformKeyStore()
}

// publicKeyHashHex derives the stable agent identifier from the public key
// SPKI DER. It is a fingerprint, not a credential — possession of the private
// key is what authenticates the agent.
func publicKeyHashHex(pubDER []byte) string {
	sum := sha256.Sum256(pubDER)
	return hex.EncodeToString(sum[:])
}

func publicKeyBase64(pubDER []byte) string {
	return base64.StdEncoding.EncodeToString(pubDER)
}

// verifySignature is the self-check for a signed challenge: it must validate
// against the public key the backend will be given.
func verifySignature(pubDER, data, sig []byte) bool {
	pub, err := x509.ParsePKIXPublicKey(pubDER)
	if err != nil {
		return false
	}
	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return false
	}
	digest := sha256.Sum256(data)
	return rsa.VerifyPKCS1v15(rsaPub, crypto.SHA256, digest[:], sig) == nil
}