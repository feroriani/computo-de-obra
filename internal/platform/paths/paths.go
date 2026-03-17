package paths

import (
	"os"
	"path/filepath"
)

// AppDataDir returns the app data directory for the current OS
// (e.g. ~/.config/computo-de-obra on Linux, ~/Library/Application Support on macOS, %APPDATA% on Windows).
func AppDataDir(appName string) (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return filepath.Join(".", "data"), nil
	}
	return filepath.Join(dir, appName), nil
}

// DBPath returns the full path for the SQLite database file.
func DBPath(appDataDir string) string {
	return filepath.Join(appDataDir, "computo.db")
}
