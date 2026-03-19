package computos

import (
	"context"

	"changeme/internal/ports"
)

// SetComitenteDescripcion updates descripcion/comitente for a computo version.
func SetComitenteDescripcion(ctx context.Context, repo ports.ComputoRepository, versionID string, descripcion string) error {
	return repo.UpdateDescripcion(ctx, versionID, descripcion)
}
