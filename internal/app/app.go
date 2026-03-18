package app

import (
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"changeme/internal/app/dto"
	"changeme/internal/infra/sqlite"
	"changeme/internal/infra/sqlite/repositories"
	"changeme/internal/platform/paths"
	"changeme/internal/ports"
	"changeme/internal/usecase/computos"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const appName = "computo-de-obra"

// App is the Wails application struct (bindings).
type App struct {
	ctx                    context.Context
	db                     *sql.DB
	dbPath                 string
	computoRepo            ports.ComputoRepository
	rubroRepo              ports.ComputoRubroRepository
	rubroItemRepo          ports.ComputoRubroItemRepository
	rubroCatalogRepo       ports.RubroCatalogRepository
	itemUnitCostsRepo      ports.ItemRepository
	componenteMaterialRepo ports.ComponenteMaterialRepository
	componenteManoObraRepo ports.ComponenteManoObraRepository
	itemCompositionRepo    ports.ItemCompositionRepository
}

// NewApp creates a new App.
func NewApp() *App {
	return &App{}
}

// Startup is called when the app starts. It initialises the DB and runs migrations.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	dir, err := paths.AppDataDir(appName)
	if err != nil {
		return
	}
	dbPath := paths.DBPath(dir)
	db, err := sqlite.Open(dbPath)
	if err != nil {
		fmt.Printf("warning: could not open db at %s: %v\n", dbPath, err)
		return
	}
	a.db = db
	a.dbPath = dbPath
	a.computoRepo = repositories.NewComputoRepo(db)
	a.rubroRepo = repositories.NewComputoRubroRepo(db)
	a.rubroItemRepo = repositories.NewComputoRubroItemRepo(db)
	a.rubroCatalogRepo = repositories.NewRubroCatalogRepo(db)
	a.itemUnitCostsRepo = repositories.NewItemRepo(db)
	a.componenteMaterialRepo = repositories.NewComponenteMaterialRepo(db)
	a.componenteManoObraRepo = repositories.NewComponenteManoObraRepo(db)
	a.itemCompositionRepo = repositories.NewItemCompositionRepo(db)
}

// DB returns the database connection (may be nil if startup failed).
func (a *App) DB() *sql.DB {
	return a.db
}

// ComputoList returns all computos for the list screen.
func (a *App) ComputoList() ([]dto.ComputoListRowDTO, error) {
	if a.computoRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	rows, err := computos.List(a.ctx, a.computoRepo)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ComputoListRowDTO, len(rows))
	for i := range rows {
		out[i] = dto.ComputoListRowDTO{
			SeriesID:        rows[i].SeriesID,
			VersionID:       rows[i].VersionID,
			Codigo:          rows[i].Codigo,
			VersionN:        rows[i].VersionN,
			Estado:          rows[i].Estado,
			Descripcion:     rows[i].Descripcion,
			FechaInicio:     rows[i].FechaInicio.Format("2006-01-02"),
			SuperficieMilli: rows[i].SuperficieMilli,
			TotalCentavos:   rows[i].TotalCentavos,
			CostoM2Centavos: rows[i].CostoM2Centavos,
		}
	}
	return out, nil
}

// ComputoCreate creates a new computo (series + first version) and returns the new version.
func (a *App) ComputoCreate(descripcion string, superficieMilli int64, fechaInicio string) (*dto.ComputoCreateResultDTO, error) {
	if a.computoRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	t, err := time.Parse("2006-01-02", fechaInicio)
	if err != nil {
		return nil, fmt.Errorf("fecha_inicio must be YYYY-MM-DD: %w", err)
	}
	in := ports.ComputoCreateInput{
		Descripcion:     descripcion,
		SuperficieMilli: superficieMilli,
		FechaInicio:     t,
	}
	row, err := computos.Create(a.ctx, a.computoRepo, in)
	if err != nil {
		return nil, err
	}
	return &dto.ComputoCreateResultDTO{
		VersionID: row.VersionID,
		SeriesID:  row.SeriesID,
		Codigo:    row.Codigo,
		VersionN:  row.VersionN,
		Estado:    row.Estado,
	}, nil
}

