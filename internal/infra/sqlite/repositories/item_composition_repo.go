package repositories

import (
	"context"
	"database/sql"

	"changeme/internal/ports"
)

// ItemCompositionRepo implements ports.ItemCompositionRepository using SQLite.
type ItemCompositionRepo struct {
	db *sql.DB
}

// NewItemCompositionRepo returns a new ItemCompositionRepo.
func NewItemCompositionRepo(db *sql.DB) *ItemCompositionRepo {
	return &ItemCompositionRepo{db: db}
}

// ListMaterials returns material components for an item (with descripcion, unidad from componente_material).
func (r *ItemCompositionRepo) ListMaterials(ctx context.Context, itemID string) ([]ports.ItemMaterialRow, error) {
	query := `
		SELECT im.item_id, im.componente_id, cm.descripcion, cm.unidad, im.dosaje_milli
		FROM item_material im
		JOIN componente_material cm ON cm.id = im.componente_id
		WHERE im.item_id = ?
		ORDER BY cm.descripcion ASC
	`
	rows, err := r.db.QueryContext(ctx, query, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ItemMaterialRow
	for rows.Next() {
		var row ports.ItemMaterialRow
		if err := rows.Scan(&row.ItemID, &row.ComponenteID, &row.Descripcion, &row.Unidad, &row.DosajeMilli); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// ListManoObra returns labor components for an item.
func (r *ItemCompositionRepo) ListManoObra(ctx context.Context, itemID string) ([]ports.ItemManoObraRow, error) {
	query := `
		SELECT imo.item_id, imo.componente_id, cmo.descripcion, cmo.unidad, imo.dosaje_milli
		FROM item_mano_obra imo
		JOIN componente_mano_obra cmo ON cmo.id = imo.componente_id
		WHERE imo.item_id = ?
		ORDER BY cmo.descripcion ASC
	`
	rows, err := r.db.QueryContext(ctx, query, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ports.ItemManoObraRow
	for rows.Next() {
		var row ports.ItemManoObraRow
		if err := rows.Scan(&row.ItemID, &row.ComponenteID, &row.Descripcion, &row.Unidad, &row.DosajeMilli); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// AddMaterial inserts or replaces item_material (dosaje_milli). Uses INSERT OR REPLACE for upsert.
func (r *ItemCompositionRepo) AddMaterial(ctx context.Context, itemID, componenteID string, dosajeMilli int64) error {
	_, err := r.db.ExecContext(ctx, `INSERT OR REPLACE INTO item_material (item_id, componente_id, dosaje_milli) VALUES (?, ?, ?)`, itemID, componenteID, dosajeMilli)
	return err
}

// AddManoObra inserts or replaces item_mano_obra (dosaje_milli).
func (r *ItemCompositionRepo) AddManoObra(ctx context.Context, itemID, componenteID string, dosajeMilli int64) error {
	_, err := r.db.ExecContext(ctx, `INSERT OR REPLACE INTO item_mano_obra (item_id, componente_id, dosaje_milli) VALUES (?, ?, ?)`, itemID, componenteID, dosajeMilli)
	return err
}

// SetMaterialDosaje updates dosaje_milli for an existing item_material row.
func (r *ItemCompositionRepo) SetMaterialDosaje(ctx context.Context, itemID, componenteID string, dosajeMilli int64) error {
	res, err := r.db.ExecContext(ctx, `UPDATE item_material SET dosaje_milli = ? WHERE item_id = ? AND componente_id = ?`, dosajeMilli, itemID, componenteID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// SetManoObraDosaje updates dosaje_milli for an existing item_mano_obra row.
func (r *ItemCompositionRepo) SetManoObraDosaje(ctx context.Context, itemID, componenteID string, dosajeMilli int64) error {
	res, err := r.db.ExecContext(ctx, `UPDATE item_mano_obra SET dosaje_milli = ? WHERE item_id = ? AND componente_id = ?`, dosajeMilli, itemID, componenteID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeleteMaterial removes a material from item composition.
func (r *ItemCompositionRepo) DeleteMaterial(ctx context.Context, itemID, componenteID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM item_material WHERE item_id = ? AND componente_id = ?`, itemID, componenteID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeleteManoObra removes a labor component from item composition.
func (r *ItemCompositionRepo) DeleteManoObra(ctx context.Context, itemID, componenteID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM item_mano_obra WHERE item_id = ? AND componente_id = ?`, itemID, componenteID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
