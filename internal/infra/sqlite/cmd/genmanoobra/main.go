// genmanoobra reads docs/MANODEOBRA.txt and writes 0006_seed_componente_mano_obra.sql.
// Format per line: id;descripcion;unidad;costo (costo en pesos, coma o punto decimal).
// Run from repo root: go run ./internal/infra/sqlite/cmd/genmanoobra
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
	inPath := filepath.Join(root, "docs", "MANODEOBRA.txt")
	outPath := filepath.Join(root, "internal/infra/sqlite/migrations/0006_seed_componente_mano_obra.sql")

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

	fmt.Fprintf(out, "-- Catálogo inicial mano de obra (docs/MANODEOBRA.txt). costo_centavos = pesos × 100.\n")
	fmt.Fprintf(out, "-- id = código numérico del archivo.\n\n")

	sc := bufio.NewScanner(f)
	n := 0
	for sc.Scan() {
		line := strings.TrimPrefix(sc.Text(), "\ufeff")
		line = strings.TrimSuffix(strings.TrimSpace(line), "\r")
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ";", 4)
		if len(parts) != 4 {
			fmt.Fprintf(os.Stderr, "skip line %d (need 4 fields): %q\n", n+1, line)
			continue
		}
		idNum, err := strconv.Atoi(strings.TrimSpace(parts[0]))
		if err != nil {
			fmt.Fprintf(os.Stderr, "skip bad id: %q\n", parts[0])
			continue
		}
		desc := strings.TrimSpace(parts[1])
		unidad := strings.TrimSpace(parts[2])
		costoStr := strings.TrimSpace(strings.Replace(parts[3], ",", ".", 1))
		pesos, err := strconv.ParseFloat(costoStr, 64)
		if err != nil {
			fmt.Fprintf(os.Stderr, "skip bad costo %q\n", parts[3])
			continue
		}
		centavos := int64(math.Round(pesos * 100))
		if centavos < 0 {
			centavos = 0
		}
		id := strconv.Itoa(idNum)
		fmt.Fprintf(out, "INSERT OR IGNORE INTO componente_mano_obra (id, descripcion, unidad, costo_centavos, created_at, updated_at) VALUES ('%s', '%s', '%s', %d, '2025-03-17T00:00:00Z', '2025-03-17T00:00:00Z');\n",
			id, sqlQuote(desc), sqlQuote(unidad), centavos)
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
