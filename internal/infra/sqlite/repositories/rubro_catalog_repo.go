package repositories

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"

	"changeme/internal/ports"
)

// RubroCatalogRepo implements ports.RubroCatalogRepository using SQLite.
type RubroCatalogRepo struct {
	db *sql.DB
}

// NewRubroCatalogRepo returns a new RubroCatalogRepo.
func NewRubroCatalogRepo(db *sql.DB) *RubroCatalogRepo {
	return &RubroCatalogRepo{db: db}
}

// List returns all rubros from the global catalog ordered by nombre.
func (r *RubroCatalogRepo) List(ctx context.Context) ([]ports.RubroCatalogRow, error) {
	query := `SELECT id, nombre FROM rubro ORDER BY nombre ASC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.RubroCatalogRow
	for rows.Next() {
		var row ports.RubroCatalogRow
		if err := rows.Scan(&row.ID, &row.Nombre); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// ListPaged returns a page of rubros matching q (substring on nombre); total is full count for the filter.
func (r *RubroCatalogRepo) ListPaged(ctx context.Context, q string, limit, offset int) ([]ports.RubroCatalogRow, int64, error) {
	where := `(? = '' OR instr(lower(nombre), lower(?)) > 0)`
	var total int64
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM rubro WHERE `+where, q, q).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, nombre FROM rubro WHERE `+where+` ORDER BY nombre ASC LIMIT ? OFFSET ?`,
		q, q, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []ports.RubroCatalogRow
	for rows.Next() {
		var row ports.RubroCatalogRow
		if err := rows.Scan(&row.ID, &row.Nombre); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

// Get returns one rubro by id.
func (r *RubroCatalogRepo) Get(ctx context.Context, id string) (*ports.RubroCatalogRow, error) {
	query := `SELECT id, nombre FROM rubro WHERE id = ?`
	var row ports.RubroCatalogRow
	err := r.db.QueryRowContext(ctx, query, id).Scan(&row.ID, &row.Nombre)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// Create inserts a new rubro and returns its id.
func (r *RubroCatalogRepo) Create(ctx context.Context, nombre string) (string, error) {
	id := uuid.New().String()
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z07:00")
	_, err := r.db.ExecContext(ctx, `INSERT INTO rubro (id, nombre, created_at, updated_at) VALUES (?, ?, ?, ?)`, id, nombre, now, now)
	if err != nil {
		return "", err
	}
	return id, nil
}

// Update updates a rubro's nombre.
func (r *RubroCatalogRepo) Update(ctx context.Context, id, nombre string) error {
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z07:00")
	res, err := r.db.ExecContext(ctx, `UPDATE rubro SET nombre = ?, updated_at = ? WHERE id = ?`, nombre, now, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Delete removes a rubro.
func (r *RubroCatalogRepo) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM rubro WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
