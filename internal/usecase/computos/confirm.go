package computos

import (
	"context"
	"fmt"

	"changeme/internal/ports"
)

// Confirm persists the current draft as confirmado and writes snapshot (totals + rubros + lineas).
func Confirm(
	ctx context.Context,
	computoRepo ports.ComputoRepository,
	rubroRepo ports.ComputoRubroRepository,
	itemRepo ports.ComputoRubroItemRepository,
	unitCostsRepo ports.ItemRepository,
	versionID string,
) error {
	dto, err := Get(ctx, computoRepo, rubroRepo, itemRepo, unitCostsRepo, versionID)
	if err != nil {
		return err
	}
	if dto.Header.Estado != "borrador" {
		return fmt.Errorf("solo se puede confirmar un borrador: %s", versionID)
	}

	rubros := make([]ports.SnapshotRubroData, 0, len(dto.Rubros))
	for _, r := range dto.Rubros {
		lineas := make([]ports.SnapshotLineaData, 0, len(r.Items))
		for _, it := range r.Items {
			lineas = append(lineas, ports.SnapshotLineaData{
				ItemID:               it.ItemID,
				Tarea:                it.Tarea,
				Unidad:               it.Unidad,
				CantidadMilli:        it.CantidadMilli,
				UnitMaterialCentavos: it.UnitMaterialCentavos,
				UnitMOCentavos:       it.UnitMOCentavos,
				LineMaterialCentavos:  it.LineMaterialCentavos,
				LineMOCentavos:       it.LineMOCentavos,
				LineTotalCentavos:    it.LineTotalCentavos,
			})
		}
		rubros = append(rubros, ports.SnapshotRubroData{
			RubroID:               r.RubroID,
			Nombre:                r.Nombre,
			Orden:                 r.Orden,
			TotalMaterialCentavos: r.SubtotalMaterialCentavos,
			TotalMOCentavos:       r.SubtotalMOCentavos,
			TotalCentavos:         r.SubtotalCentavos,
			Lineas:                lineas,
		})
	}

	return computoRepo.Confirm(ctx, versionID,
		dto.Totales.TotalMaterialCentavos,
		dto.Totales.TotalMOCentavos,
		dto.Totales.TotalCentavos,
		dto.Totales.CostoM2Centavos,
		rubros)
}

// CreateNewVersionFrom clones a confirmed version into a new borrador from snapshot.
func CreateNewVersionFrom(ctx context.Context, computoRepo ports.ComputoRepository, versionIDConfirmado string) (*ports.ComputoVersionRow, error) {
	return computoRepo.CreateNewVersionFrom(ctx, versionIDConfirmado)
}
