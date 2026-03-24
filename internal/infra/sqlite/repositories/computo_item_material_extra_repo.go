package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"changeme/internal/ports"
	"github.com/google/uuid"
)

// ComputoItemMaterialExtraRepo implements ports.ComputoItemMaterialExtraRepository using SQLite.
type ComputoItemMaterialExtraRepo struct {
	db *sql.DB
}

// NewComputoItemMaterialExtraRepo returns a new ComputoItemMaterialExtraRepo.
func NewComputoItemMaterialExtraRepo(db *sql.DB) *ComputoItemMaterialExtraRepo {
	return &ComputoItemMaterialExtraRepo{db: db}
}

// ListByVersionItem returns custom material rows for one computo version + item.
func (r *ComputoItemMaterialExtraRepo) ListByVersionItem(ctx context.Context, versionID, itemID string) ([]ports.ComputoItemMaterialExtraRow, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT e.id, e.version_id, e.item_id, e.componente_id, cm.descripcion, cm.unidad, cm.costo_centavos, e.cantidad_milli
		FROM computo_item_material_extra e
		JOIN componente_material cm ON cm.id = e.componente_id
		WHERE e.version_id = ? AND e.item_id = ?
		ORDER BY cm.descripcion ASC
	`, versionID, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ComputoItemMaterialExtraRow
	for rows.Next() {
		var row ports.ComputoItemMaterialExtraRow
		if err := rows.Scan(
			&row.ID,
			&row.VersionID,
			&row.ItemID,
			&row.ComponenteID,
			&row.Descripcion,
			&row.Unidad,
			&row.CostoCentavos,
			&row.CantidadMilli,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// ListByVersion returns all custom material rows for one computo version.
func (r *ComputoItemMaterialExtraRepo) ListByVersion(ctx context.Context, versionID string) ([]ports.ComputoItemMaterialExtraRow, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT e.id, e.version_id, e.item_id, e.componente_id, cm.descripcion, cm.unidad, cm.costo_centavos, e.cantidad_milli
		FROM computo_item_material_extra e
		JOIN componente_material cm ON cm.id = e.componente_id
		WHERE e.version_id = ?
		ORDER BY e.item_id ASC, cm.descripcion ASC
	`, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ComputoItemMaterialExtraRow
	for rows.Next() {
		var row ports.ComputoItemMaterialExtraRow
		if err := rows.Scan(
			&row.ID,
			&row.VersionID,
			&row.ItemID,
			&row.ComponenteID,
			&row.Descripcion,
			&row.Unidad,
			&row.CostoCentavos,
			&row.CantidadMilli,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// Add inserts one custom material row for version + item.
// It fails on duplicates due to UNIQUE(version_id,item_id,componente_id).
func (r *ComputoItemMaterialExtraRepo) Add(ctx context.Context, versionID, itemID, componenteID string, cantidadMilli int64) error {
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO computo_item_material_extra (id, version_id, item_id, componente_id, cantidad_milli, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, uuid.New().String(), versionID, itemID, componenteID, cantidadMilli, now, now)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return errors.New("ese material ya fue agregado para este ítem")
		}
		return err
	}
	return nil
}

// Delete removes a custom material row from version + item.
func (r *ComputoItemMaterialExtraRepo) Delete(ctx context.Context, versionID, itemID, componenteID string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM computo_item_material_extra
		WHERE version_id = ? AND item_id = ? AND componente_id = ?
	`, versionID, itemID, componenteID)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("material extra no encontrado")
	}
	return nil
}

// CopyByVersion copies custom material rows from src version to dst version.
func (r *ComputoItemMaterialExtraRepo) CopyByVersion(ctx context.Context, srcVersionID, dstVersionID string) error {
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	rows, err := r.ListByVersion(ctx, srcVersionID)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if _, err := r.db.ExecContext(ctx, `
			INSERT INTO computo_item_material_extra (id, version_id, item_id, componente_id, cantidad_milli, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, uuid.New().String(), dstVersionID, row.ItemID, row.ComponenteID, row.CantidadMilli, now, now); err != nil {
			return err
		}
	}
	return nil
}