// ComputoGet returns the full computo for the editor (header, rubros with items and totals).
func (a *App) ComputoGet(versionID string) (*dto.ComputoGetDTO, error) {
	if a.computoRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.Get(a.ctx, a.computoRepo, a.rubroRepo, a.rubroItemRepo, a.itemUnitCostsRepo, versionID)
}

// ComputoSetSuperficie updates superficie (m² en milli) and recalcula costo/m² en listado si hay snapshot.
func (a *App) ComputoSetSuperficie(versionID string, superficieMilli int64) error {
	if a.computoRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.SetSuperficie(a.ctx, a.computoRepo, versionID, superficieMilli)
}

// RubroCatalogList returns the global rubro catalog for selectors.
func (a *App) RubroCatalogList() ([]dto.RubroCatalogItemDTO, error) {
	if a.rubroCatalogRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.RubroCatalogList(a.ctx, a.rubroCatalogRepo)
}

// RubroCatalogListPaged returns a page of rubros (q substring on nombre; limit 1–100, offset ≥ 0).
func (a *App) RubroCatalogListPaged(q string, limit int, offset int) (dto.RubroCatalogPageDTO, error) {
	if a.rubroCatalogRepo == nil {
		return dto.RubroCatalogPageDTO{}, fmt.Errorf("database not ready")
	}
	return computos.RubroCatalogListPaged(a.ctx, a.rubroCatalogRepo, q, limit, offset)
}

// RubroCatalogGet returns one rubro by id (nil if not found).
func (a *App) RubroCatalogGet(id string) (*dto.RubroCatalogItemDTO, error) {
	if a.rubroCatalogRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.RubroCatalogGet(a.ctx, a.rubroCatalogRepo, id)
}

// RubroCatalogCreate creates a rubro and returns its id.
func (a *App) RubroCatalogCreate(nombre string) (string, error) {
	if a.rubroCatalogRepo == nil {
		return "", fmt.Errorf("database not ready")
	}
	return computos.RubroCatalogCreate(a.ctx, a.rubroCatalogRepo, nombre)
}

// RubroCatalogUpdate updates a rubro.
func (a *App) RubroCatalogUpdate(id string, nombre string) error {
	if a.rubroCatalogRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.RubroCatalogUpdate(a.ctx, a.rubroCatalogRepo, id, nombre)
}

// RubroCatalogDelete deletes a rubro.
func (a *App) RubroCatalogDelete(id string) error {
	if a.rubroCatalogRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.RubroCatalogDelete(a.ctx, a.rubroCatalogRepo, id)
}

// ComputoRubrosAdd adds a rubro to the computo version. Returns the new computo_rubro id.
func (a *App) ComputoRubrosAdd(versionID string, rubroID string) (string, error) {
	if a.rubroRepo == nil {
		return "", fmt.Errorf("database not ready")
	}
	return computos.ComputoRubrosAdd(a.ctx, a.rubroRepo, versionID, rubroID)
}

// ComputoRubrosReorder reorders rubros; computoRubroIDs is the desired order (index = orden).
func (a *App) ComputoRubrosReorder(versionID string, computoRubroIDs []string) error {
	if a.rubroRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ComputoRubrosReorder(a.ctx, a.rubroRepo, versionID, computoRubroIDs)
}

// ItemCatalogList returns the global item catalog for selectors.
func (a *App) ItemCatalogList() ([]dto.ItemCatalogItemDTO, error) {
	if a.itemUnitCostsRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ItemCatalogList(a.ctx, a.itemUnitCostsRepo)
}

