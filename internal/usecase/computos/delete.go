package computos

import (
	"context"

	"changeme/internal/ports"
)

// DeleteSeries deletes a full computo series (CO-xxxx) and all related data.
func DeleteSeries(ctx context.Context, repo ports.ComputoRepository, seriesID string) error {
	return repo.DeleteSeries(ctx, seriesID)
}

