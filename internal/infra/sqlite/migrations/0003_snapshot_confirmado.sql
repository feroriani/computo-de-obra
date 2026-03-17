CREATE TABLE computo_snapshot (
  version_id TEXT PRIMARY KEY REFERENCES computo_version(id) ON DELETE CASCADE,
  total_material_centavos INTEGER NOT NULL,
  total_mo_centavos INTEGER NOT NULL,
  total_centavos INTEGER NOT NULL,
  costo_m2_centavos INTEGER NOT NULL
);

CREATE TABLE computo_snapshot_rubro (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES computo_version(id) ON DELETE CASCADE,
  rubro_id TEXT NOT NULL,
  rubro_nombre TEXT NOT NULL,
  orden INTEGER NOT NULL,
  total_material_centavos INTEGER NOT NULL,
  total_mo_centavos INTEGER NOT NULL,
  total_centavos INTEGER NOT NULL
);

CREATE INDEX idx_computo_snapshot_rubro_version ON computo_snapshot_rubro(version_id);

CREATE TABLE computo_snapshot_linea (
  id TEXT PRIMARY KEY,
  snapshot_rubro_id TEXT NOT NULL REFERENCES computo_snapshot_rubro(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  tarea TEXT NOT NULL,
  unidad TEXT NOT NULL,
  cantidad_milli INTEGER NOT NULL,
  unit_material_centavos INTEGER NOT NULL,
  unit_mo_centavos INTEGER NOT NULL,
  line_material_centavos INTEGER NOT NULL,
  line_mo_centavos INTEGER NOT NULL,
  line_total_centavos INTEGER NOT NULL
);

CREATE INDEX idx_computo_snapshot_linea_rubro ON computo_snapshot_linea(snapshot_rubro_id);
