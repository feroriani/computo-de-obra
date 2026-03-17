package app

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"changeme/internal/app/dto"
	"changeme/internal/infra/sqlite"
	"changeme/internal/infra/sqlite/repositories"
	"changeme/internal/platform/paths"
	"changeme/internal/ports"
	"changeme/internal/usecase/computos"
)

const appName = "computo-de-obra"

// App is the Wails application struct (bindings).
type App struct {
	ctx         context.Context
	db          *sql.DB
	computoRepo ports.ComputoRepository
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
	a.computoRepo = repositories.NewComputoRepo(db)
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

// Greet returns a greeting for the given name (kept for existing frontend).
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
