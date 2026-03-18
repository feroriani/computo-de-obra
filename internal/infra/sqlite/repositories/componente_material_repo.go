package repositories

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"

	"changeme/internal/ports"
)

// ComponenteMaterialRepo implements ports.ComponenteMaterialRepository using SQLite.
type ComponenteMaterialRepo struct {
	db *sql.DB
}

// NewComponenteMaterialRepo returns a new ComponenteMaterialRepo.
func NewComponenteMaterialRepo(db *sql.DB) *ComponenteMaterialRepo {
	return &ComponenteMaterialRepo{db: db}
}

// List returns all material components ordered by descripcion.
func (r *ComponenteMaterialRepo) List(ctx context.Context) ([]ports.ComponenteMaterialRow, error) {
	query := `SELECT id, descripcion, unidad, costo_centavos FROM componente_material ORDER BY descripcion ASC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ComponenteMaterialRow
	for rows.Next() {
		var row ports.ComponenteMaterialRow
		if err := rows.Scan(&row.ID, &row.Descripcion, &row.Unidad, &row.CostoCentavos); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// ListPaged returns a page; q matches descripcion or unidad (substring, case-insensitive).
func (r *ComponenteMaterialRepo) ListPaged(ctx context.Context, q string, limit, offset int) ([]ports.ComponenteMaterialRow, int64, error) {
	where := `(? = '' OR instr(lower(descripcion), lower(?)) > 0 OR instr(lower(unidad), lower(?)) > 0)`
	var total int64
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM componente_material WHERE `+where, q, q, q).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, descripcion, unidad, costo_centavos FROM componente_material WHERE `+where+` ORDER BY descripcion ASC LIMIT ? OFFSET ?`,
		q, q, q, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []ports.ComponenteMaterialRow
	for rows.Next() {
		var row ports.ComponenteMaterialRow
		if err := rows.Scan(&row.ID, &row.Descripcion, &row.Unidad, &row.CostoCentavos); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

// Get returns one material component by id.
func (r *ComponenteMaterialRepo) Get(ctx context.Context, id string) (*ports.ComponenteMaterialRow, error) {
	query := `SELECT id, descripcion, unidad, costo_centavos FROM componente_material WHERE id = ?`
	var row ports.ComponenteMaterialRow
	err := r.db.QueryRowContext(ctx, query, id).Scan(&row.ID, &row.Descripcion, &row.Unidad, &row.CostoCentavos)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// Create inserts a new material component and returns its id.
func (r *ComponenteMaterialRepo) Create(ctx context.Context, descripcion, unidad string, costoCentavos int64) (string, error) {
	id := uuid.New().String()
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z07:00")
	_, err := r.db.ExecContext(ctx, `INSERT INTO componente_material (id, descripcion, unidad, costo_centavos, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		id, descripcion, unidad, costoCentavos, now, now)
	if err != nil {
		return "", err
	}
	return id, nil
}

// Update updates a material component.
func (r *ComponenteMaterialRepo) Update(ctx context.Context, id, descripcion, unidad string, costoCentavos int64) error {
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z07:00")
	res, err := r.db.ExecContext(ctx, `UPDATE componente_material SET descripcion = ?, unidad = ?, costo_centavos = ?, updated_at = ? WHERE id = ?`,
		descripcion, unidad, costoCentavos, now, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Delete removes a material component.
func (r *ComponenteMaterialRepo) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM componente_material WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