// ItemCatalogListPaged returns a page of items (q matches tarea or unidad).
func (a *App) ItemCatalogListPaged(q string, limit int, offset int) (dto.ItemCatalogPageDTO, error) {
	if a.itemUnitCostsRepo == nil {
		return dto.ItemCatalogPageDTO{}, fmt.Errorf("database not ready")
	}
	return computos.ItemCatalogListPaged(a.ctx, a.itemUnitCostsRepo, q, limit, offset)
}

// ItemCatalogGet returns one item by id (nil if not found).
func (a *App) ItemCatalogGet(id string) (*dto.ItemCatalogItemDTO, error) {
	if a.itemUnitCostsRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ItemCatalogGet(a.ctx, a.itemUnitCostsRepo, id)
}

// ItemCatalogCreate creates an item and returns its id.
func (a *App) ItemCatalogCreate(tarea string, unidad string) (string, error) {
	if a.itemUnitCostsRepo == nil {
		return "", fmt.Errorf("database not ready")
	}
	return computos.ItemCatalogCreate(a.ctx, a.itemUnitCostsRepo, tarea, unidad)
}

// ItemCatalogUpdate updates an item.
func (a *App) ItemCatalogUpdate(id string, tarea string, unidad string) error {
	if a.itemUnitCostsRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ItemCatalogUpdate(a.ctx, a.itemUnitCostsRepo, id, tarea, unidad)
}

// ItemCatalogDelete deletes an item.
func (a *App) ItemCatalogDelete(id string) error {
	if a.itemUnitCostsRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ItemCatalogDelete(a.ctx, a.itemUnitCostsRepo, id)
}

// ComponenteMaterialList returns all material components.
func (a *App) ComponenteMaterialList() ([]dto.ComponenteMaterialItemDTO, error) {
	if a.componenteMaterialRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ComponenteMaterialList(a.ctx, a.componenteMaterialRepo)
}

// ComponenteMaterialListPaged returns a page of material components (search descripcion/unidad).
func (a *App) ComponenteMaterialListPaged(q string, limit int, offset int) (dto.ComponenteMaterialPageDTO, error) {
	if a.componenteMaterialRepo == nil {
		return dto.ComponenteMaterialPageDTO{}, fmt.Errorf("database not ready")
	}
	return computos.ComponenteMaterialListPaged(a.ctx, a.componenteMaterialRepo, q, limit, offset)
}

// ComponenteMaterialGet returns one material component by id (nil if not found).
func (a *App) ComponenteMaterialGet(id string) (*dto.ComponenteMaterialItemDTO, error) {
	if a.componenteMaterialRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ComponenteMaterialGet(a.ctx, a.componenteMaterialRepo, id)
}

// ComponenteMaterialCreate creates a material component and returns its id.
func (a *App) ComponenteMaterialCreate(descripcion string, unidad string, costoCentavos int64) (string, error) {
	if a.componenteMaterialRepo == nil {
		return "", fmt.Errorf("database not ready")
	}
	return computos.ComponenteMaterialCreate(a.ctx, a.componenteMaterialRepo, descripcion, unidad, costoCentavos)
}

// ComponenteMaterialUpdate updates a material component.
func (a *App) ComponenteMaterialUpdate(id string, descripcion string, unidad string, costoCentavos int64) error {
	if a.componenteMaterialRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ComponenteMaterialUpdate(a.ctx, a.componenteMaterialRepo, id, descripcion, unidad, costoCentavos)
}

// ComponenteMaterialDelete deletes a material component.
func (a *App) ComponenteMaterialDelete(id string) error {
	if a.componenteMaterialRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ComponenteMaterialDelete(a.ctx, a.componenteMaterialRepo, id)
}

// ComponenteManoObraList returns all labor components.
func (a *App) ComponenteManoObraList() ([]dto.ComponenteManoObraItemDTO, error) {
	if a.componenteManoObraRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ComponenteManoObraList(a.ctx, a.componenteManoObraRepo)
}

