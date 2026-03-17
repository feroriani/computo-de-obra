package dto

// ComputoListRowDTO is sent to the frontend for the computos list.
type ComputoListRowDTO struct {
	SeriesID        string  `json:"series_id"`
	VersionID       string  `json:"version_id"`
	Codigo          string  `json:"codigo"`
	VersionN        int     `json:"version_n"`
	Estado          string  `json:"estado"`
	Descripcion     string  `json:"descripcion"`
	FechaInicio     string  `json:"fecha_inicio"` // ISO date
	SuperficieMilli int64   `json:"superficie_milli"`
	TotalCentavos   *int64  `json:"total_centavos,omitempty"`
	CostoM2Centavos *int64  `json:"costo_m2_centavos,omitempty"`
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
