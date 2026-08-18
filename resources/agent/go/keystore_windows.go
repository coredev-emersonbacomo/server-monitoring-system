//go:build windows

package main

import (
	"context"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"fmt"
	"math/big"
	"syscall"
	"unsafe"
)

// NCrypt key storage (ncrypt.dll) - the native Windows CNG persisted key API.
//
// The key lives in the Windows per-user key store of the service account
// (LocalSystem for the installed service), outside any application file and
// protected by the OS security boundary. The TPM-backed platform crypto
// provider is preferred when it can actually create keys (real TPM present);
// the Microsoft software key storage provider is the fallback. The agent never
// calls NCryptExportKey for the private key, so even a software key is never
// exported by the application; TPM keys are additionally non-exportable at the
// hardware level.

const (
	msKeyStorageProvider     = "Microsoft Software Key Storage Provider"
	msPlatformCryptoProvider = "Microsoft Platform Crypto Provider"
	nCryptRSAAlgorithm       = "RSA"
	bCryptRSAPublicBlob      = "RSAPUBLICBLOB"

	nCryptKeyFlag      = 0x00000000 // per-user key store (service account stable across restarts)
	nCryptPadPKCS1Flag = 0x00000002

	// HRESULTs returned by NCrypt functions
	nteBadKeyset          = 0x80090016
	nteNotFound           = 0x80090011
	nteProviderDllMissing = 0x80090010
	nteSuccess            = 0x00000000
)

var (
	ncryptOpenStorageProvider = syscall.NewLazyDLL("ncrypt.dll").NewProc("NCryptOpenStorageProvider")
	ncryptCreatePersistedKey  = syscall.NewLazyDLL("ncrypt.dll").NewProc("NCryptCreatePersistedKey")
	ncryptOpenKey             = syscall.NewLazyDLL("ncrypt.dll").NewProc("NCryptOpenKey")
	ncryptDeleteKey           = syscall.NewLazyDLL("ncrypt.dll").NewProc("NCryptDeleteKey")
	ncryptFinalizeKey         = syscall.NewLazyDLL("ncrypt.dll").NewProc("NCryptFinalizeKey")
	ncryptSignHash            = syscall.NewLazyDLL("ncrypt.dll").NewProc("NCryptSignHash")
	ncryptExportKey           = syscall.NewLazyDLL("ncrypt.dll").NewProc("NCryptExportKey")
	ncryptFreeObject          = syscall.NewLazyDLL("ncrypt.dll").NewProc("NCryptFreeObject")
)

// bCryptPkcs1PaddingInfo mirrors BCRYPT_PKCS1_PADDING_INFO (bcrypt.h).
type bCryptPkcs1PaddingInfo struct {
	pszAlgID *uint16 // LPCWSTR hash algorithm CNG name
}

// bCryptRSAKeyBlob mirrors BCRYPT_RSAKEY_BLOB (bcrypt.h). For a public blob the
// private prime fields are zero and absent from the payload.
type bCryptRSAKeyBlob struct {
	Magic       uint32
	BitLength   uint32
	cbPublicExp uint32
	cbModulus   uint32
	cbPrime1    uint32
	cbPrime2    uint32
}

type ncryptStore struct {
	providers []string
}

func newPlatformKeyStore() KeyStore {
	// The TPM provider's DLL is loadable even without TPM hardware; actual key
	// operations on it fail. Trying providers in order with fallback handles
	// both real-TPM and no-TPM machines.
	return &ncryptStore{providers: []string{msPlatformCryptoProvider, msKeyStorageProvider}}
}

func (s *ncryptStore) openProvider(name string) (uintptr, error) {
	var hProv uintptr
	prov, _ := syscall.UTF16PtrFromString(name)
	r, _, _ := ncryptOpenStorageProvider.Call(
		uintptr(unsafe.Pointer(&hProv)), uintptr(unsafe.Pointer(prov)), 0)
	if r != nteSuccess {
		return 0, fmt.Errorf("NCryptOpenStorageProvider: 0x%08x", r)
	}
	return hProv, nil
}

func (s *ncryptStore) openKey(keyID string) (uintptr, string, error) {
	keyName, _ := syscall.UTF16PtrFromString(keyID)

	var lastErr error
	for _, provName := range s.providers {
		hProv, err := s.openProvider(provName)
		if err != nil {
			lastErr = err
			continue
		}

		var hKey uintptr
		r, _, _ := ncryptOpenKey.Call(
			hProv, uintptr(unsafe.Pointer(&hKey)), uintptr(unsafe.Pointer(keyName)),
			0, nCryptKeyFlag)
		ncryptFreeObject.Call(hProv)

		if r == nteSuccess {
			return hKey, provName, nil
		}
		lastErr = fmt.Errorf("NCryptOpenKey: 0x%08x", r)
	}
	return 0, "", lastErr
}

