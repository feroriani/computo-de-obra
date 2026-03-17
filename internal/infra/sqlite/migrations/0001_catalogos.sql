-- Rubros (global)
CREATE TABLE rubro (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE componente_material (
  id TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  unidad TEXT NOT NULL,
  costo_centavos INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE componente_mano_obra (
  id TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  unidad TEXT NOT NULL,
  costo_centavos INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE item (
  id TEXT PRIMARY KEY,
  tarea TEXT NOT NULL,
  unidad TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE item_material (
  item_id TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  componente_id TEXT NOT NULL REFERENCES componente_material(id) ON DELETE RESTRICT,
  dosaje_milli INTEGER NOT NULL,
  PRIMARY KEY (item_id, componente_id),
  CHECK (dosaje_milli >= 0)
);

CREATE TABLE item_mano_obra (
  item_id TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  componente_id TEXT NOT NULL REFERENCES componente_mano_obra(id) ON DELETE RESTRICT,
  dosaje_milli INTEGER NOT NULL,
  PRIMARY KEY (item_id, componente_id),
  CHECK (dosaje_milli >= 0)
);
