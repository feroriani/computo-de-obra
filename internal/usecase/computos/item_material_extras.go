package computos

import (
	"context"
	"errors"
	"fmt"

	"changeme/internal/app/dto"
	"changeme/internal/ports"
)

// ComputoItemMaterialExtraList returns custom material rows for one version + item.
func ComputoItemMaterialExtraList(
	ctx context.Context,
	repo ports.ComputoItemMaterialExtraRepository,
	versionID string,
	itemID string,
) ([]dto.ComputoItemMaterialExtraRowDTO, error) {
	rows, err := repo.ListByVersionItem(ctx, versionID, itemID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ComputoItemMaterialExtraRowDTO, len(rows))
	for i := range rows {
		out[i] = dto.ComputoItemMaterialExtraRowDTO{
			ItemID:        rows[i].ItemID,
			ComponenteID:  rows[i].ComponenteID,
			Descripcion:   rows[i].Descripcion,
			Unidad:        rows[i].Unidad,
			CantidadMilli: rows[i].CantidadMilli,
			TotalCentavos: roundDiv(rows[i].CantidadMilli*rows[i].CostoCentavos, 1000),
		}
	}
	return out, nil
}

// ComputoItemMaterialExtraAdd inserts a custom material quantity for one version + item.
func ComputoItemMaterialExtraAdd(
	ctx context.Context,
	computoRepo ports.ComputoRepository,
	repo ports.ComputoItemMaterialExtraRepository,
	versionID string,
	itemID string,
	componenteID string,
	cantidadMilli int64,
) error {
	if cantidadMilli <= 0 {
		return errors.New("cantidad_milli debe ser mayor a 0")
	}
	header, err := computoRepo.GetHeader(ctx, versionID)
	if err != nil {
		return err
	}
	if header == nil {
		return fmt.Errorf("cómputo no encontrado: %s", versionID)
	}
	if header.Estado != "borrador" {
		return errors.New("solo se pueden agregar materiales extra en borrador")
	}
	return repo.Add(ctx, versionID, itemID, componenteID, cantidadMilli)
}

// ComputoItemMaterialExtraDelete removes one custom material row for version + item + componente.
func ComputoItemMaterialExtraDelete(
	ctx context.Context,
	computoRepo ports.ComputoRepository,
	repo ports.ComputoItemMaterialExtraRepository,
	versionID string,
	itemID string,
	componenteID string,
) error {
	header, err := computoRepo.GetHeader(ctx, versionID)
	if err != nil {
		return err
	}
	if header == nil {
		return fmt.Errorf("cómputo no encontrado: %s", versionID)
	}
	if header.Estado != "borrador" {
		return errors.New("solo se pueden eliminar materiales extra en borrador")
	}
	return repo.Delete(ctx, versionID, itemID, componenteID)
}
