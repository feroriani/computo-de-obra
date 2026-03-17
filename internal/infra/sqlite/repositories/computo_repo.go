package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"changeme/internal/ports"
	"github.com/google/uuid"
)

// ComputoRepo implements ports.ComputoRepository using SQLite.
type ComputoRepo struct {
	db *sql.DB
}

// NewComputoRepo returns a new ComputoRepo.
func NewComputoRepo(db *sql.DB) *ComputoRepo {
	return &ComputoRepo{db: db}
}

// List returns all computo versions with header and optional snapshot totals.
func (r *ComputoRepo) List(ctx context.Context) ([]ports.ComputoListRow, error) {
	query := `
		SELECT 
			v.id AS version_id,
			s.id AS series_id,
			s.codigo,
			v.version_n,
			v.estado,
			c.descripcion,
			c.fecha_inicio,
			c.superficie_milli,
			snap.total_centavos,
			snap.costo_m2_centavos
		FROM computo_version v
		JOIN computo_series s ON s.id = v.series_id
		JOIN computo_comitente c ON c.version_id = v.id
		LEFT JOIN computo_snapshot snap ON snap.version_id = v.id
		ORDER BY v.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ComputoListRow
	for rows.Next() {
		var row ports.ComputoListRow
		var fechaInicio string
		var totalCentavos, costoM2 sql.NullInt64
		err := rows.Scan(
			&row.VersionID,
			&row.SeriesID,
			&row.Codigo,
			&row.VersionN,
			&row.Estado,
			&row.Descripcion,
			&fechaInicio,
			&row.SuperficieMilli,
			&totalCentavos,
			&costoM2,
		)
		if err != nil {
			return nil, err
		}
		if t, err := time.Parse("2006-01-02", fechaInicio); err == nil {
			row.FechaInicio = t
		}
		if totalCentavos.Valid {
			row.TotalCentavos = &totalCentavos.Int64
		}
		if costoM2.Valid {
			row.CostoM2Centavos = &costoM2.Int64
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// Create creates a new series and its first version (borrador).
func (r *ComputoRepo) Create(ctx context.Context, in ports.ComputoCreateInput) (*ports.ComputoVersionRow, error) {
	seriesID := uuid.New().String()
	versionID := uuid.New().String()
	codigo, err := r.nextCodigo(ctx)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	fechaInicio := in.FechaInicio.Format("2006-01-02")

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO computo_series (id, codigo, created_at, updated_at) VALUES (?, ?, ?, ?)`,
		seriesID, codigo, now, now); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO computo_version (id, series_id, version_n, parent_version_id, estado, descripcion, superficie_milli, fecha_inicio, created_at, updated_at) VALUES (?, ?, 1, NULL, 'borrador', ?, ?, ?, ?, ?)`,
		versionID, seriesID, in.Descripcion, in.SuperficieMilli, fechaInicio, now, now); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO computo_comitente (version_id, descripcion, superficie_milli, fecha_inicio) VALUES (?, ?, ?, ?)`,
		versionID, in.Descripcion, in.SuperficieMilli, fechaInicio); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &ports.ComputoVersionRow{
		VersionID: versionID,
		SeriesID:  seriesID,
		Codigo:    codigo,
		VersionN:  1,
		Estado:    "borrador",
	}, nil
}

func (r *ComputoRepo) nextCodigo(ctx context.Context) (string, error) {
	var n int
	err := r.db.QueryRowContext(ctx,
		`SELECT COALESCE(MAX(CAST(SUBSTR(codigo, 4) AS INTEGER)), 0) + 1 FROM computo_series WHERE codigo LIKE 'CO-%'`).Scan(&n)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("CO-%06d", n), nil
}
