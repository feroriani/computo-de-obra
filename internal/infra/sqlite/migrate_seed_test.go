package sqlite_test

import (
	"path/filepath"
	"testing"

	"changeme/internal/infra/sqlite"
)

func TestMigrationIncludesSeedRubros(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "t.db")
	db, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM rubro`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 23 {
		t.Fatalf("expected 23 seed rubros, got %d", n)
	}
	var items int
	if err := db.QueryRow(`SELECT COUNT(*) FROM item`).Scan(&items); err != nil {
		t.Fatal(err)
	}
	if items != 408 {
		t.Fatalf("expected 408 seed items (ITEMS_.txt), got %d", items)
	}
	var mo int
	if err := db.QueryRow(`SELECT COUNT(*) FROM componente_mano_obra`).Scan(&mo); err != nil {
		t.Fatal(err)
	}
	if mo != 3 {
		t.Fatalf("expected 3 seed mano de obra (docs/MANODEOBRA.txt), got %d", mo)
	}

	var mats int
	if err := db.QueryRow(`SELECT COUNT(*) FROM componente_material`).Scan(&mats); err != nil {
		t.Fatal(err)
	}
	if mats != 674 {
		t.Fatalf("expected 674 seed materiales (docs/MATERIALES.txt), got %d", mats)
	}

	var itemMat int
	if err := db.QueryRow(`SELECT COUNT(*) FROM item_material`).Scan(&itemMat); err != nil {
		t.Fatal(err)
	}
	if itemMat != 1235 {
		t.Fatalf("expected 1235 item->material asociaciones, got %d", itemMat)
	}

	var itemMO int
	if err := db.QueryRow(`SELECT COUNT(*) FROM item_mano_obra`).Scan(&itemMO); err != nil {
		t.Fatal(err)
	}
	if itemMO != 745 {
		t.Fatalf("expected 745 item->mano de obra asociaciones (unique), got %d", itemMO)
	}
}

func TestSeedRubrosIdempotentByNombre(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "t2.db")
	db, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	db.Close()

	// Second open: migration 0004 already applied; count still 23
	db2, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db2.Close()
	var n int
	db2.QueryRow(`SELECT COUNT(*) FROM rubro`).Scan(&n)
	if n != 23 {
		t.Fatalf("after reopen expected 23 rubros, got %d", n)
	}

	// Manual insert same nombre should not be duplicated by migration (already applied)
	_, _ = db2.Exec(`INSERT INTO rubro VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee','OTRO','x','x')`)
	var n2 int
	db2.QueryRow(`SELECT COUNT(*) FROM rubro`).Scan(&n2)
	if n2 != 24 {
		t.Fatalf("expected 24 after manual insert, got %d", n2)
	}
}
