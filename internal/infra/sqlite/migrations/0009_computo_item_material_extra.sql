CREATE TABLE computo_item_material_extra (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES computo_version(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES item(id) ON DELETE RESTRICT,
  componente_id TEXT NOT NULL REFERENCES componente_material(id) ON DELETE RESTRICT,
  cantidad_milli INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (cantidad_milli >= 0),
  UNIQUE (version_id, item_id, componente_id)
);

CREATE INDEX idx_computo_item_material_extra_version_item
  ON computo_item_material_extra(version_id, item_id);
