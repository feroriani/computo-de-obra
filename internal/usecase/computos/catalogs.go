package computos

import (
	"context"
	"errors"

	"changeme/internal/app/dto"
	"changeme/internal/ports"
)

// RubroCatalogGet returns one rubro by id (nil if not found).
func RubroCatalogGet(ctx context.Context, repo ports.RubroCatalogRepository, id string) (*dto.RubroCatalogItemDTO, error) {
	row, err := repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, nil
	}
	return &dto.RubroCatalogItemDTO{ID: row.ID, Nombre: row.Nombre}, nil
}

// RubroCatalogCreate creates a rubro and returns its id.
func RubroCatalogCreate(ctx context.Context, repo ports.RubroCatalogRepository, nombre string) (string, error) {
	return repo.Create(ctx, nombre)
}

// RubroCatalogUpdate updates a rubro.
func RubroCatalogUpdate(ctx context.Context, repo ports.RubroCatalogRepository, id, nombre string) error {
	return repo.Update(ctx, id, nombre)
}

// RubroCatalogDelete deletes a rubro.
func RubroCatalogDelete(ctx context.Context, repo ports.RubroCatalogRepository, id string) error {
	return repo.Delete(ctx, id)
}

// ComponenteMaterialList returns all material components.
func ComponenteMaterialList(ctx context.Context, repo ports.ComponenteMaterialRepository) ([]dto.ComponenteMaterialItemDTO, error) {
	rows, err := repo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ComponenteMaterialItemDTO, len(rows))
	for i := range rows {
		out[i] = dto.ComponenteMaterialItemDTO{
			ID:            rows[i].ID,
			Descripcion:   rows[i].Descripcion,
			Unidad:        rows[i].Unidad,
			CostoCentavos: rows[i].CostoCentavos,
		}
	}
	return out, nil
}

// ComponenteMaterialGet returns one material component by id (nil if not found).
func ComponenteMaterialGet(ctx context.Context, repo ports.ComponenteMaterialRepository, id string) (*dto.ComponenteMaterialItemDTO, error) {
	row, err := repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, nil
	}
	return &dto.ComponenteMaterialItemDTO{
		ID:            row.ID,
		Descripcion:   row.Descripcion,
		Unidad:        row.Unidad,
		CostoCentavos: row.CostoCentavos,
	}, nil
}

// ComponenteMaterialCreate creates a material component and returns its id.
func ComponenteMaterialCreate(ctx context.Context, repo ports.ComponenteMaterialRepository, descripcion, unidad string, costoCentavos int64) (string, error) {
	return repo.Create(ctx, descripcion, unidad, costoCentavos)
}

// ComponenteMaterialUpdate updates a material component.
func ComponenteMaterialUpdate(ctx context.Context, repo ports.ComponenteMaterialRepository, id, descripcion, unidad string, costoCentavos int64) error {
	return repo.Update(ctx, id, descripcion, unidad, costoCentavos)
}

// ComponenteMaterialDelete deletes a material component.
func ComponenteMaterialDelete(ctx context.Context, repo ports.ComponenteMaterialRepository, id string) error {
	return repo.Delete(ctx, id)
}

// ComponenteManoObraList returns all labor components.
func ComponenteManoObraList(ctx context.Context, repo ports.ComponenteManoObraRepository) ([]dto.ComponenteManoObraItemDTO, error) {
	rows, err := repo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ComponenteManoObraItemDTO, len(rows))
	for i := range rows {
		out[i] = dto.ComponenteManoObraItemDTO{
			ID:            rows[i].ID,
			Descripcion:   rows[i].Descripcion,
			Unidad:        rows[i].Unidad,
			CostoCentavos: rows[i].CostoCentavos,
		}
	}
	return out, nil
}

// ComponenteManoObraGet returns one labor component by id (nil if not found).
func ComponenteManoObraGet(ctx context.Context, repo ports.ComponenteManoObraRepository, id string) (*dto.ComponenteManoObraItemDTO, error) {
	row, err := repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, nil
	}
	return &dto.ComponenteManoObraItemDTO{
		ID:            row.ID,
		Descripcion:   row.Descripcion,
		Unidad:        row.Unidad,
		CostoCentavos: row.CostoCentavos,
	}, nil
}

// ComponenteManoObraCreate creates a labor component and returns its id.
func ComponenteManoObraCreate(ctx context.Context, repo ports.ComponenteManoObraRepository, descripcion, unidad string, costoCentavos int64) (string, error) {
	return repo.Create(ctx, descripcion, unidad, costoCentavos)
}

// ComponenteManoObraUpdate updates a labor component.
func ComponenteManoObraUpdate(ctx context.Context, repo ports.ComponenteManoObraRepository, id, descripcion, unidad string, costoCentavos int64) error {
	return repo.Update(ctx, id, descripcion, unidad, costoCentavos)
}