// ComponenteManoObraListPaged returns a page of labor components (search descripcion/unidad).
func (a *App) ComponenteManoObraListPaged(q string, limit int, offset int) (dto.ComponenteManoObraPageDTO, error) {
	if a.componenteManoObraRepo == nil {
		return dto.ComponenteManoObraPageDTO{}, fmt.Errorf("database not ready")
	}
	return computos.ComponenteManoObraListPaged(a.ctx, a.componenteManoObraRepo, q, limit, offset)
}

// ComponenteManoObraGet returns one labor component by id (nil if not found).
func (a *App) ComponenteManoObraGet(id string) (*dto.ComponenteManoObraItemDTO, error) {
	if a.componenteManoObraRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ComponenteManoObraGet(a.ctx, a.componenteManoObraRepo, id)
}

// ComponenteManoObraCreate creates a labor component and returns its id.
func (a *App) ComponenteManoObraCreate(descripcion string, unidad string, costoCentavos int64) (string, error) {
	if a.componenteManoObraRepo == nil {
		return "", fmt.Errorf("database not ready")
	}
	return computos.ComponenteManoObraCreate(a.ctx, a.componenteManoObraRepo, descripcion, unidad, costoCentavos)
}

// ComponenteManoObraUpdate updates a labor component.
func (a *App) ComponenteManoObraUpdate(id string, descripcion string, unidad string, costoCentavos int64) error {
	if a.componenteManoObraRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ComponenteManoObraUpdate(a.ctx, a.componenteManoObraRepo, id, descripcion, unidad, costoCentavos)
}

// ComponenteManoObraDelete deletes a labor component.
func (a *App) ComponenteManoObraDelete(id string) error {
	if a.componenteManoObraRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ComponenteManoObraDelete(a.ctx, a.componenteManoObraRepo, id)
}

// ItemCompositionListMaterials returns material composition for an item.
func (a *App) ItemCompositionListMaterials(itemID string) ([]dto.ItemMaterialRowDTO, error) {
	if a.itemCompositionRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ItemCompositionListMaterials(a.ctx, a.itemCompositionRepo, itemID)
}

// ItemCompositionListManoObra returns labor composition for an item.
func (a *App) ItemCompositionListManoObra(itemID string) ([]dto.ItemManoObraRowDTO, error) {
	if a.itemCompositionRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ItemCompositionListManoObra(a.ctx, a.itemCompositionRepo, itemID)
}

// ItemCompositionAddMaterial adds or replaces a material in item composition (dosaje_milli).
func (a *App) ItemCompositionAddMaterial(itemID string, componenteID string, dosajeMilli int64) error {
	if a.itemCompositionRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ItemCompositionAddMaterial(a.ctx, a.itemCompositionRepo, itemID, componenteID, dosajeMilli)
}

// ItemCompositionAddManoObra adds or replaces a labor component in item composition.
func (a *App) ItemCompositionAddManoObra(itemID string, componenteID string, dosajeMilli int64) error {
	if a.itemCompositionRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ItemCompositionAddManoObra(a.ctx, a.itemCompositionRepo, itemID, componenteID, dosajeMilli)
}

// ItemCompositionSetMaterialDosaje updates dosaje_milli for a material in item composition.
func (a *App) ItemCompositionSetMaterialDosaje(itemID string, componenteID string, dosajeMilli int64) error {
	if a.itemCompositionRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ItemCompositionSetMaterialDosaje(a.ctx, a.itemCompositionRepo, itemID, componenteID, dosajeMilli)
}

// ItemCompositionSetManoObraDosaje updates dosaje_milli for a labor component in item composition.
func (a *App) ItemCompositionSetManoObraDosaje(itemID string, componenteID string, dosajeMilli int64) error {
	if a.itemCompositionRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ItemCompositionSetManoObraDosaje(a.ctx, a.itemCompositionRepo, itemID, componenteID, dosajeMilli)
}

