package computos

import (
	"context"

	"changeme/internal/ports"
)

// SetSuperficie updates superficie_milli for a computo version (header + snapshot costo/m² si aplica).
func SetSuperficie(ctx context.Context, repo ports.ComputoRepository, versionID string, superficieMilli int64) error {
	return repo.UpdateSuperficie(ctx, versionID, superficieMilli)
}
