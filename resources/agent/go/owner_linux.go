//go:build linux

package main

import (
	"os"
	"os/user"
	"strconv"
	"syscall"
)

// fileOwnerUsername returns the owning username of path, or "" when it cannot
// be determined (deleted file, unknown uid). Best-effort audit attribution:
// the owner is not necessarily the actor, but it is the only signal inotify
// provides.
func fileOwnerUsername(path string) string {
	fi, err := os.Stat(path)
	if err != nil {
		return ""
	}
	st, ok := fi.Sys().(*syscall.Stat_t)
	if !ok {
		return ""
	}
	u, err := user.LookupId(strconv.FormatUint(uint64(st.Uid), 10))
	if err != nil {
		return ""
	}
	return u.Username
}
