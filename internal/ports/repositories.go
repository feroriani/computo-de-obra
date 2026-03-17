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

// ComputoRepository lists and creates computo series/versions.
type ComputoRepository interface {
	List(ctx context.Context) ([]ComputoListRow, error)
	Create(ctx context.Context, in ComputoCreateInput) (*ComputoVersionRow, error)
}
