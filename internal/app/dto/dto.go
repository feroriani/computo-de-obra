package dto

// AppInfoDTO contains basic information about the application.
type AppInfoDTO struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Author  string `json:"author"`
}

// ComputoListRowDTO is sent to the frontend for the computos list.
type ComputoListRowDTO struct {
	SeriesID        string `json:"series_id"`
	VersionID       string `json:"version_id"`
	Codigo          string `json:"codigo"`
	VersionN        int    `json:"version_n"`
	Estado          string `json:"estado"`
	Descripcion     string `json:"descripcion"`
	FechaInicio     string `json:"fecha_inicio"` // ISO date
	SuperficieMilli int64  `json:"superficie_milli"`
	TotalCentavos   *int64 `json:"total_centavos,omitempty"`
	CostoM2Centavos *int64 `json:"costo_m2_centavos,omitempty"`
}

// ComputoCreateRequest is the request to create a new computo.
type ComputoCreateRequest struct {
	Descripcion     string `json:"descripcion"`
	SuperficieMilli int64  `json:"superficie_milli"`
	FechaInicio     string `json:"fecha_inicio"` // ISO date YYYY-MM-DD
}

// ComputoCreateResultDTO is returned after creating a computo.
type ComputoCreateResultDTO struct {
	VersionID string `json:"version_id"`
	SeriesID  string `json:"series_id"`
	Codigo    string `json:"codigo"`
	VersionN  int    `json:"version_n"`
	Estado    string `json:"estado"`
}

// ComputoGetDTO is the full computo for the editor (header + rubros with items + totals).
type ComputoGetDTO struct {
	Header  ComputoHeaderDTO  `json:"header"`
	Rubros  []ComputoRubroDTO `json:"rubros"`
	Totales ComputoTotalesDTO `json:"totales"`
}

// ComputoHeaderDTO is the computo version header.
type ComputoHeaderDTO struct {
	VersionID       string `json:"version_id"`
	SeriesID        string `json:"series_id"`
	Codigo          string `json:"codigo"`
	VersionN        int    `json:"version_n"`
	Estado          string `json:"estado"`
	Descripcion     string `json:"descripcion"`
	SuperficieMilli int64  `json:"superficie_milli"`
	FechaInicio     string `json:"fecha_inicio"` // ISO date
}

// ComputoRubroDTO is a rubro in the computo with its items and subtotals.
type ComputoRubroDTO struct {
	ID                       string                `json:"id"`
	RubroID                  string                `json:"rubro_id"`
	Nombre                   string                `json:"nombre"`
	Orden                    int                   `json:"orden"`
	Items                    []ComputoRubroItemDTO `json:"items"`
	SubtotalMaterialCentavos int64                 `json:"subtotal_material_centavos"`
	SubtotalMOCentavos       int64                 `json:"subtotal_mo_centavos"`
	SubtotalCentavos         int64                 `json:"subtotal_centavos"`
}

// ComputoRubroItemDTO is an item line with quantity and computed costs.
type ComputoRubroItemDTO struct {
	ID                   string `json:"id"`
	ItemID               string `json:"item_id"`
	Tarea                string `json:"tarea"`
	Unidad               string `json:"unidad"`
	CantidadMilli        int64  `json:"cantidad_milli"`
	UnitMaterialCentavos int64  `json:"unit_material_centavos"`
	UnitMOCentavos       int64  `json:"unit_mo_centavos"`
	LineMaterialCentavos int64  `json:"line_material_centavos"`
	LineMOCentavos       int64  `json:"line_mo_centavos"`
	LineTotalCentavos    int64  `json:"line_total_centavos"`
}

// ComputoTotalesDTO is the obra totals and costo/m².
type ComputoTotalesDTO struct {
	TotalMaterialCentavos int64 `json:"total_material_centavos"`
	TotalMOCentavos       int64 `json:"total_mo_centavos"`
	TotalCentavos         int64 `json:"total_centavos"`
	CostoM2Centavos       int64 `json:"costo_m2_centavos"`
}

// RubroCatalogItemDTO is a rubro in the global catalog (for selectors).
type RubroCatalogItemDTO struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
}

// RubroCatalogPageDTO is a paginated slice of the rubro catalog (search + LIMIT/OFFSET).
type RubroCatalogPageDTO struct {
	Items []RubroCatalogItemDTO `json:"items"`
	Total int64                 `json:"total"`
}

// ItemCatalogItemDTO is an item in the global catalog (for selectors).
type ItemCatalogItemDTO struct {
	ID     string `json:"id"`
	Tarea  string `json:"tarea"`
	Unidad string `json:"unidad"`
}

// ItemCatalogPageDTO is a paginated slice of the item catalog.
type ItemCatalogPageDTO struct {
	Items []ItemCatalogItemDTO `json:"items"`
	Total int64                `json:"total"`
}

// ComputoRubroItemTrashedDTO is a trashed item (for papelera list).
type ComputoRubroItemTrashedDTO struct {
	ID            string `json:"id"`
	ItemID        string `json:"item_id"`
	Tarea         string `json:"tarea"`
	Unidad        string `json:"unidad"`
	CantidadMilli int64  `json:"cantidad_milli"`
}

