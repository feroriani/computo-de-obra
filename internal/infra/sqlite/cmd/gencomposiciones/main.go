// gencomposiciones reads docs/ITEMS_ASOCIADO_MATERIALES .txt and writes 0008_seed_item_composition.sql.
// It populates item_material and item_mano_obra using dosaje_milli (dosaje × 1000).
// Separator rows with Ref "_" (or Material_id 0) are ignored.
// Run from repo root: go run ./internal/infra/sqlite/cmd/gencomposiciones
package main

import (
	"bufio"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func main() {
	root := findRoot()
	inPath := filepath.Join(root, "docs", "ITEMS_ASOCIADO_MATERIALES .txt")
	outPath := filepath.Join(root, "internal/infra/sqlite/migrations/0008_seed_item_composition.sql")

	f, err := os.Open(inPath)
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

	fmt.Fprintf(out, "-- Composición inicial de ítems (docs/ITEMS_ASOCIADO_MATERIALES .txt).\n")
	fmt.Fprintf(out, "-- Inserta item_material / item_mano_obra con dosaje_milli (×1000). Ignora separadores (_ y ids 0).\n\n")

	sc := bufio.NewScanner(f)
	buf := make([]byte, 0, 64*1024)
	sc.Buffer(buf, 1024*1024)

	lineN := 0
	written := 0
	for sc.Scan() {
		lineN++
		line := strings.TrimPrefix(sc.Text(), "\ufeff")
		line = strings.TrimSuffix(strings.TrimSpace(line), "\r")
		if lineN == 1 {
			// header
			continue
		}
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, ";", 6)
		if len(parts) < 4 {
			continue
		}

		itemID := strings.TrimSpace(parts[0])
		compID := strings.TrimSpace(parts[1])
		dosajeStr := strings.TrimSpace(parts[2])
		ref := strings.TrimSpace(parts[3])

		if ref == "_" || itemID == "0" || compID == "0" {
			continue
		}
		if ref != "ma" && ref != "mo" {
			continue
		}

		dosajeStr = strings.Replace(dosajeStr, ",", ".", 1)
		dosaje, err := strconv.ParseFloat(dosajeStr, 64)
		if err != nil {
			continue
		}
		dosajeMilli := int64(math.Round(dosaje * 1000))
		if dosajeMilli < 0 {
			dosajeMilli = 0
		}

		switch ref {
		case "ma":
			fmt.Fprintf(out, "INSERT OR IGNORE INTO item_material (item_id, componente_id, dosaje_milli) VALUES ('%s', '%s', %d);\n",
				sqlQuote(itemID), sqlQuote(compID), dosajeMilli)
		case "mo":
			fmt.Fprintf(out, "INSERT OR IGNORE INTO item_mano_obra (item_id, componente_id, dosaje_milli) VALUES ('%s', '%s', %d);\n",
				sqlQuote(itemID), sqlQuote(compID), dosajeMilli)
		}
		written++
	}

	if err := sc.Err(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("wrote %d rows -> %s\n", written, outPath)
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

