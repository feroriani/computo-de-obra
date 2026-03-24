package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"changeme/internal/ports"
	"github.com/google/uuid"
)

const (
	estadoBorrador   = "borrador"
	estadoConfirmado = "confirmado"
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

// GetHeader returns the header of a computo version by version ID.
func (r *ComputoRepo) GetHeader(ctx context.Context, versionID string) (*ports.ComputoHeader, error) {
	query := `
		SELECT v.id, v.series_id, s.codigo, v.version_n, v.estado, c.descripcion, c.superficie_milli, c.fecha_inicio
		FROM computo_version v
		JOIN computo_series s ON s.id = v.series_id
		JOIN computo_comitente c ON c.version_id = v.id
		WHERE v.id = ?
	`
	var h ports.ComputoHeader
	var fechaInicio string
	err := r.db.QueryRowContext(ctx, query, versionID).Scan(
		&h.VersionID,
		&h.SeriesID,
		&h.Codigo,
		&h.VersionN,
		&h.Estado,
		&h.Descripcion,
		&h.SuperficieMilli,
		&fechaInicio,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if t, err := time.Parse("2006-01-02", fechaInicio); err == nil {
		h.FechaInicio = t
	}
	return &h, nil
}

// UpdateDescripcion updates descripcion/comitente on computo_version and computo_comitente.
func (r *ComputoRepo) UpdateDescripcion(ctx context.Context, versionID string, descripcion string) error {
	descripcion = strings.TrimSpace(descripcion)
	if descripcion == "" {
		return fmt.Errorf("descripción de comitente requerida")
	}
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx,
		`UPDATE computo_version SET descripcion = ?, updated_at = ? WHERE id = ?`,
		descripcion, now, versionID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("versión no encontrada: %s", versionID)
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE computo_comitente SET descripcion = ? WHERE version_id = ?`,
		descripcion, versionID); err != nil {
		return err
	}

	return tx.Commit()
}

// UpdateSuperficie updates superficie_milli on computo_version and computo_comitente.
// If the version is confirmado and has a snapshot, recomputes costo_m2_centavos from snapshot total_centavos.
func (r *ComputoRepo) UpdateSuperficie(ctx context.Context, versionID string, superficieMilli int64) error {
	if superficieMilli <= 0 {
		return fmt.Errorf("superficie debe ser mayor a 0")
	}
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx,
		`UPDATE computo_version SET superficie_milli = ?, updated_at = ? WHERE id = ?`,
		superficieMilli, now, versionID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("versión no encontrada: %s", versionID)
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE computo_comitente SET superficie_milli = ? WHERE version_id = ?`,
		superficieMilli, versionID); err != nil {
		return err
	}

	var totalCentavos int64
	err = tx.QueryRowContext(ctx,
		`SELECT total_centavos FROM computo_snapshot WHERE version_id = ?`, versionID).Scan(&totalCentavos)
	if err == nil {
		costoM2 := int64(0)
		if superficieMilli > 0 {
			costoM2 = (totalCentavos * 1000) / superficieMilli
		}
		if _, err := tx.ExecContext(ctx,
			`UPDATE computo_snapshot SET costo_m2_centavos = ? WHERE version_id = ?`,
			costoM2, versionID); err != nil {
			return err
		}
	} else if err != sql.ErrNoRows {
		return err
	}

	return tx.Commit()
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

// Confirm sets the version to confirmado and persists snapshot (totals + rubros + lineas).
func (r *ComputoRepo) Confirm(ctx context.Context, versionID string, totalMaterial, totalMO, totalCentavos, costoM2 int64, rubros []ports.SnapshotRubroData) error {
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Only borrador can be confirmed
	res, err := tx.ExecContext(ctx,
		`UPDATE computo_version SET estado = ?, confirmed_at = ?, updated_at = ? WHERE id = ? AND estado = ?`,
		estadoConfirmado, now, now, versionID, estadoBorrador)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("version not found or not borrador: %s", versionID)
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO computo_snapshot (version_id, total_material_centavos, total_mo_centavos, total_centavos, costo_m2_centavos) VALUES (?, ?, ?, ?, ?)`,
		versionID, totalMaterial, totalMO, totalCentavos, costoM2); err != nil {
		return err
	}

	for _, rub := range rubros {
		snapRubroID := uuid.New().String()
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO computo_snapshot_rubro (id, version_id, rubro_id, rubro_nombre, orden, total_material_centavos, total_mo_centavos, total_centavos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			snapRubroID, versionID, rub.RubroID, rub.Nombre, rub.Orden, rub.TotalMaterialCentavos, rub.TotalMOCentavos, rub.TotalCentavos); err != nil {
			return err
		}
		for _, lin := range rub.Lineas {
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO computo_snapshot_linea (id, snapshot_rubro_id, item_id, tarea, unidad, cantidad_milli, unit_material_centavos, unit_mo_centavos, line_material_centavos, line_mo_centavos, line_total_centavos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				uuid.New().String(), snapRubroID, lin.ItemID, lin.Tarea, lin.Unidad, lin.CantidadMilli, lin.UnitMaterialCentavos, lin.UnitMOCentavos, lin.LineMaterialCentavos, lin.LineMOCentavos, lin.LineTotalCentavos); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

// GetSnapshotForVersion returns snapshot rubros with lineas for a confirmed version (for clone).
func (r *ComputoRepo) GetSnapshotForVersion(ctx context.Context, versionID string) ([]ports.SnapshotRubroWithLineas, error) {
	rubros, err := r.listSnapshotRubros(ctx, versionID)
	if err != nil {
		return nil, err
	}
	out := make([]ports.SnapshotRubroWithLineas, 0, len(rubros))
	for _, rub := range rubros {
		lineas, err := r.listSnapshotLineas(ctx, rub.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, ports.SnapshotRubroWithLineas{
			ID:                    rub.ID,
			RubroID:               rub.RubroID,
			Nombre:                rub.Nombre,
			Orden:                 rub.Orden,
			TotalMaterialCentavos: rub.TotalMaterialCentavos,
			TotalMOCentavos:       rub.TotalMOCentavos,
			TotalCentavos:         rub.TotalCentavos,
			Lineas:                lineas,
		})
	}
	return out, nil
}

// DeleteSeries deletes a full computo series (CO-xxxx) and all its related rows.
//
// Note: `computo_version.parent_version_id` references `computo_version(id)` without ON DELETE CASCADE,
// so we must set it to NULL before deleting the series.
func (r *ComputoRepo) DeleteSeries(ctx context.Context, seriesID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Break RESTRICT foreign key so we can delete all versions safely.
	if _, err := tx.ExecContext(ctx,
		`UPDATE computo_version SET parent_version_id = NULL WHERE series_id = ?`, seriesID); err != nil {
		return err
	}

	res, err := tx.ExecContext(ctx,
		`DELETE FROM computo_series WHERE id = ?`, seriesID)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("cómputo no encontrado: %s", seriesID)
	}

	return tx.Commit()
}

type snapshotRubroRow struct {
	ID                    string
	RubroID               string
	Nombre                string
	Orden                 int
	TotalMaterialCentavos int64
	TotalMOCentavos       int64
	TotalCentavos         int64
}

func (r *ComputoRepo) listSnapshotRubros(ctx context.Context, versionID string) ([]snapshotRubroRow, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, rubro_id, rubro_nombre, orden, total_material_centavos, total_mo_centavos, total_centavos FROM computo_snapshot_rubro WHERE version_id = ? ORDER BY orden`,
		versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []snapshotRubroRow
	for rows.Next() {
		var row snapshotRubroRow
		if err := rows.Scan(&row.ID, &row.RubroID, &row.Nombre, &row.Orden, &row.TotalMaterialCentavos, &row.TotalMOCentavos, &row.TotalCentavos); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *ComputoRepo) listSnapshotLineas(ctx context.Context, snapshotRubroID string) ([]ports.SnapshotLineaRow, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT item_id, tarea, unidad, cantidad_milli, unit_material_centavos, unit_mo_centavos, line_material_centavos, line_mo_centavos, line_total_centavos FROM computo_snapshot_linea WHERE snapshot_rubro_id = ?`,
		snapshotRubroID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.SnapshotLineaRow
	for rows.Next() {
		var row ports.SnapshotLineaRow
		if err := rows.Scan(&row.ItemID, &row.Tarea, &row.Unidad, &row.CantidadMilli, &row.UnitMaterialCentavos, &row.UnitMOCentavos, &row.LineMaterialCentavos, &row.LineMOCentavos, &row.LineTotalCentavos); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// CreateNewVersionFrom clones a confirmed version into a new borrador (from snapshot).
func (r *ComputoRepo) CreateNewVersionFrom(ctx context.Context, versionIDConfirmado string) (*ports.ComputoVersionRow, error) {
	header, err := r.GetHeader(ctx, versionIDConfirmado)
	if err != nil || header == nil {
		return nil, fmt.Errorf("version not found: %s", versionIDConfirmado)
	}
	if header.Estado != estadoConfirmado {
		return nil, fmt.Errorf("version is not confirmado: %s", versionIDConfirmado)
	}

	snap, err := r.GetSnapshotForVersion(ctx, versionIDConfirmado)
	if err != nil {
		return nil, err
	}

	var nextVersionN int
	err = r.db.QueryRowContext(ctx,
		`SELECT COALESCE(MAX(version_n), 0) + 1 FROM computo_version WHERE series_id = ?`, header.SeriesID).Scan(&nextVersionN)
	if err != nil {
		return nil, err
	}

	newVersionID := uuid.New().String()
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	fechaInicio := header.FechaInicio.Format("2006-01-02")

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO computo_version (id, series_id, version_n, parent_version_id, estado, descripcion, superficie_milli, fecha_inicio, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		newVersionID, header.SeriesID, nextVersionN, versionIDConfirmado, estadoBorrador, header.Descripcion, header.SuperficieMilli, fechaInicio, now, now); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO computo_comitente (version_id, descripcion, superficie_milli, fecha_inicio) VALUES (?, ?, ?, ?)`,
		newVersionID, header.Descripcion, header.SuperficieMilli, fechaInicio); err != nil {
		return nil, err
	}

	for _, rub := range snap {
		computoRubroID := uuid.New().String()
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO computo_rubro (id, version_id, rubro_id, orden, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
			computoRubroID, newVersionID, rub.RubroID, rub.Orden, now, now); err != nil {
			return nil, err
		}
		for _, lin := range rub.Lineas {
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO computo_rubro_item (id, computo_rubro_id, item_id, cantidad_milli, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
				uuid.New().String(), computoRubroID, lin.ItemID, lin.CantidadMilli, now, now); err != nil {
				return nil, err
			}
		}
	}

	extraRows, err := tx.QueryContext(ctx, `
		SELECT item_id, componente_id, cantidad_milli
		FROM computo_item_material_extra
		WHERE version_id = ?
	`, versionIDConfirmado)
	if err != nil {
		return nil, err
	}
	for extraRows.Next() {
		var itemID string
		var componenteID string
		var cantidadMilli int64
		if err := extraRows.Scan(&itemID, &componenteID, &cantidadMilli); err != nil {
			_ = extraRows.Close()
			return nil, err
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO computo_item_material_extra (id, version_id, item_id, componente_id, cantidad_milli, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, uuid.New().String(), newVersionID, itemID, componenteID, cantidadMilli, now, now); err != nil {
			_ = extraRows.Close()
			return nil, err
		}
	}
	if err := extraRows.Err(); err != nil {
		_ = extraRows.Close()
		return nil, err
	}
	if err := extraRows.Close(); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	var codigo string
	if err := r.db.QueryRowContext(ctx, `SELECT codigo FROM computo_series WHERE id = ?`, header.SeriesID).Scan(&codigo); err != nil {
		return nil, err
	}

	return &ports.ComputoVersionRow{
		VersionID: newVersionID,
		SeriesID:  header.SeriesID,
		Codigo:    codigo,
		VersionN:  nextVersionN,
		Estado:    estadoBorrador,
	}, nil
}
