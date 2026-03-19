// genitems reads docs/ITEMS_.txt and writes 0005_seed_items_catalog.sql.
// Run from repo root: go run ./internal/infra/sqlite/cmd/genitems
package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func main() {
	root := findRoot()
	itemsPath := filepath.Join(root, "docs", "ITEMS_.txt")
	outPath := filepath.Join(root, "internal/infra/sqlite/migrations/0005_seed_items_catalog.sql")

	f, err := os.Open(itemsPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer f.Close()

	out, err := os.Create(outPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer out.Close()

	fmt.Fprintf(out, "-- Catálogo inicial de ítems (docs/ITEMS_.txt). id = código numérico del archivo.\n\n")

	sc := bufio.NewScanner(f)
	buf := make([]byte, 0, 64*1024)
	sc.Buffer(buf, 1024*1024)

	n := 0
	for sc.Scan() {
		line := strings.TrimPrefix(sc.Text(), "\ufeff")
		line = strings.TrimSuffix(strings.TrimSpace(line), "\r")
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ";", 3)
		if len(parts) != 3 {
			fmt.Fprintf(os.Stderr, "skip bad line %d: %q\n", n+1, line[:min(80, len(line))])
			continue
		}
		idNum, err := strconv.Atoi(strings.TrimSpace(parts[0]))
		if err != nil {
			fmt.Fprintf(os.Stderr, "skip bad id: %q\n", parts[0])
			continue
		}
		tarea := strings.TrimSpace(parts[1])
		unidad := strings.TrimSpace(parts[2])
		id := strconv.Itoa(idNum)
		fmt.Fprintf(out, "INSERT OR IGNORE INTO item (id, tarea, unidad, created_at, updated_at) VALUES ('%s', '%s', '%s', '2025-03-17T00:00:00Z', '2025-03-17T00:00:00Z');\n",
			id, sqlQuote(tarea), sqlQuote(unidad))
		n++
	}
	if err := sc.Err(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("wrote %d rows -> %s\n", n, outPath)
}

func sqlQuote(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func findRoot() string {
	dir, _ := os.Getwd()
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "."
		}
		dir = parent
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
