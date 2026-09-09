//go:build windows

package main

// fileOwnerUsername is best-effort audit attribution. Windows file ownership
// rarely identifies the acting user, so events carry no username there (the
// field stays null rather than misleading).
func fileOwnerUsername(path string) string {
	return ""
}