// ItemCompositionDeleteMaterial removes a material from item composition.
func (a *App) ItemCompositionDeleteMaterial(itemID string, componenteID string) error {
	if a.itemCompositionRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ItemCompositionDeleteMaterial(a.ctx, a.itemCompositionRepo, itemID, componenteID)
}

// ItemCompositionDeleteManoObra removes a labor component from item composition.
func (a *App) ItemCompositionDeleteManoObra(itemID string, componenteID string) error {
	if a.itemCompositionRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ItemCompositionDeleteManoObra(a.ctx, a.itemCompositionRepo, itemID, componenteID)
}

// ComputoRubroItemsAdd adds an item to a computo rubro. Returns the new computo_rubro_item id.
func (a *App) ComputoRubroItemsAdd(computoRubroID string, itemID string, cantidadMilli int64) (string, error) {
	if a.rubroItemRepo == nil {
		return "", fmt.Errorf("database not ready")
	}
	return computos.ComputoRubroItemsAdd(a.ctx, a.rubroItemRepo, computoRubroID, itemID, cantidadMilli)
}

// ComputoRubroItemsSetCantidad updates the quantity of a computo rubro item.
func (a *App) ComputoRubroItemsSetCantidad(computoRubroItemID string, cantidadMilli int64) error {
	if a.rubroItemRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ComputoRubroItemsSetCantidad(a.ctx, a.rubroItemRepo, computoRubroItemID, cantidadMilli)
}

// ComputoRubroItemsTrash soft-deletes a computo rubro item.
func (a *App) ComputoRubroItemsTrash(computoRubroItemID string) error {
	if a.rubroItemRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ComputoRubroItemsTrash(a.ctx, a.rubroItemRepo, computoRubroItemID)
}

// ComputoRubroTrashList returns trashed items of a computo rubro.
func (a *App) ComputoRubroTrashList(computoRubroID string) ([]dto.ComputoRubroItemTrashedDTO, error) {
	if a.rubroItemRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ComputoRubroTrashList(a.ctx, a.rubroItemRepo, computoRubroID)
}

// ComputoRubroTrashRestore restores a trashed computo rubro item.
func (a *App) ComputoRubroTrashRestore(computoRubroItemID string) error {
	if a.rubroItemRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.ComputoRubroTrashRestore(a.ctx, a.rubroItemRepo, computoRubroItemID)
}

// ComputoConfirm sets the version to confirmado and persists snapshot (totals + rubros + lineas).
func (a *App) ComputoConfirm(versionID string) error {
	if a.computoRepo == nil {
		return fmt.Errorf("database not ready")
	}
	return computos.Confirm(a.ctx, a.computoRepo, a.rubroRepo, a.rubroItemRepo, a.itemUnitCostsRepo, versionID)
}

// ComputoCreateNewVersionFrom clones a confirmed version into a new borrador and returns the new version.
func (a *App) ComputoCreateNewVersionFrom(versionIDConfirmado string) (*dto.ComputoCreateResultDTO, error) {
	if a.computoRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	row, err := computos.CreateNewVersionFrom(a.ctx, a.computoRepo, versionIDConfirmado)
	if err != nil {
		return nil, err
	}
	return &dto.ComputoCreateResultDTO{
		VersionID: row.VersionID,
		SeriesID:  row.SeriesID,
		Codigo:    row.Codigo,
		VersionN:  row.VersionN,
		Estado:    row.Estado,
	}, nil
}

// MaterialsAll returns aggregated materials for the computo version (listado por obra).
func (a *App) MaterialsAll(versionID string) ([]dto.MaterialObraRowDTO, error) {
	if a.rubroRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.MaterialsAll(a.ctx, a.rubroRepo, a.rubroItemRepo, a.itemCompositionRepo, a.componenteMaterialRepo, versionID)
}

// ManoObraAll returns aggregated labor for the computo version (listado por obra).
func (a *App) ManoObraAll(versionID string) ([]dto.ManoObraObraRowDTO, error) {
	if a.rubroRepo == nil {
		return nil, fmt.Errorf("database not ready")
	}
	return computos.ManoObraAll(a.ctx, a.rubroRepo, a.rubroItemRepo, a.itemCompositionRepo, a.componenteManoObraRepo, versionID)
}

