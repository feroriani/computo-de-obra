package computos

import (
	"context"

	"changeme/internal/ports"
)

// Create creates a new computo (series + first version in borrador).
func Create(ctx context.Context, repo ports.ComputoRepository, in ports.ComputoCreateInput) (*ports.ComputoVersionRow, error) {
	return repo.Create(ctx, in)
}
