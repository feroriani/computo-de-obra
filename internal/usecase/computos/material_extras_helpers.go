package computos

import (
	"context"

	"changeme/internal/ports"
)

func loadExtraMaterialCostsByItem(
	ctx context.Context,
	extraRepo ports.ComputoItemMaterialExtraRepository,
	versionID string,
) (map[string]int64, error) {
	rows, err := extraRepo.ListByVersion(ctx, versionID)
	if err != nil {
		return nil, err
	}
	out := make(map[string]int64)
	for _, row := range rows {
		out[row.ItemID] += roundDiv(row.CantidadMilli*row.CostoCentavos, 1000)
	}
	return out, nil
}
