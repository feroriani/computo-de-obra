package repositories

import (
	"context"
	"database/sql"
	"time"

	"changeme/internal/ports"
	"github.com/google/uuid"
)

// ComputoRubroItemRepo implements ports.ComputoRubroItemRepository using SQLite.
type ComputoRubroItemRepo struct {
	db *sql.DB
}

// NewComputoRubroItemRepo returns a new ComputoRubroItemRepo.
func NewComputoRubroItemRepo(db *sql.DB) *ComputoRubroItemRepo {
	return &ComputoRubroItemRepo{db: db}
}

// ListByComputoRubro returns non-deleted items of the computo rubro.
func (r *ComputoRubroItemRepo) ListByComputoRubro(ctx context.Context, computoRubroID string) ([]ports.ComputoRubroItemRow, error) {
	query := `
		SELECT cri.id, cri.item_id, i.tarea, i.unidad, cri.cantidad_milli
		FROM computo_rubro_item cri
		JOIN item i ON i.id = cri.item_id
		WHERE cri.computo_rubro_id = ? AND cri.deleted_at IS NULL
		ORDER BY cri.created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, computoRubroID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ComputoRubroItemRow
	for rows.Next() {
		var row ports.ComputoRubroItemRow
		if err := rows.Scan(&row.ID, &row.ItemID, &row.Tarea, &row.Unidad, &row.CantidadMilli); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// ListTrashedByComputoRubro returns deleted items of the computo rubro.
func (r *ComputoRubroItemRepo) ListTrashedByComputoRubro(ctx context.Context, computoRubroID string) ([]ports.ComputoRubroItemRowTrashed, error) {
	query := `
		SELECT cri.id, cri.item_id, i.tarea, i.unidad, cri.cantidad_milli
		FROM computo_rubro_item cri
		JOIN item i ON i.id = cri.item_id
		WHERE cri.computo_rubro_id = ? AND cri.deleted_at IS NOT NULL
		ORDER BY cri.deleted_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, computoRubroID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ComputoRubroItemRowTrashed
	for rows.Next() {
		var row ports.ComputoRubroItemRowTrashed
		if err := rows.Scan(&row.ID, &row.ItemID, &row.Tarea, &row.Unidad, &row.CantidadMilli); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// Add adds an item to the computo rubro. Default cantidad_milli is 0 if not specified; we use the param.
func (r *ComputoRubroItemRepo) Add(ctx context.Context, computoRubroID, itemID string, cantidadMilli int64) (string, error) {
	id := uuid.New().String()
	nowStr := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO computo_rubro_item (id, computo_rubro_id, item_id, cantidad_milli, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		id, computoRubroID, itemID, cantidadMilli, nowStr, nowStr)
	if err != nil {
		return "", err
	}
	return id, nil
}

// SetCantidad updates the cantidad_milli of a computo rubro item.
func (r *ComputoRubroItemRepo) SetCantidad(ctx context.Context, computoRubroItemID string, cantidadMilli int64) error {
	nowStr := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	_, err := r.db.ExecContext(ctx,
		`UPDATE computo_rubro_item SET cantidad_milli = ?, updated_at = ? WHERE id = ?`, cantidadMilli, nowStr, computoRubroItemID)
	return err
}

// Trash soft-deletes a computo rubro item (sets deleted_at).
func (r *ComputoRubroItemRepo) Trash(ctx context.Context, computoRubroItemID string) error {
	nowStr := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	_, err := r.db.ExecContext(ctx,
		`UPDATE computo_rubro_item SET deleted_at = ?, updated_at = ? WHERE id = ?`, nowStr, nowStr, computoRubroItemID)
	return err
}

// Restore clears deleted_at for a computo rubro item.
func (r *ComputoRubroItemRepo) Restore(ctx context.Context, computoRubroItemID string) error {
	nowStr := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	_, err := r.db.ExecContext(ctx,
		`UPDATE computo_rubro_item SET deleted_at = NULL, updated_at = ? WHERE id = ?`, nowStr, computoRubroItemID)
	return err
}

// PurgeTrashedByComputoRubro permanently deletes trashed items of a computo rubro.
func (r *ComputoRubroItemRepo) PurgeTrashedByComputoRubro(ctx context.Context, computoRubroID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM computo_rubro_item WHERE computo_rubro_id = ? AND deleted_at IS NOT NULL`,
		computoRubroID,
	)
	return err
}
