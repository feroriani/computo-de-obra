package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"changeme/internal/ports"
)

// ItemRepo implements ports.ItemRepository using SQLite.
type ItemRepo struct {
	db *sql.DB
}

// NewItemRepo returns a new ItemRepo.
func NewItemRepo(db *sql.DB) *ItemRepo {
	return &ItemRepo{db: db}
}

// ListCatalog returns all items from the global catalog ordered by tarea.
func (r *ItemRepo) ListCatalog(ctx context.Context) ([]ports.ItemCatalogRow, error) {
	query := `SELECT id, tarea, unidad FROM item ORDER BY tarea ASC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ItemCatalogRow
	for rows.Next() {
		var row ports.ItemCatalogRow
		if err := rows.Scan(&row.ID, &row.Tarea, &row.Unidad); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// ListCatalogPaged returns a page of items; q matches tarea or unidad (substring, case-insensitive).
func (r *ItemRepo) ListCatalogPaged(ctx context.Context, q string, limit, offset int) ([]ports.ItemCatalogRow, int64, error) {
	where := `(? = '' OR instr(lower(tarea), lower(?)) > 0 OR instr(lower(unidad), lower(?)) > 0)`
	var total int64
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM item WHERE `+where, q, q, q).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, tarea, unidad FROM item WHERE `+where+` ORDER BY tarea ASC LIMIT ? OFFSET ?`,
		q, q, q, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []ports.ItemCatalogRow
	for rows.Next() {
		var row ports.ItemCatalogRow
		if err := rows.Scan(&row.ID, &row.Tarea, &row.Unidad); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

// Get returns one item by id.
func (r *ItemRepo) Get(ctx context.Context, id string) (*ports.ItemCatalogRow, error) {
	query := `SELECT id, tarea, unidad FROM item WHERE id = ?`
	var row ports.ItemCatalogRow
	err := r.db.QueryRowContext(ctx, query, id).Scan(&row.ID, &row.Tarea, &row.Unidad)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// GetUnitCosts returns material and MO cost per unit of item (centavos).
// Formula: sum(dosaje_milli * costo_centavos / 1000) for materials and MO.
func (r *ItemRepo) GetUnitCosts(ctx context.Context, itemID string) (ports.ItemUnitCosts, error) {
	var out ports.ItemUnitCosts
	matQuery := `
		SELECT COALESCE(SUM(im.dosaje_milli * cm.costo_centavos / 1000), 0)
		FROM item_material im
		JOIN componente_material cm ON cm.id = im.componente_id
		WHERE im.item_id = ?
	`
	if err := r.db.QueryRowContext(ctx, matQuery, itemID).Scan(&out.MaterialCentavos); err != nil && err != sql.ErrNoRows {
		return out, err
	}
	moQuery := `
		SELECT COALESCE(SUM(imo.dosaje_milli * cmo.costo_centavos / 1000), 0)
		FROM item_mano_obra imo
		JOIN componente_mano_obra cmo ON cmo.id = imo.componente_id
		WHERE imo.item_id = ?
	`
	if err := r.db.QueryRowContext(ctx, moQuery, itemID).Scan(&out.MOCentavos); err != nil && err != sql.ErrNoRows {
		return out, err
	}
	return out, nil
}

// Create inserts a new item and returns its id.
func (r *ItemRepo) Create(ctx context.Context, tarea, unidad string) (string, error) {
	id := uuid.New().String()
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z07:00")
	_, err := r.db.ExecContext(ctx, `INSERT INTO item (id, tarea, unidad, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`, id, tarea, unidad, now, now)
	if err != nil {
		return "", err
	}
	return id, nil
}

// Update updates an item's tarea and unidad.
func (r *ItemRepo) Update(ctx context.Context, id, tarea, unidad string) error {
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z07:00")
	res, err := r.db.ExecContext(ctx, `UPDATE item SET tarea = ?, unidad = ?, updated_at = ? WHERE id = ?`, tarea, unidad, now, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Delete removes an item. Fails if the item is still used in any cómputo (líneas activas).
// Líneas solo en papelera (deleted_at no nulo) se eliminan automáticamente antes de borrar el ítem.
func (r *ItemRepo) Delete(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var active int
	if err := tx.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM computo_rubro_item WHERE item_id = ? AND deleted_at IS NULL`, id).Scan(&active); err != nil {
		return err
	}
	if active > 0 {
		return errors.New("el ítem sigue en uso en uno o más cómputos; quitálo de los rubros o enviálo a la papelera antes de eliminarlo del catálogo")
	}

	if _, err := tx.ExecContext(ctx,
		`DELETE FROM computo_rubro_item WHERE item_id = ? AND deleted_at IS NOT NULL`, id); err != nil {
		return fmt.Errorf("eliminar líneas en papelera: %w", err)
	}

	res, err := tx.ExecContext(ctx, `DELETE FROM item WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return tx.Commit()
}