// --- Catálogos globales (CRUD) ---

// RubroCatalogCreateRequest is request to create a rubro.
type RubroCatalogCreateRequest struct {
	Nombre string `json:"nombre"`
}

// RubroCatalogUpdateRequest is request to update a rubro.
type RubroCatalogUpdateRequest struct {
	Nombre string `json:"nombre"`
}

// ComponenteMaterialItemDTO is one row for the material component catalog (list/get).
type ComponenteMaterialItemDTO struct {
	ID            string `json:"id"`
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CostoCentavos int64  `json:"costo_centavos"`
}

// ComponenteMaterialPageDTO is a paginated material component catalog list.
type ComponenteMaterialPageDTO struct {
	Items []ComponenteMaterialItemDTO `json:"items"`
	Total int64                       `json:"total"`
}

// ComponenteMaterialCreateRequest is request to create a material component.
type ComponenteMaterialCreateRequest struct {
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CostoCentavos int64  `json:"costo_centavos"`
}

// ComponenteMaterialUpdateRequest is request to update a material component.
type ComponenteMaterialUpdateRequest struct {
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CostoCentavos int64  `json:"costo_centavos"`
}

// ComponenteManoObraItemDTO is one row for the labor component catalog (list/get).
type ComponenteManoObraItemDTO struct {
	ID            string `json:"id"`
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CostoCentavos int64  `json:"costo_centavos"`
}

// ComponenteManoObraPageDTO is a paginated labor component catalog list.
type ComponenteManoObraPageDTO struct {
	Items []ComponenteManoObraItemDTO `json:"items"`
	Total int64                       `json:"total"`
}

// ComponenteManoObraCreateRequest is request to create a labor component.
type ComponenteManoObraCreateRequest struct {
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CostoCentavos int64  `json:"costo_centavos"`
}

// ComponenteManoObraUpdateRequest is request to update a labor component.
type ComponenteManoObraUpdateRequest struct {
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CostoCentavos int64  `json:"costo_centavos"`
}

// ItemCatalogCreateRequest is request to create an item.
type ItemCatalogCreateRequest struct {
	Tarea  string `json:"tarea"`
	Unidad string `json:"unidad"`
}

// ItemCatalogUpdateRequest is request to update an item.
type ItemCatalogUpdateRequest struct {
	Tarea  string `json:"tarea"`
	Unidad string `json:"unidad"`
}

// ItemMaterialRowDTO is a material line in item composition (dosaje_milli).
type ItemMaterialRowDTO struct {
	ItemID       string `json:"item_id"`
	ComponenteID string `json:"componente_id"`
	Descripcion  string `json:"descripcion"`
	Unidad       string `json:"unidad"`
	DosajeMilli  int64  `json:"dosaje_milli"`
}

// ItemManoObraRowDTO is a labor line in item composition (dosaje_milli).
type ItemManoObraRowDTO struct {
	ItemID       string `json:"item_id"`
	ComponenteID string `json:"componente_id"`
	Descripcion  string `json:"descripcion"`
	Unidad       string `json:"unidad"`
	DosajeMilli  int64  `json:"dosaje_milli"`
}

// MaterialObraRowDTO is an aggregated material line for a computo version (listado por obra).
type MaterialObraRowDTO struct {
	ComponenteID  string `json:"componente_id"`
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CantidadMilli int64  `json:"cantidad_milli"`
	TotalCentavos int64  `json:"total_centavos"`
}

// ComputoItemMaterialExtraRowDTO is a custom material line per computo version + item.
type ComputoItemMaterialExtraRowDTO struct {
	ItemID        string `json:"item_id"`
	ComponenteID  string `json:"componente_id"`
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CantidadMilli int64  `json:"cantidad_milli"`
	TotalCentavos int64  `json:"total_centavos"`
}

// ManoObraObraRowDTO is an aggregated labor line for a computo version (listado por obra).
type ManoObraObraRowDTO struct {
	ComponenteID  string `json:"componente_id"`
	Descripcion   string `json:"descripcion"`
	Unidad        string `json:"unidad"`
	CantidadMilli int64  `json:"cantidad_milli"`
	TotalCentavos int64  `json:"total_centavos"`
}

// QuickItemEstimateDTO is a non-persistent quick query for one item and quantity.
type QuickItemEstimateDTO struct {
	ItemID                   string               `json:"item_id"`
	ItemTarea                string               `json:"item_tarea"`
	ItemUnidad               string               `json:"item_unidad"`
	CantidadMilli            int64                `json:"cantidad_milli"`
	Materiales               []MaterialObraRowDTO `json:"materiales"`
	ManoObra                 []ManoObraObraRowDTO `json:"mano_obra"`
	SubtotalMaterialCentavos int64                `json:"subtotal_material_centavos"`
	SubtotalMOCentavos       int64                `json:"subtotal_mo_centavos"`
	TotalCentavos            int64                `json:"total_centavos"`
}
