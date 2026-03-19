package computos

import (
	"context"

	"changeme/internal/ports"
)

// List returns all computo versions for the list screen.
func List(
	ctx context.Context,
	repo ports.ComputoRepository,
	rubroRepo ports.ComputoRubroRepository,
	rubroItemRepo ports.ComputoRubroItemRepository,
	unitCostsRepo ports.ItemRepository,
) ([]ports.ComputoListRow, error) {
	rows, err := repo.List(ctx)
	if err != nil {
		return nil, err
	}

	// `repo.List()` populates totals only when a `computo_snapshot` exists (confirmado).
	// For `borrador`, compute totals in vivo so the list can show numbers too.
	for i := range rows {
		if rows[i].TotalCentavos != nil && rows[i].CostoM2Centavos != nil {
			continue
		}

		getDTO, err := Get(ctx, repo, rubroRepo, rubroItemRepo, unitCostsRepo, rows[i].VersionID)
		if err != nil {
			return nil, err
		}

		total := getDTO.Totales.TotalCentavos
		costoM2 := getDTO.Totales.CostoM2Centavos
		rows[i].TotalCentavos = &total
		rows[i].CostoM2Centavos = &costoM2
	}

	return rows, nil
}
