//go:build windows

package main

import (
	"encoding/binary"
	"log"
	"os"
	"path/filepath"
	"syscall"

	"golang.org/x/sys/windows"
)

// watchPath watches a single directory recursively using ReadDirectoryChangesW.
func watchPath(root string, out chan<- rawOp, done <-chan struct{}) {
	h, err := windows.CreateFile(
		windows.StringToUTF16Ptr(root),
		windows.FILE_LIST_DIRECTORY,
		windows.FILE_SHARE_READ|windows.FILE_SHARE_WRITE|windows.FILE_SHARE_DELETE,
		nil,
		windows.OPEN_EXISTING,
		windows.FILE_FLAG_BACKUP_SEMANTICS,
		0,
	)
	if err != nil {
		log.Printf("[FSW] CreateFile failed for %s: %v", root, err)
		return
	}
	defer windows.Close(h)

	go func() {
		<-done
		// Closing the handle unblocks the synchronous ReadDirectoryChangesW.
		windows.Close(h)
	}()

	const bufSize = 64 * 1024
	buf := make([]byte, bufSize)
	flags := uint32(windows.FILE_NOTIFY_CHANGE_FILE_NAME |
		windows.FILE_NOTIFY_CHANGE_DIR_NAME |
		windows.FILE_NOTIFY_CHANGE_LAST_WRITE |
		windows.FILE_NOTIFY_CHANGE_SIZE)

	for {
		var bytes uint32
		err := windows.ReadDirectoryChanges(
			h,
			&buf[0],
			uint32(len(buf)),
			true,
			flags,
			&bytes,
			nil, 0,
		)
		if err != nil {
			if err == windows.ERROR_NOTIFY_CLEANUP || err == windows.ERROR_INVALID_HANDLE {
				return
			}
			// Buffer overflow: events were lost but the watch is still valid.
			if err == windows.ERROR_NOTIFY_ENUM_DIR {
				log.Printf("[FSW] change buffer overflow on %s", root)
				continue
			}
			log.Printf("[FSW] ReadDirectoryChangesW error on %s: %v", root, err)
			return
		}
		if bytes == 0 {
			continue
		}
		parseWinEvents(buf[:bytes], root, out)
	}
}

// parseWinEvents walks the FILE_NOTIFY_INFORMATION linked list.
func parseWinEvents(buf []byte, root string, out chan<- rawOp) {
	offset := 0
	for offset+12 <= len(buf) {
		next := binary.LittleEndian.Uint32(buf[offset:])
		action := binary.LittleEndian.Uint32(buf[offset+4:])
		nameLen := binary.LittleEndian.Uint32(buf[offset+8:])
		nameEnd := offset + 12 + int(nameLen)
		if nameEnd > len(buf) {
			break
		}
		nameBytes := buf[offset+12 : nameEnd]
		name := utf16BytesToString(nameBytes)
		full := filepath.Join(root, name)

		switch action {
		case windows.FILE_ACTION_ADDED:
			out <- rawOp{path: full, kind: "create", isDir: isDirOrFalse(full)}
		case windows.FILE_ACTION_REMOVED:
			out <- rawOp{path: full, kind: "delete", isDir: false}
		case windows.FILE_ACTION_MODIFIED:
			out <- rawOp{path: full, kind: "modify", isDir: false}
		case windows.FILE_ACTION_RENAMED_OLD_NAME:
			out <- rawOp{path: full, kind: "renameOld", isDir: false}
		case windows.FILE_ACTION_RENAMED_NEW_NAME:
			out <- rawOp{path: full, kind: "renameNew", isDir: isDirOrFalse(full)}
		}

		if next == 0 {
			break
		}
		offset += int(next)
	}
}

// utf16BytesToString converts a UTF-16LE byte slice (no NUL terminator) to a string.
func utf16BytesToString(b []byte) string {
	n := len(b) / 2
	u16 := make([]uint16, n)
	for i := 0; i < n; i++ {
		u16[i] = binary.LittleEndian.Uint16(b[2*i:])
	}
	return syscall.UTF16ToString(u16)
}

// isDirOrFalse reports whether path is a directory, returning false on error
// (e.g. the entry was already removed).
func isDirOrFalse(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}
