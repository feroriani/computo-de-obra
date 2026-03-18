package computos

import (
	"context"
	"fmt"

	"changeme/internal/app/dto"
	"changeme/internal/ports"
)

// Get returns the full computo for the editor (header, rubros with items and totals).
func Get(
	ctx context.Context,
	computoRepo ports.ComputoRepository,
	rubroRepo ports.ComputoRubroRepository,
	itemRepo ports.ComputoRubroItemRepository,
	unitCostsRepo ports.ItemRepository,
	versionID string,
) (*dto.ComputoGetDTO, error) {
	header, err := computoRepo.GetHeader(ctx, versionID)
	if err != nil {
		return nil, err
	}
	if header == nil {
		return nil, fmt.Errorf("computo version not found: %s", versionID)
	}

	rubros, err := rubroRepo.ListByVersion(ctx, versionID)
	if err != nil {
		return nil, err
	}

	out := &dto.ComputoGetDTO{
		Header: dto.ComputoHeaderDTO{
			VersionID:       header.VersionID,
			SeriesID:        header.SeriesID,
			Codigo:          header.Codigo,
			VersionN:        header.VersionN,
			Estado:          header.Estado,
			Descripcion:     header.Descripcion,
			SuperficieMilli: header.SuperficieMilli,
			FechaInicio:     header.FechaInicio.Format("2006-01-02"),
		},
		Rubros:  make([]dto.ComputoRubroDTO, 0, len(rubros)),
		Totales: dto.ComputoTotalesDTO{},
	}

	var totalMaterial, totalMO int64

	for _, rub := range rubros {
		items, err := itemRepo.ListByComputoRubro(ctx, rub.ID)
		if err != nil {
			return nil, err
		}
		rubDTO := dto.ComputoRubroDTO{
			ID:      rub.ID,
			RubroID: rub.RubroID,
			Nombre:  rub.Nombre,
			Orden:   rub.Orden,
			Items:   make([]dto.ComputoRubroItemDTO, 0, len(items)),
		}
		var subMat, subMO int64
		for _, it := range items {
			unit, err := unitCostsRepo.GetUnitCosts(ctx, it.ItemID)
			if err != nil {
				return nil, err
			}
			// line = (cantidad_milli * unit_centavos) / 1000
			lineMat := (it.CantidadMilli * unit.MaterialCentavos) / 1000
			lineMO := (it.CantidadMilli * unit.MOCentavos) / 1000
			lineTotal := lineMat + lineMO
			subMat += lineMat
			subMO += lineMO
			rubDTO.Items = append(rubDTO.Items, dto.ComputoRubroItemDTO{
				ID:                   it.ID,
				ItemID:               it.ItemID,
				Tarea:                it.Tarea,
				Unidad:               it.Unidad,
				CantidadMilli:        it.CantidadMilli,
				UnitMaterialCentavos: unit.MaterialCentavos,
				UnitMOCentavos:       unit.MOCentavos,
				LineMaterialCentavos: lineMat,
				LineMOCentavos:       lineMO,
				LineTotalCentavos:    lineTotal,
			})
		}
		rubDTO.SubtotalMaterialCentavos = subMat
		rubDTO.SubtotalMOCentavos = subMO
		rubDTO.SubtotalCentavos = subMat + subMO
		totalMaterial += subMat
		totalMO += subMO
		out.Rubros = append(out.Rubros, rubDTO)
	}

	out.Totales.TotalMaterialCentavos = totalMaterial
	out.Totales.TotalMOCentavos = totalMO
	out.Totales.TotalCentavos = totalMaterial + totalMO
	if header.SuperficieMilli > 0 {
		out.Totales.CostoM2Centavos = (out.Totales.TotalCentavos * 1000) / header.SuperficieMilli
	}

	return out, nil
}
