package ports

import (
	"context"
	"time"
)

// ComputoListRow is a single row for the computos list.
type ComputoListRow struct {
	SeriesID           string
	VersionID          string
	Codigo             string
	VersionN           int
	Estado             string
	Descripcion        string
	FechaInicio        time.Time
	SuperficieMilli    int64
	TotalCentavos      *int64
	CostoM2Centavos    *int64
}

// ComputoCreateInput is input for creating a new computo (first version).
type ComputoCreateInput struct {
	Descripcion     string
	SuperficieMilli int64
	FechaInicio     time.Time
}

// ComputoVersionRow is the created version (minimal) after Create.
type ComputoVersionRow struct {
	VersionID string
	SeriesID  string
	Codigo    string
	VersionN  int
	Estado    string
}

// ComputoHeader is the header of a single computo version (for editor).
type ComputoHeader struct {
	VersionID       string
	SeriesID        string
	Codigo          string
	VersionN        int
	Estado          string
	Descripcion     string
	SuperficieMilli int64
	FechaInicio     time.Time
}

// SnapshotLineaData is one line for snapshot persist (confirm).
type SnapshotLineaData struct {
	ItemID               string
	Tarea                string
	Unidad               string
	CantidadMilli        int64
	UnitMaterialCentavos int64
	UnitMOCentavos       int64
	LineMaterialCentavos  int64
	LineMOCentavos       int64
	LineTotalCentavos    int64
}

// SnapshotRubroData is one rubro with its lines for snapshot persist (confirm).
type SnapshotRubroData struct {
	RubroID               string
	Nombre                string
	Orden                 int
	TotalMaterialCentavos int64
	TotalMOCentavos       int64
	TotalCentavos         int64
	Lineas                []SnapshotLineaData
}

// SnapshotRubroWithLineas is a snapshot rubro row with its lines (for clone).
type SnapshotRubroWithLineas struct {
	ID                    string
	RubroID               string
	Nombre                string
	Orden                 int
	TotalMaterialCentavos int64
	TotalMOCentavos       int64
	TotalCentavos         int64
	Lineas                []SnapshotLineaRow
}

// SnapshotLineaRow is one snapshot line (for clone).
type SnapshotLineaRow struct {
	ItemID               string
	Tarea                string
	Unidad               string
	CantidadMilli        int64
	UnitMaterialCentavos int64
	UnitMOCentavos       int64
	LineMaterialCentavos  int64
	LineMOCentavos       int64
	LineTotalCentavos    int64
}

// ComputoRepository lists, creates and gets computo series/versions.
type ComputoRepository interface {
	List(ctx context.Context) ([]ComputoListRow, error)
	Create(ctx context.Context, in ComputoCreateInput) (*ComputoVersionRow, error)
	GetHeader(ctx context.Context, versionID string) (*ComputoHeader, error)
	UpdateDescripcion(ctx context.Context, versionID string, descripcion string) error
	UpdateSuperficie(ctx context.Context, versionID string, superficieMilli int64) error
	Confirm(ctx context.Context, versionID string, totalMaterial, totalMO, totalCentavos, costoM2 int64, rubros []SnapshotRubroData) error
	GetSnapshotForVersion(ctx context.Context, versionID string) ([]SnapshotRubroWithLineas, error)
	CreateNewVersionFrom(ctx context.Context, versionIDConfirmado string) (*ComputoVersionRow, error)
	// DeleteSeries deletes a full computo series (CO-xxxx) and all its related data.
	// It must break the `parent_version_id` FK (which has RESTRICT) before deleting versions.
	DeleteSeries(ctx context.Context, seriesID string) error
}

// ComputoRubroRow is a rubro assigned to a computo version (for editor).
type ComputoRubroRow struct {
	ID       string
	RubroID  string
	Nombre   string
	Orden    int
}

// RubroCatalogRow is a row from the global rubro catalog (for selectors).
type RubroCatalogRow struct {
	ID     string
	Nombre string
}

// RubroCatalogRepository lists and mutates the global rubro catalog.
type RubroCatalogRepository interface {
	List(ctx context.Context) ([]RubroCatalogRow, error)
	// ListPaged filters by substring q on nombre (case-insensitive). q empty = all rows.
	ListPaged(ctx context.Context, q string, limit, offset int) ([]RubroCatalogRow, int64, error)
	Get(ctx context.Context, id string) (*RubroCatalogRow, error)
	Create(ctx context.Context, nombre string) (id string, err error)
	Update(ctx context.Context, id, nombre string) error
	Delete(ctx context.Context, id string) error
}

// ComputoRubroRepository lists and mutates rubros of a computo version.
type ComputoRubroRepository interface {
	ListByVersion(ctx context.Context, versionID string) ([]ComputoRubroRow, error)
	Add(ctx context.Context, versionID, rubroID string) (computoRubroID string, err error)
	Reorder(ctx context.Context, versionID string, computoRubroIDs []string) error
	// Delete removes a computo_rubro from a draft version if it has no items (active or trashed).
	// It should return a clear error if the version is not borrador or if there are related items.
	Delete(ctx context.Context, computoRubroID string) error
}

// ComputoRubroItemRow is an item in a computo rubro (cantidad, item info).
type ComputoRubroItemRow struct {
	ID            string
	ItemID        string
	Tarea         string
	Unidad        string
	CantidadMilli int64
}

