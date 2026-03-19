package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"changeme/internal/ports"
	"github.com/google/uuid"
)

// ComputoRubroRepo implements ports.ComputoRubroRepository using SQLite.
type ComputoRubroRepo struct {
	db *sql.DB
}

// NewComputoRubroRepo returns a new ComputoRubroRepo.
func NewComputoRubroRepo(db *sql.DB) *ComputoRubroRepo {
	return &ComputoRubroRepo{db: db}
}

// ListByVersion returns rubros of the given version ordered by orden.
func (r *ComputoRubroRepo) ListByVersion(ctx context.Context, versionID string) ([]ports.ComputoRubroRow, error) {
	query := `
		SELECT cr.id, cr.rubro_id, rub.nombre, cr.orden
		FROM computo_rubro cr
		JOIN rubro rub ON rub.id = cr.rubro_id
		WHERE cr.version_id = ?
		ORDER BY cr.orden ASC
	`
	rows, err := r.db.QueryContext(ctx, query, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ComputoRubroRow
	for rows.Next() {
		var row ports.ComputoRubroRow
		if err := rows.Scan(&row.ID, &row.RubroID, &row.Nombre, &row.Orden); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// Add adds a rubro to the computo version with next orden. Returns the new computo_rubro id.
func (r *ComputoRubroRepo) Add(ctx context.Context, versionID, rubroID string) (string, error) {
	var maxOrden sql.NullInt64
	err := r.db.QueryRowContext(ctx, `SELECT MAX(orden) FROM computo_rubro WHERE version_id = ?`, versionID).Scan(&maxOrden)
	if err != nil {
		return "", err
	}
	orden := 1
	if maxOrden.Valid {
		orden = int(maxOrden.Int64) + 1
	}
	id := uuid.New().String()
	nowStr := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO computo_rubro (id, version_id, rubro_id, orden, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		id, versionID, rubroID, orden, nowStr, nowStr)
	if err != nil {
		return "", err
	}
	return id, nil
}

// Reorder updates the orden of computo rubros to match the given computoRubroIDs order (index = orden).
func (r *ComputoRubroRepo) Reorder(ctx context.Context, versionID string, computoRubroIDs []string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i, crID := range computoRubroIDs {
		_, err := tx.ExecContext(ctx, `UPDATE computo_rubro SET orden = ? WHERE id = ? AND version_id = ?`, i, crID, versionID)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// Delete removes a computo_rubro from a draft version if it has no items (active or trashed).
func (r *ComputoRubroRepo) Delete(ctx context.Context, computoRubroID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var versionID string
	var estado string
	var orden int
	err = tx.QueryRowContext(ctx, `
		SELECT cr.version_id, cv.estado, cr.orden
		FROM computo_rubro cr
		JOIN computo_version cv ON cv.id = cr.version_id
		WHERE cr.id = ?
	`, computoRubroID).Scan(&versionID, &estado, &orden)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("rubro no encontrado: %s", computoRubroID)
		}
		return err
	}
	if estado != "borrador" {
		return fmt.Errorf("solo se puede eliminar rubros en borrador: %s", computoRubroID)
	}

	var cnt int64
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(1) FROM computo_rubro_item WHERE computo_rubro_id = ?`, computoRubroID).Scan(&cnt); err != nil {
		return err
	}
	if cnt > 0 {
		return fmt.Errorf("no se puede eliminar el rubro: tiene ítems asociados")
	}

	res, err := tx.ExecContext(ctx, `DELETE FROM computo_rubro WHERE id = ?`, computoRubroID)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return fmt.Errorf("rubro no encontrado: %s", computoRubroID)
	}

	// Compact ordens for the remaining rubros in the version.
	_, err = tx.ExecContext(ctx, `UPDATE computo_rubro SET orden = orden - 1 WHERE version_id = ? AND orden > ?`, versionID, orden)
	if err != nil {
		return err
	}

	return tx.Commit()
}
