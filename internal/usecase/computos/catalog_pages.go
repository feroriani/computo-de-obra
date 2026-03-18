package computos

import (
	"context"
	"strings"
	"unicode/utf8"

	"changeme/internal/app/dto"
	"changeme/internal/ports"
)

const catalogQMaxRunes = 200

func clampCatalogPage(q string, limit, offset int) (string, int, int) {
	q = strings.TrimSpace(q)
	if utf8.RuneCountInString(q) > catalogQMaxRunes {
		q = string([]rune(q)[:catalogQMaxRunes])
	}
	if limit < 1 {
		limit = 25
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	return q, limit, offset
}

// RubroCatalogListPaged lists rubros with optional substring filter and pagination (SQLite).
func RubroCatalogListPaged(ctx context.Context, repo ports.RubroCatalogRepository, q string, limit, offset int) (dto.RubroCatalogPageDTO, error) {
	q, limit, offset = clampCatalogPage(q, limit, offset)
	rows, total, err := repo.ListPaged(ctx, q, limit, offset)
	if err != nil {
		return dto.RubroCatalogPageDTO{}, err
	}
	items := make([]dto.RubroCatalogItemDTO, len(rows))
	for i := range rows {
		items[i] = dto.RubroCatalogItemDTO{ID: rows[i].ID, Nombre: rows[i].Nombre}
	}
	return dto.RubroCatalogPageDTO{Items: items, Total: total}, nil
}

// ItemCatalogListPaged lists items with optional substring filter on tarea/unidad.
func ItemCatalogListPaged(ctx context.Context, repo ports.ItemRepository, q string, limit, offset int) (dto.ItemCatalogPageDTO, error) {
	q, limit, offset = clampCatalogPage(q, limit, offset)
	rows, total, err := repo.ListCatalogPaged(ctx, q, limit, offset)
	if err != nil {
		return dto.ItemCatalogPageDTO{}, err
	}
	items := make([]dto.ItemCatalogItemDTO, len(rows))
	for i := range rows {
		items[i] = dto.ItemCatalogItemDTO{ID: rows[i].ID, Tarea: rows[i].Tarea, Unidad: rows[i].Unidad}
	}
	return dto.ItemCatalogPageDTO{Items: items, Total: total}, nil
}

// ComponenteMaterialListPaged lists material components with optional search.
func ComponenteMaterialListPaged(ctx context.Context, repo ports.ComponenteMaterialRepository, q string, limit, offset int) (dto.ComponenteMaterialPageDTO, error) {
	q, limit, offset = clampCatalogPage(q, limit, offset)
	rows, total, err := repo.ListPaged(ctx, q, limit, offset)
	if err != nil {
		return dto.ComponenteMaterialPageDTO{}, err
	}
	items := make([]dto.ComponenteMaterialItemDTO, len(rows))
	for i := range rows {
		items[i] = dto.ComponenteMaterialItemDTO{
			ID: rows[i].ID, Descripcion: rows[i].Descripcion, Unidad: rows[i].Unidad, CostoCentavos: rows[i].CostoCentavos,
		}
	}
	return dto.ComponenteMaterialPageDTO{Items: items, Total: total}, nil
}

// ComponenteManoObraListPaged lists labor components with optional search.
func ComponenteManoObraListPaged(ctx context.Context, repo ports.ComponenteManoObraRepository, q string, limit, offset int) (dto.ComponenteManoObraPageDTO, error) {
	q, limit, offset = clampCatalogPage(q, limit, offset)
	rows, total, err := repo.ListPaged(ctx, q, limit, offset)
	if err != nil {
		return dto.ComponenteManoObraPageDTO{}, err
	}
	items := make([]dto.ComponenteManoObraItemDTO, len(rows))
	for i := range rows {
		items[i] = dto.ComponenteManoObraItemDTO{
			ID: rows[i].ID, Descripcion: rows[i].Descripcion, Unidad: rows[i].Unidad, CostoCentavos: rows[i].CostoCentavos,
		}
	}
	return dto.ComponenteManoObraPageDTO{Items: items, Total: total}, nil
}
