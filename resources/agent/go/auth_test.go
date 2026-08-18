package main

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"errors"
	"testing"
)

// memStore is an in-memory KeyStore used to exercise the challenge-response
// protocol without touching the OS key store.
type memStore struct {
	key *rsa.PrivateKey
}

func (m *memStore) GetOrCreateKey(ctx context.Context, testKeyID string) (KeyHandle, error) {
	if m.key == nil {
		k, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			return "", err
		}
		m.key = k
	}
	return testKeyID, nil
}

func (m *memStore) PublicKey(ctx context.Context, key KeyHandle) ([]byte, error) {
	return x509.MarshalPKIXPublicKey(&m.key.PublicKey)
}

func (m *memStore) Sign(ctx context.Context, key KeyHandle, data []byte) ([]byte, error) {
	digest := sha256.Sum256(data)
	return rsa.SignPKCS1v15(rand.Reader, m.key, crypto.SHA256, digest[:])
}

func (m *memStore) DeleteKey(ctx context.Context, testKeyID string) error {
	if m.key == nil {
		return ErrKeyNotFound
	}
	m.key = nil
	return nil
}

func (m *memStore) HasKey(ctx context.Context, keyID string) (bool, error) {
	return m.key != nil, nil
}

// testKeyID is a fixed installation-scoped key name used by the tests. It
// exercises the same keyIDForInstallation path real installations use.
var testKeyID = keyIDForInstallation("test-installation")

func TestChallengeSignatureRoundTrip(t *testing.T) {
	store := &memStore{}
	key, err := store.GetOrCreateKey(context.Background(), testKeyID)
	if err != nil {
		t.Fatal(err)
	}
	pub, err := store.PublicKey(context.Background(), key)
	if err != nil {
		t.Fatal(err)
	}

	challenge := []byte("random-challenge-bytes-123")
	sig, err := store.Sign(context.Background(), key, challenge)
	if err != nil {
		t.Fatal(err)
	}

	if !verifySignature(pub, challenge, sig) {
		t.Fatal("signature failed to verify against public key")
	}
	// A signature over a different challenge must not verify — this is the
	// primitive that makes challenge-response replay-resistant.
	if verifySignature(pub, []byte("other-challenge"), sig) {
		t.Fatal("signature verified against the wrong challenge")
	}

	if h1, h2 := publicKeyHashHex(pub), publicKeyHashHex(pub); h1 != h2 || len(h1) != 64 {
		t.Fatalf("public key hash not stable: %s", h1)
	}

	// The raw challenge bytes must round-trip through base64 unchanged (the
	// signature travels base64 on the wire, the challenge itself does not).
	chalB64 := base64.StdEncoding.EncodeToString(challenge)
	chalBytes, err := base64.StdEncoding.DecodeString(chalB64)
	if err != nil || string(chalBytes) != string(challenge) {
		t.Fatal("base64 challenge round trip failed")
	}
	if !verifySignature(pub, chalBytes, sig) {
		t.Fatal("signature failed to verify after base64 round trip")
	}
}

func TestDeleteKeyForcesNewIdentity(t *testing.T) {
	store := &memStore{}
	ctx := context.Background()

	first, err := store.GetOrCreateKey(ctx, testKeyID)
	if err != nil {
		t.Fatal(err)
	}
	firstPub, err := store.PublicKey(ctx, first)
	if err != nil {
		t.Fatal(err)
	}

	if err := store.DeleteKey(ctx, testKeyID); err != nil {
		t.Fatal(err)
	}

	// A key deleted from the store must not come back: the next
	// GetOrCreateKey yields a brand-new keypair.
	second, err := store.GetOrCreateKey(ctx, testKeyID)
	if err != nil {
		t.Fatal(err)
	}
	secondPub, err := store.PublicKey(ctx, second)
	if err != nil {
		t.Fatal(err)
	}

	if h1, h2 := publicKeyHashHex(firstPub), publicKeyHashHex(secondPub); h1 == h2 {
		t.Fatal("delete did not produce a new identity key")
	}

	// Deleting the recreated key succeeds; deleting it again reports
	// ErrKeyNotFound (uninstall stays side-effect-free, but the caller can
	// tell "deleted" from "nothing there").
	if err := store.DeleteKey(ctx, testKeyID); err != nil {
		t.Fatalf("delete of existing key should succeed: %v", err)
	}
	if err := store.DeleteKey(ctx, testKeyID); !errors.Is(err, ErrKeyNotFound) {
		t.Fatalf("delete of absent key should report ErrKeyNotFound, got: %v", err)
	}
}