// BackupDB opens a save dialog and copies the database file to the chosen path.
// Returns an error if the dialog is cancelled or the copy fails.
func (a *App) BackupDB() error {
	if a.dbPath == "" || a.ctx == nil {
		return fmt.Errorf("database not ready")
	}
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: "computo.db",
		Title:           "Guardar copia de la base de datos",
	})
	if err != nil {
		return err
	}
	if path == "" {
		return fmt.Errorf("cancelado por el usuario")
	}
	src, err := os.Open(a.dbPath)
	if err != nil {
		return fmt.Errorf("abrir base de datos: %w", err)
	}
	defer src.Close()
	dst, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("crear archivo de destino: %w", err)
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return fmt.Errorf("copiar archivo: %w", err)
	}
	return nil
}

// ExportComputoCSVAndSave generates a CSV with materials and labor list for the given version,
// opens a save dialog, and writes the file. Returns an error if generation, dialog or write fails.
func (a *App) ExportComputoCSVAndSave(versionID string) error {
	if a.computoRepo == nil {
		return fmt.Errorf("database not ready")
	}
	header, err := a.computoRepo.GetHeader(a.ctx, versionID)
	if err != nil {
		return err
	}
	if header == nil {
		return fmt.Errorf("cómputo no encontrado: %s", versionID)
	}
	mats, err := computos.MaterialsAll(a.ctx, a.rubroRepo, a.rubroItemRepo, a.itemCompositionRepo, a.componenteMaterialRepo, versionID)
	if err != nil {
		return fmt.Errorf("listar materiales: %w", err)
	}
	mo, err := computos.ManoObraAll(a.ctx, a.rubroRepo, a.rubroItemRepo, a.itemCompositionRepo, a.componenteManoObraRepo, versionID)
	if err != nil {
		return fmt.Errorf("listar mano de obra: %w", err)
	}

	var buf strings.Builder
	w := csv.NewWriter(&buf)
	w.Comma = ';' // Excel en español suele usar punto y coma
	_ = w.Write([]string{"Cómputo exportado", fmt.Sprintf("%s v%d", header.Codigo, header.VersionN)})
	_ = w.Write(nil)
	_ = w.Write([]string{"Materiales"})
	_ = w.Write([]string{"Descripción", "Unidad", "Cantidad", "Total (ARS)"})
	for _, r := range mats {
		qty := strconv.FormatFloat(float64(r.CantidadMilli)/1000, 'f', 3, 64)
		total := strconv.FormatFloat(float64(r.TotalCentavos)/100, 'f', 2, 64)
		_ = w.Write([]string{r.Descripcion, r.Unidad, qty, total})
	}
	_ = w.Write(nil)
	_ = w.Write([]string{"Mano de obra"})
	_ = w.Write([]string{"Descripción", "Unidad", "Cantidad", "Total (ARS)"})
	for _, r := range mo {
		qty := strconv.FormatFloat(float64(r.CantidadMilli)/1000, 'f', 3, 64)
		total := strconv.FormatFloat(float64(r.TotalCentavos)/100, 'f', 2, 64)
		_ = w.Write([]string{r.Descripcion, r.Unidad, qty, total})
	}
	w.Flush()
	if w.Error() != nil {
		return w.Error()
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: fmt.Sprintf("%s_v%d_export.csv", header.Codigo, header.VersionN),
		Title:           "Exportar cómputo a CSV",
		Filters: []runtime.FileFilter{
			{DisplayName: "CSV (*.csv)", Pattern: "*.csv"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return fmt.Errorf("cancelado por el usuario")
	}
	return os.WriteFile(path, []byte(buf.String()), 0644)
}

// Greet returns a greeting for the given name (kept for existing frontend).
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
