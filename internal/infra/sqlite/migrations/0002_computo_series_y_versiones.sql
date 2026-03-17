CREATE TABLE computo_series (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE computo_version (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES computo_series(id) ON DELETE CASCADE,
  version_n INTEGER NOT NULL,
  parent_version_id TEXT REFERENCES computo_version(id),
  estado TEXT NOT NULL CHECK (estado IN ('borrador','confirmado')),
  descripcion TEXT NOT NULL,
  superficie_milli INTEGER NOT NULL,
  fecha_inicio TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  confirmed_at TEXT,
  UNIQUE (series_id, version_n)
);

CREATE TABLE computo_comitente (
  version_id TEXT PRIMARY KEY REFERENCES computo_version(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  superficie_milli INTEGER NOT NULL,
  fecha_inicio TEXT NOT NULL
);

CREATE TABLE computo_rubro (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES computo_version(id) ON DELETE CASCADE,
  rubro_id TEXT NOT NULL REFERENCES rubro(id) ON DELETE RESTRICT,
  orden INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (version_id, rubro_id)
);

CREATE TABLE computo_rubro_item (
  id TEXT PRIMARY KEY,
  computo_rubro_id TEXT NOT NULL REFERENCES computo_rubro(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES item(id) ON DELETE RESTRICT,
  cantidad_milli INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (cantidad_milli >= 0)
);

CREATE INDEX idx_computo_rubro_version ON computo_rubro(version_id);
CREATE INDEX idx_computo_rubro_item_rubro ON computo_rubro_item(computo_rubro_id);
CREATE INDEX idx_computo_rubro_item_deleted ON computo_rubro_item(computo_rubro_id, deleted_at);
