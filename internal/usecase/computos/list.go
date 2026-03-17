package computos

import (
	"context"

	"changeme/internal/ports"
)

// List returns all computo versions for the list screen.
func List(ctx context.Context, repo ports.ComputoRepository) ([]ports.ComputoListRow, error) {
	return repo.List(ctx)
}
