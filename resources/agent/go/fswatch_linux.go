//go:build linux

package main

import (
	"encoding/binary"
	"log"
	"os"
	"path/filepath"
	"sync"
	"syscall"

	"golang.org/x/sys/unix"
)

// watchPath watches a directory (and, when recursive, its sub-directories as
// they are created) using inotify and emits normalized rawOps. The fd is closed
// when done is signalled, which ends the blocking read.
func watchPath(root string, recursive bool, out chan<- rawOp, done <-chan struct{}) {
	fd, err := unix.InotifyInit()
	if err != nil {
		log.Printf("[FSW] inotify init failed for %s: %v", root, err)
		return
	}

	var wdMu sync.Mutex
	wdToPath := map[int]string{}

	addWatch := func(path string) int {
		w, e := unix.InotifyAddWatch(fd, path,
			unix.IN_CREATE|unix.IN_DELETE|unix.IN_MODIFY|
				unix.IN_MOVED_FROM|unix.IN_MOVED_TO|unix.IN_CLOSE_WRITE|
				unix.IN_DELETE_SELF|unix.IN_MOVE_SELF)
		if e != nil {
			log.Printf("[FSW] inotify add watch failed for %s: %v", path, e)
			return -1
		}
		wdMu.Lock()
		wdToPath[w] = path
		wdMu.Unlock()
		return w
	}

	if addWatch(root) < 0 {
		unix.Close(fd)
		return
	}

	go func() {
		<-done
		unix.Close(fd)
	}()

	const bufSize = 64 * 1024
	buf := make([]byte, bufSize)

	for {
		n, err := unix.Read(fd, buf)
		if err != nil {
			if err == syscall.EINTR {
				continue
			}
			return
		}
		if n <= 0 {
			return
		}
		parseInotify(buf[:n], out, recursive, addWatch, wdToPath, &wdMu)
	}
}

func parseInotify(buf []byte, out chan<- rawOp, recursive bool,
	addWatch func(string) int, wdToPath map[int]string, wdMu *sync.Mutex) {

	offset := 0
	for offset+16 <= len(buf) {
		wd := int(int32(binary.LittleEndian.Uint32(buf[offset:])))
		mask := binary.LittleEndian.Uint32(buf[offset+4:])
		lname := binary.LittleEndian.Uint32(buf[offset+12:])

		nameEnd := offset + 16 + int(lname)
		var name string
		if nameEnd <= len(buf) && lname > 0 {
			raw := buf[offset+16 : nameEnd]
			if i := indexOfByte(raw, 0); i >= 0 {
				raw = raw[:i]
			}
			name = string(raw)
		}

		wdMu.Lock()
		dir := wdToPath[wd]
		wdMu.Unlock()

		if mask&unix.IN_IGNORED != 0 {
			wdMu.Lock()
			delete(wdToPath, wd)
			wdMu.Unlock()
		}

		if dir != "" && name != "" {
			full := filepath.Join(dir, name)
			isDir := mask&unix.IN_ISDIR != 0
			switch {
			case mask&unix.IN_CREATE != 0:
				if isDir && recursive {
					addWatch(full)
				}
				out <- rawOp{path: full, kind: "create", isDir: isDir}
			case mask&unix.IN_CLOSE_WRITE != 0 || mask&unix.IN_MODIFY != 0:
				out <- rawOp{path: full, kind: "modify", isDir: isDir}
			case mask&unix.IN_DELETE != 0 || mask&unix.IN_DELETE_SELF != 0:
				if isDir {
					wdMu.Lock()
					delete(wdToPath, wd)
					wdMu.Unlock()
				}
				out <- rawOp{path: full, kind: "delete", isDir: isDir}
			case mask&unix.IN_MOVED_FROM != 0:
				out <- rawOp{path: full, kind: "renameOld", isDir: isDir}
			case mask&unix.IN_MOVED_TO != 0:
				if isDir && recursive {
					addWatch(full)
				}
				out <- rawOp{path: full, kind: "renameNew", isDir: isDir}
			}
		}

		eventSize := 16 + int(lname)
		if eventSize < 16 {
			eventSize = 16
		}
		offset += eventSize
		if mask&unix.IN_IGNORED != 0 && dir == "" {
			// ignore
		}
	}
}

func indexOfByte(b []byte, c byte) int {
	for i := 0; i < len(b); i++ {
		if b[i] == c {
			return i
		}
	}
	return -1
}

// ensure os import is used on linux build (Stat available for parity).
var _ = os.Stat