// ComponenteManoObraDelete deletes a labor component.
func ComponenteManoObraDelete(ctx context.Context, repo ports.ComponenteManoObraRepository, id string) error {
	return repo.Delete(ctx, id)
}

// ItemCatalogGet returns one item by id (nil if not found).
func ItemCatalogGet(ctx context.Context, repo ports.ItemRepository, id string) (*dto.ItemCatalogItemDTO, error) {
	row, err := repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, nil
	}
	return &dto.ItemCatalogItemDTO{ID: row.ID, Tarea: row.Tarea, Unidad: row.Unidad}, nil
}

// ItemCatalogCreate creates an item and returns its id.
func ItemCatalogCreate(ctx context.Context, repo ports.ItemRepository, tarea, unidad string) (string, error) {
	return repo.Create(ctx, tarea, unidad)
}

// ItemCatalogUpdate updates an item.
func ItemCatalogUpdate(ctx context.Context, repo ports.ItemRepository, id, tarea, unidad string) error {
	return repo.Update(ctx, id, tarea, unidad)
}

// ItemCatalogDelete deletes an item.
func ItemCatalogDelete(ctx context.Context, repo ports.ItemRepository, id string) error {
	return repo.Delete(ctx, id)
}

// ItemCompositionListMaterials returns material composition for an item.
func ItemCompositionListMaterials(ctx context.Context, repo ports.ItemCompositionRepository, itemID string) ([]dto.ItemMaterialRowDTO, error) {
	rows, err := repo.ListMaterials(ctx, itemID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ItemMaterialRowDTO, len(rows))
	for i := range rows {
		out[i] = dto.ItemMaterialRowDTO{
			ItemID:       rows[i].ItemID,
			ComponenteID: rows[i].ComponenteID,
			Descripcion:  rows[i].Descripcion,
			Unidad:       rows[i].Unidad,
			DosajeMilli:  rows[i].DosajeMilli,
		}
	}
	return out, nil
}

// ItemCompositionListManoObra returns labor composition for an item.
func ItemCompositionListManoObra(ctx context.Context, repo ports.ItemCompositionRepository, itemID string) ([]dto.ItemManoObraRowDTO, error) {
	rows, err := repo.ListManoObra(ctx, itemID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ItemManoObraRowDTO, len(rows))
	for i := range rows {
		out[i] = dto.ItemManoObraRowDTO{
			ItemID:       rows[i].ItemID,
			ComponenteID: rows[i].ComponenteID,
			Descripcion:  rows[i].Descripcion,
			Unidad:       rows[i].Unidad,
			DosajeMilli:  rows[i].DosajeMilli,
		}
	}
	return out, nil
}

// ItemCompositionAddMaterial adds or replaces a material in item composition (dosaje_milli).
func ItemCompositionAddMaterial(ctx context.Context, repo ports.ItemCompositionRepository, itemID, componenteID string, dosajeMilli int64) error {
	if dosajeMilli < 0 {
		return errors.New("dosaje_milli must be >= 0")
	}
	return repo.AddMaterial(ctx, itemID, componenteID, dosajeMilli)
}

// ItemCompositionAddManoObra adds or replaces a labor component in item composition.
func ItemCompositionAddManoObra(ctx context.Context, repo ports.ItemCompositionRepository, itemID, componenteID string, dosajeMilli int64) error {
	if dosajeMilli < 0 {
		return errors.New("dosaje_milli must be >= 0")
	}
	return repo.AddManoObra(ctx, itemID, componenteID, dosajeMilli)
}

// ItemCompositionSetMaterialDosaje updates dosaje_milli for a material in item composition.
func ItemCompositionSetMaterialDosaje(ctx context.Context, repo ports.ItemCompositionRepository, itemID, componenteID string, dosajeMilli int64) error {
	if dosajeMilli < 0 {
		return errors.New("dosaje_milli must be >= 0")
	}
	return repo.SetMaterialDosaje(ctx, itemID, componenteID, dosajeMilli)
}

// ItemCompositionSetManoObraDosaje updates dosaje_milli for a labor component in item composition.
func ItemCompositionSetManoObraDosaje(ctx context.Context, repo ports.ItemCompositionRepository, itemID, componenteID string, dosajeMilli int64) error {
	if dosajeMilli < 0 {
		return errors.New("dosaje_milli must be >= 0")
	}
	return repo.SetManoObraDosaje(ctx, itemID, componenteID, dosajeMilli)
}

// ItemCompositionDeleteMaterial removes a material from item composition.
func ItemCompositionDeleteMaterial(ctx context.Context, repo ports.ItemCompositionRepository, itemID, componenteID string) error {
	return repo.DeleteMaterial(ctx, itemID, componenteID)
}

// ItemCompositionDeleteManoObra removes a labor component from item composition.
func ItemCompositionDeleteManoObra(ctx context.Context, repo ports.ItemCompositionRepository, itemID, componenteID string) error {
	return repo.DeleteManoObra(ctx, itemID, componenteID)
}
