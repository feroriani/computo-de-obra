package computos

import (
	"context"

	"changeme/internal/app/dto"
	"changeme/internal/ports"
)

// RubroCatalogList returns the global rubro catalog for selectors.
func RubroCatalogList(ctx context.Context, repo ports.RubroCatalogRepository) ([]dto.RubroCatalogItemDTO, error) {
	rows, err := repo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]dto.RubroCatalogItemDTO, len(rows))
	for i := range rows {
		out[i] = dto.RubroCatalogItemDTO{ID: rows[i].ID, Nombre: rows[i].Nombre}
	}
	return out, nil
}

// ComputoRubrosAdd adds a rubro to the computo version. Returns the new computo_rubro id.
func ComputoRubrosAdd(ctx context.Context, repo ports.ComputoRubroRepository, versionID, rubroID string) (string, error) {
	return repo.Add(ctx, versionID, rubroID)
}

// ComputoRubrosReorder reorders rubros of the version to match the given computoRubroIDs (index = orden).
func ComputoRubrosReorder(ctx context.Context, repo ports.ComputoRubroRepository, versionID string, computoRubroIDs []string) error {
	return repo.Reorder(ctx, versionID, computoRubroIDs)
}

// ItemCatalogList returns the global item catalog for selectors.
func ItemCatalogList(ctx context.Context, repo ports.ItemRepository) ([]dto.ItemCatalogItemDTO, error) {
	rows, err := repo.ListCatalog(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ItemCatalogItemDTO, len(rows))
	for i := range rows {
		out[i] = dto.ItemCatalogItemDTO{ID: rows[i].ID, Tarea: rows[i].Tarea, Unidad: rows[i].Unidad}
	}
	return out, nil
}

// ComputoRubroItemsAdd adds an item to a computo rubro. Returns the new computo_rubro_item id.
func ComputoRubroItemsAdd(ctx context.Context, repo ports.ComputoRubroItemRepository, computoRubroID, itemID string, cantidadMilli int64) (string, error) {
	return repo.Add(ctx, computoRubroID, itemID, cantidadMilli)
}

// ComputoRubroItemsSetCantidad updates the quantity of a computo rubro item.
func ComputoRubroItemsSetCantidad(ctx context.Context, repo ports.ComputoRubroItemRepository, computoRubroItemID string, cantidadMilli int64) error {
	return repo.SetCantidad(ctx, computoRubroItemID, cantidadMilli)
}

// ComputoRubroItemsTrash soft-deletes a computo rubro item.
func ComputoRubroItemsTrash(ctx context.Context, repo ports.ComputoRubroItemRepository, computoRubroItemID string) error {
	return repo.Trash(ctx, computoRubroItemID)
}

// ComputoRubroTrashList returns trashed items of a computo rubro.
func ComputoRubroTrashList(ctx context.Context, repo ports.ComputoRubroItemRepository, computoRubroID string) ([]dto.ComputoRubroItemTrashedDTO, error) {
	rows, err := repo.ListTrashedByComputoRubro(ctx, computoRubroID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ComputoRubroItemTrashedDTO, len(rows))
	for i := range rows {
		out[i] = dto.ComputoRubroItemTrashedDTO{
			ID:            rows[i].ID,
			ItemID:        rows[i].ItemID,
			Tarea:         rows[i].Tarea,
			Unidad:        rows[i].Unidad,
			CantidadMilli: rows[i].CantidadMilli,
		}
	}
	return out, nil
}

// ComputoRubroTrashRestore restores a trashed computo rubro item.
func ComputoRubroTrashRestore(ctx context.Context, repo ports.ComputoRubroItemRepository, computoRubroItemID string) error {
	return repo.Restore(ctx, computoRubroItemID)
}
