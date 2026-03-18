-- Catálogo inicial mano de obra (MANODEOBRA.txt). costo_centavos = pesos × 100.
-- IDs fijos 00000000-0000-6000-8000-{código hex}.

INSERT OR IGNORE INTO componente_mano_obra (id, descripcion, unidad, costo_centavos, created_at, updated_at) VALUES ('00000000-0000-6000-8000-00000000001b', 'ayudante', 'h', 8068, '2025-03-17T00:00:00Z', '2025-03-17T00:00:00Z');
INSERT OR IGNORE INTO componente_mano_obra (id, descripcion, unidad, costo_centavos, created_at, updated_at) VALUES ('00000000-0000-6000-8000-00000000001c', 'ayudante carga/descarga', 'h', 3600, '2025-03-17T00:00:00Z', '2025-03-17T00:00:00Z');
INSERT OR IGNORE INTO componente_mano_obra (id, descripcion, unidad, costo_centavos, created_at, updated_at) VALUES ('00000000-0000-6000-8000-0000000000d1', 'oficial', 'h', 9531, '2025-03-17T00:00:00Z', '2025-03-17T00:00:00Z');