func (s *ncryptStore) GetOrCreateKey(ctx context.Context, keyID string) (KeyHandle, error) {
	keyName, _ := syscall.UTF16PtrFromString(keyID)

	// Try to open first â€” the key may already exist in one of the providers.
	if hKey, _, err := s.openKey(keyID); err == nil {
		ncryptFreeObject.Call(hKey)
		return keyID, nil
	}

	// Create in the first provider that can persist and finalize the key.
	var lastErr error
	for _, provName := range s.providers {
		hProv, err := s.openProvider(provName)
		if err != nil {
			lastErr = err
			continue
		}

		algID, _ := syscall.UTF16PtrFromString(nCryptRSAAlgorithm)
		var hKey uintptr
		r, _, _ := ncryptCreatePersistedKey.Call(
			hProv, uintptr(unsafe.Pointer(&hKey)), uintptr(unsafe.Pointer(algID)),
			uintptr(unsafe.Pointer(keyName)), 0, nCryptKeyFlag)
		if r != nteSuccess {
			ncryptFreeObject.Call(hProv)
			lastErr = fmt.Errorf("NCryptCreatePersistedKey: 0x%08x", r)
			continue
		}

		r, _, _ = ncryptFinalizeKey.Call(hKey, 0)
		ncryptFreeObject.Call(hKey)
		ncryptFreeObject.Call(hProv)
		if r != nteSuccess {
			lastErr = fmt.Errorf("NCryptFinalizeKey: 0x%08x", r)
			continue
		}
		return keyID, nil
	}

	return "", lastErr
}

func (s *ncryptStore) HasKey(ctx context.Context, keyID string) (bool, error) {
	if hKey, _, err := s.openKey(keyID); err == nil {
		ncryptFreeObject.Call(hKey)
		return true, nil
	}
	return false, nil
}

func (s *ncryptStore) DeleteKey(ctx context.Context, keyID string) error {
	hKey, _, err := s.openKey(keyID)
	if err != nil {
		return ErrKeyNotFound // nothing to delete; uninstall stays side-effect-free
	}

	// NCryptDeleteKey deletes the persisted key and closes the handle.
	r, _, _ := ncryptDeleteKey.Call(hKey, 0)
	if r != nteSuccess {
		ncryptFreeObject.Call(hKey)
		return fmt.Errorf("NCryptDeleteKey: 0x%08x", r)
	}
	return nil
}

func (s *ncryptStore) Sign(ctx context.Context, key KeyHandle, data []byte) ([]byte, error) {
	hKey, _, err := s.openKey(key)
	if err != nil {
		return nil, err
	}
	defer ncryptFreeObject.Call(hKey)

	digest := sha256.Sum256(data)
	pad := &bCryptPkcs1PaddingInfo{pszAlgID: u16ptr("SHA256")}

	var sigLen uint32
	r, _, _ := ncryptSignHash.Call(
		hKey, uintptr(unsafe.Pointer(pad)), uintptr(unsafe.Pointer(&digest[0])),
		uintptr(len(digest)), 0, 0, uintptr(unsafe.Pointer(&sigLen)), nCryptPadPKCS1Flag)
	if r != nteSuccess {
		return nil, fmt.Errorf("NCryptSignHash (size): 0x%08x", r)
	}

	sig := make([]byte, sigLen)
	r, _, _ = ncryptSignHash.Call(
		hKey, uintptr(unsafe.Pointer(pad)), uintptr(unsafe.Pointer(&digest[0])),
		uintptr(len(digest)), uintptr(unsafe.Pointer(&sig[0])), uintptr(sigLen),
		uintptr(unsafe.Pointer(&sigLen)), nCryptPadPKCS1Flag)
	if r != nteSuccess {
		return nil, fmt.Errorf("NCryptSignHash: 0x%08x", r)
	}

	return sig[:sigLen], nil
}

func (s *ncryptStore) PublicKey(ctx context.Context, key KeyHandle) ([]byte, error) {
	hKey, _, err := s.openKey(key)
	if err != nil {
		return nil, err
	}
	defer ncryptFreeObject.Call(hKey)

	blobType, _ := syscall.UTF16PtrFromString(bCryptRSAPublicBlob)

	var outLen uint32
	r, _, _ := ncryptExportKey.Call(
		hKey, 0, uintptr(unsafe.Pointer(blobType)), 0, 0, 0,
		uintptr(unsafe.Pointer(&outLen)), 0)
	if r != nteSuccess {
		return nil, fmt.Errorf("NCryptExportKey (size): 0x%08x", r)
	}

	buf := make([]byte, outLen)
	r, _, _ = ncryptExportKey.Call(
		hKey, 0, uintptr(unsafe.Pointer(blobType)), 0,
		uintptr(unsafe.Pointer(&buf[0])), uintptr(outLen),
		uintptr(unsafe.Pointer(&outLen)), 0)
	if r != nteSuccess {
		return nil, fmt.Errorf("NCryptExportKey: 0x%08x", r)
	}

	return rsaPublicBlobToPKIX(buf[:outLen])
}

func rsaPublicBlobToPKIX(blob []byte) ([]byte, error) {
	if len(blob) < int(unsafe.Sizeof(bCryptRSAKeyBlob{})) {
		return nil, fmt.Errorf("RSAPUBLICBLOB too short")
	}
	header := (*bCryptRSAKeyBlob)(unsafe.Pointer(&blob[0]))
	off := int(unsafe.Sizeof(bCryptRSAKeyBlob{}))

	expBytes := blob[off : off+int(header.cbPublicExp)]
	off += int(header.cbPublicExp)
	modBytes := blob[off : off+int(header.cbModulus)]

	e := 0
	for _, b := range expBytes {
		e = e*256 + int(b)
	}

	pub := &rsa.PublicKey{
		N: new(big.Int).SetBytes(modBytes),
		E: e,
	}
	return x509.MarshalPKIXPublicKey(pub)
}

func u16ptr(s string) *uint16 {
	p, _ := syscall.UTF16PtrFromString(s)
	return p
}