// ComputoRubroItemRowTrashed is a trashed item (for papelera list).
type ComputoRubroItemRowTrashed struct {
	ID            string
	ItemID        string
	Tarea         string
	Unidad        string
	CantidadMilli int64
}

// ComputoRubroItemRepository lists and mutates items of a computo rubro.
type ComputoRubroItemRepository interface {
	ListByComputoRubro(ctx context.Context, computoRubroID string) ([]ComputoRubroItemRow, error)
	ListTrashedByComputoRubro(ctx context.Context, computoRubroID string) ([]ComputoRubroItemRowTrashed, error)
	Add(ctx context.Context, computoRubroID, itemID string, cantidadMilli int64) (computoRubroItemID string, err error)
	SetCantidad(ctx context.Context, computoRubroItemID string, cantidadMilli int64) error
	Trash(ctx context.Context, computoRubroItemID string) error
	Restore(ctx context.Context, computoRubroItemID string) error
	// PurgeTrashedByComputoRubro permanently deletes trashed items (deleted_at IS NOT NULL)
	// for the given computo rubro.
	PurgeTrashedByComputoRubro(ctx context.Context, computoRubroID string) error
}

// ItemUnitCosts returns material and MO cost per unit of item (in centavos).
type ItemUnitCosts struct {
	MaterialCentavos int64
	MOCentavos       int64
}

// ItemCatalogRow is a row from the global item catalog (for selectors).
type ItemCatalogRow struct {
	ID     string
	Tarea  string
	Unidad string
}

// ItemRepository provides item catalog list, unit cost, and CRUD.
type ItemRepository interface {
	ListCatalog(ctx context.Context) ([]ItemCatalogRow, error)
	// ListCatalogPaged filters by substring q on tarea or unidad (case-insensitive).
	ListCatalogPaged(ctx context.Context, q string, limit, offset int) ([]ItemCatalogRow, int64, error)
	Get(ctx context.Context, id string) (*ItemCatalogRow, error)
	GetUnitCosts(ctx context.Context, itemID string) (ItemUnitCosts, error)
	Create(ctx context.Context, tarea, unidad string) (id string, err error)
	Update(ctx context.Context, id, tarea, unidad string) error
	Delete(ctx context.Context, id string) error
}

// ComponenteMaterialRow is a row from the global componente_material catalog.
type ComponenteMaterialRow struct {
	ID             string
	Descripcion    string
	Unidad         string
	CostoCentavos  int64
}

// ComponenteMaterialRepository is CRUD for componente_material.
type ComponenteMaterialRepository interface {
	List(ctx context.Context) ([]ComponenteMaterialRow, error)
	ListPaged(ctx context.Context, q string, limit, offset int) ([]ComponenteMaterialRow, int64, error)
	Get(ctx context.Context, id string) (*ComponenteMaterialRow, error)
	Create(ctx context.Context, descripcion, unidad string, costoCentavos int64) (id string, err error)
	Update(ctx context.Context, id, descripcion, unidad string, costoCentavos int64) error
	Delete(ctx context.Context, id string) error
}

// ComponenteManoObraRow is a row from the global componente_mano_obra catalog.
type ComponenteManoObraRow struct {
	ID             string
	Descripcion    string
	Unidad         string
	CostoCentavos  int64
}

// ComponenteManoObraRepository is CRUD for componente_mano_obra.
type ComponenteManoObraRepository interface {
	List(ctx context.Context) ([]ComponenteManoObraRow, error)
	ListPaged(ctx context.Context, q string, limit, offset int) ([]ComponenteManoObraRow, int64, error)
	Get(ctx context.Context, id string) (*ComponenteManoObraRow, error)
	Create(ctx context.Context, descripcion, unidad string, costoCentavos int64) (id string, err error)
	Update(ctx context.Context, id, descripcion, unidad string, costoCentavos int64) error
	Delete(ctx context.Context, id string) error
}

// ItemMaterialRow is a material component in an item's composition (dosaje_milli).
type ItemMaterialRow struct {
	ItemID       string
	ComponenteID string
	Descripcion  string
	Unidad       string
	DosajeMilli  int64
}

// ItemManoObraRow is a labor component in an item's composition (dosaje_milli).
type ItemManoObraRow struct {
	ItemID       string
	ComponenteID string
	Descripcion  string
	Unidad       string
	DosajeMilli  int64
}

// ItemCompositionRepository manages item_material and item_mano_obra (dosaje_milli).
type ItemCompositionRepository interface {
	ListMaterials(ctx context.Context, itemID string) ([]ItemMaterialRow, error)
	ListManoObra(ctx context.Context, itemID string) ([]ItemManoObraRow, error)
	AddMaterial(ctx context.Context, itemID, componenteID string, dosajeMilli int64) error
	AddManoObra(ctx context.Context, itemID, componenteID string, dosajeMilli int64) error
	SetMaterialDosaje(ctx context.Context, itemID, componenteID string, dosajeMilli int64) error
	SetManoObraDosaje(ctx context.Context, itemID, componenteID string, dosajeMilli int64) error
	DeleteMaterial(ctx context.Context, itemID, componenteID string) error
	DeleteManoObra(ctx context.Context, itemID, componenteID string) error
}
