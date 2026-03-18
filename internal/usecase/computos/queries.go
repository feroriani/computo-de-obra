package computos

import (
	"context"
	"sort"

	"changeme/internal/app/dto"
	"changeme/internal/ports"
)

// MaterialsAll returns aggregated materials for a computo version (listado por obra).
// Uses rubroRepo, rubroItemRepo, itemCompositionRepo, componenteMaterialRepo.
func MaterialsAll(
	ctx context.Context,
	rubroRepo ports.ComputoRubroRepository,
	rubroItemRepo ports.ComputoRubroItemRepository,
	itemCompRepo ports.ItemCompositionRepository,
	compMaterialRepo ports.ComponenteMaterialRepository,
	versionID string,
) ([]dto.MaterialObraRowDTO, error) {
	rubros, err := rubroRepo.ListByVersion(ctx, versionID)
	if err != nil {
		return nil, err
	}

	type agg struct {
		descripcion   string
		unidad        string
		cantidadMilli int64
		totalCentavos int64
	}
	byID := make(map[string]*agg)

	for _, rub := range rubros {
		items, err := rubroItemRepo.ListByComputoRubro(ctx, rub.ID)
		if err != nil {
			return nil, err
		}
		for _, it := range items {
			mats, err := itemCompRepo.ListMaterials(ctx, it.ItemID)
			if err != nil {
				return nil, err
			}
			for _, m := range mats {
				comp, err := compMaterialRepo.Get(ctx, m.ComponenteID)
				if err != nil {
					return nil, err
				}
				if comp == nil {
					continue
				}
				// quantity in milli: (item_qty_milli * dosaje_milli) / 1000
				qtyMilli := (it.CantidadMilli * m.DosajeMilli) / 1000
				// cost: (item_qty_milli * dosaje_milli * unit_centavos) / 1_000_000
				cost := (it.CantidadMilli * m.DosajeMilli * comp.CostoCentavos) / 1_000_000

				if byID[m.ComponenteID] == nil {
					byID[m.ComponenteID] = &agg{descripcion: comp.Descripcion, unidad: comp.Unidad}
				}
				byID[m.ComponenteID].cantidadMilli += qtyMilli
				byID[m.ComponenteID].totalCentavos += cost
			}
		}
	}

	ids := make([]string, 0, len(byID))
	for id := range byID {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })

	out := make([]dto.MaterialObraRowDTO, 0, len(ids))
	for _, id := range ids {
		a := byID[id]
		out = append(out, dto.MaterialObraRowDTO{
			ComponenteID:  id,
			Descripcion:   a.descripcion,
			Unidad:        a.unidad,
			CantidadMilli: a.cantidadMilli,
			TotalCentavos: a.totalCentavos,
		})
	}
	return out, nil
}

// ManoObraAll returns aggregated labor for a computo version (listado por obra).
func ManoObraAll(
	ctx context.Context,
	rubroRepo ports.ComputoRubroRepository,
	rubroItemRepo ports.ComputoRubroItemRepository,
	itemCompRepo ports.ItemCompositionRepository,
	compManoObraRepo ports.ComponenteManoObraRepository,
	versionID string,
) ([]dto.ManoObraObraRowDTO, error) {
	rubros, err := rubroRepo.ListByVersion(ctx, versionID)
	if err != nil {
		return nil, err
	}

	type agg struct {
		descripcion   string
		unidad        string
		cantidadMilli int64
		totalCentavos int64
	}
	byID := make(map[string]*agg)

	for _, rub := range rubros {
		items, err := rubroItemRepo.ListByComputoRubro(ctx, rub.ID)
		if err != nil {
			return nil, err
		}
		for _, it := range items {
			mos, err := itemCompRepo.ListManoObra(ctx, it.ItemID)
			if err != nil {
				return nil, err
			}
			for _, mo := range mos {
				comp, err := compManoObraRepo.Get(ctx, mo.ComponenteID)
				if err != nil {
					return nil, err
				}
				if comp == nil {
					continue
				}
				qtyMilli := (it.CantidadMilli * mo.DosajeMilli) / 1000
				cost := (it.CantidadMilli * mo.DosajeMilli * comp.CostoCentavos) / 1_000_000

				if byID[mo.ComponenteID] == nil {
					byID[mo.ComponenteID] = &agg{descripcion: comp.Descripcion, unidad: comp.Unidad}
				}
				byID[mo.ComponenteID].cantidadMilli += qtyMilli
				byID[mo.ComponenteID].totalCentavos += cost
			}
		}
	}

	ids := make([]string, 0, len(byID))
	for id := range byID {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })

	out := make([]dto.ManoObraObraRowDTO, 0, len(ids))
	for _, id := range ids {
		a := byID[id]
		out = append(out, dto.ManoObraObraRowDTO{
			ComponenteID:  id,
			Descripcion:   a.descripcion,
			Unidad:        a.unidad,
			CantidadMilli: a.cantidadMilli,
			TotalCentavos: a.totalCentavos,
		})
	}
	return out, nil
}
