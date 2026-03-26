package computos

import (
	"context"
	"errors"
	"sort"
	"strings"

	"changeme/internal/app/dto"
	"changeme/internal/ports"
)

// QuickItemEstimate calculates materials and labor totals for one item and quantity.
// It is a read-only query: no data is persisted.
func QuickItemEstimate(
	ctx context.Context,
	itemRepo ports.ItemRepository,
	itemCompRepo ports.ItemCompositionRepository,
	compMaterialRepo ports.ComponenteMaterialRepository,
	compManoObraRepo ports.ComponenteManoObraRepository,
	itemID string,
	cantidadMilli int64,
) (*dto.QuickItemEstimateDTO, error) {
	if strings.TrimSpace(itemID) == "" {
		return nil, errors.New("item_id es obligatorio")
	}
	if cantidadMilli <= 0 {
		return nil, errors.New("cantidad_milli debe ser mayor a 0")
	}

	item, err := itemRepo.Get(ctx, itemID)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, errors.New("ítem no encontrado")
	}

	materialCatalog, err := compMaterialRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	materialByID := make(map[string]ports.ComponenteMaterialRow, len(materialCatalog))
	for _, row := range materialCatalog {
		materialByID[row.ID] = row
	}

	manoObraCatalog, err := compManoObraRepo.List(ctx)
	if err != nil {
		return nil, err
	}
	manoObraByID := make(map[string]ports.ComponenteManoObraRow, len(manoObraCatalog))
	for _, row := range manoObraCatalog {
		manoObraByID[row.ID] = row
	}

	out := &dto.QuickItemEstimateDTO{
		ItemID:        item.ID,
		ItemTarea:     item.Tarea,
		ItemUnidad:    item.Unidad,
		CantidadMilli: cantidadMilli,
		Materiales:    []dto.MaterialObraRowDTO{},
		ManoObra:      []dto.ManoObraObraRowDTO{},
	}

	materials, err := itemCompRepo.ListMaterials(ctx, itemID)
	if err != nil {
		return nil, err
	}
	for _, row := range materials {
		comp, ok := materialByID[row.ComponenteID]
		if !ok {
			continue
		}
		qtyMilli := roundDiv(cantidadMilli*row.DosajeMilli, 1000)
		totalCentavos := roundDiv(cantidadMilli*row.DosajeMilli*comp.CostoCentavos, 1_000_000)
		out.Materiales = append(out.Materiales, dto.MaterialObraRowDTO{
			ComponenteID:  row.ComponenteID,
			Descripcion:   comp.Descripcion,
			Unidad:        comp.Unidad,
			CantidadMilli: qtyMilli,
			TotalCentavos: totalCentavos,
		})
		out.SubtotalMaterialCentavos += totalCentavos
	}

	manoObraRows, err := itemCompRepo.ListManoObra(ctx, itemID)
	if err != nil {
		return nil, err
	}
	for _, row := range manoObraRows {
		comp, ok := manoObraByID[row.ComponenteID]
		if !ok {
			continue
		}
		qtyMilli := roundDiv(cantidadMilli*row.DosajeMilli, 1000)
		totalCentavos := roundDiv(cantidadMilli*row.DosajeMilli*comp.CostoCentavos, 1_000_000)
		out.ManoObra = append(out.ManoObra, dto.ManoObraObraRowDTO{
			ComponenteID:  row.ComponenteID,
			Descripcion:   comp.Descripcion,
			Unidad:        comp.Unidad,
			CantidadMilli: qtyMilli,
			TotalCentavos: totalCentavos,
		})
		out.SubtotalMOCentavos += totalCentavos
	}

	sort.Slice(out.Materiales, func(i, j int) bool {
		return out.Materiales[i].Descripcion < out.Materiales[j].Descripcion
	})
	sort.Slice(out.ManoObra, func(i, j int) bool {
		return out.ManoObra[i].Descripcion < out.ManoObra[j].Descripcion
	})
	out.TotalCentavos = out.SubtotalMaterialCentavos + out.SubtotalMOCentavos
	return out, nil
}
