import {
  ComputoList,
  ComputoCreate,
  ComputoConfirm,
  ComputoCreateNewVersionFrom,
  ComputoGet,
  ComputoSetComitenteDescripcion,
  ComputoSetSuperficie,
  ComputoDeleteSeries,
  RubroCatalogList,
  RubroCatalogListPaged,
  RubroCatalogGet,
  RubroCatalogCreate,
  RubroCatalogUpdate,
  RubroCatalogDelete,
  ComputoRubrosAdd,
  ComputoRubrosDelete,
  ComputoRubrosReorder,
  ItemCatalogList,
  ItemCatalogListPaged,
  ItemCatalogGet,
  ItemCatalogCreate,
  ItemCatalogUpdate,
  ItemCatalogDelete,
  ComponenteMaterialList,
  ComponenteMaterialListPaged,
  ComponenteMaterialGet,
  ComponenteMaterialCreate,
  ComponenteMaterialUpdate,
  ComponenteMaterialDelete,
  ComponenteManoObraList,
  ComponenteManoObraListPaged,
  ComponenteManoObraGet,
  ComponenteManoObraCreate,
  ComponenteManoObraUpdate,
  ComponenteManoObraDelete,
  ItemCompositionListMaterials,
  ItemCompositionListManoObra,
  ItemCompositionAddMaterial,
  ItemCompositionAddManoObra,
  ItemCompositionSetMaterialDosaje,
  ItemCompositionSetManoObraDosaje,
  ItemCompositionDeleteMaterial,
  ItemCompositionDeleteManoObra,
  ComputoRubroItemsAdd,
  ComputoRubroItemsSetCantidad,
  ComputoRubroItemsTrash,
  ComputoRubroTrashList,
  ComputoRubroTrashEmpty,
  ComputoRubroTrashRestore,
  MaterialsAll,
  ManoObraAll,
  BackupDB,
  ExportComputoCSVAndSave,
} from "../../../wailsjs/go/app/App";
import type { dto } from "../../../wailsjs/go/models";

export type ComputoListRowDTO = dto.ComputoListRowDTO;
export type ComputoCreateResultDTO = dto.ComputoCreateResultDTO;
export type ComputoGetDTO = dto.ComputoGetDTO;
export type ComputoHeaderDTO = dto.ComputoHeaderDTO;
export type ComputoRubroDTO = dto.ComputoRubroDTO;
export type ComputoRubroItemDTO = dto.ComputoRubroItemDTO;
export type ComputoTotalesDTO = dto.ComputoTotalesDTO;
export type RubroCatalogItemDTO = dto.RubroCatalogItemDTO;
export type ItemCatalogItemDTO = dto.ItemCatalogItemDTO;
export type ComputoRubroItemTrashedDTO = dto.ComputoRubroItemTrashedDTO;
export type ComponenteMaterialItemDTO = dto.ComponenteMaterialItemDTO;
export type ComponenteManoObraItemDTO = dto.ComponenteManoObraItemDTO;
export type ItemMaterialRowDTO = dto.ItemMaterialRowDTO;
export type ItemManoObraRowDTO = dto.ItemManoObraRowDTO;
export type MaterialObraRowDTO = dto.MaterialObraRowDTO;
export type ManoObraObraRowDTO = dto.ManoObraObraRowDTO;

export async function listComputos(): Promise<ComputoListRowDTO[]> {
  return ComputoList();
}

export async function deleteComputoSeries(seriesID: string): Promise<void> {
  return ComputoDeleteSeries(seriesID);
}

export async function createComputo(
  descripcion: string,
  superficieMilli: number,
  fechaInicio: string
): Promise<ComputoCreateResultDTO> {
  return ComputoCreate(descripcion, superficieMilli, fechaInicio);
}

export async function getComputo(versionId: string): Promise<ComputoGetDTO | null> {
  return ComputoGet(versionId);
}

export async function computoSetSuperficie(versionId: string, superficieMilli: number): Promise<void> {
  return ComputoSetSuperficie(versionId, superficieMilli);
}

export async function computoSetComitenteDescripcion(versionId: string, descripcion: string): Promise<void> {
  return ComputoSetComitenteDescripcion(versionId, descripcion);
}

export async function computoConfirm(versionId: string): Promise<void> {
  return ComputoConfirm(versionId);
}

export async function computoCreateNewVersionFrom(
  versionIdConfirmado: string
): Promise<ComputoCreateResultDTO> {
  return ComputoCreateNewVersionFrom(versionIdConfirmado);
}

export async function rubroCatalogList(): Promise<RubroCatalogItemDTO[]> {
  return RubroCatalogList();
}

export async function rubroCatalogListPaged(
  q: string,
  limit: number,
  offset: number
): Promise<{ items: RubroCatalogItemDTO[]; total: number }> {
  const p = await RubroCatalogListPaged(q, limit, offset);
  return { items: p.items ?? [], total: p.total ?? 0 };
}

export async function computoRubrosAdd(versionId: string, rubroId: string): Promise<string> {
  return ComputoRubrosAdd(versionId, rubroId);
}

export async function computoRubrosReorder(versionId: string, computoRubroIds: string[]): Promise<void> {
  return ComputoRubrosReorder(versionId, computoRubroIds);
}

export async function computoRubrosDelete(computoRubroId: string): Promise<void> {
  return ComputoRubrosDelete(computoRubroId);
}

export async function itemCatalogList(): Promise<ItemCatalogItemDTO[]> {
  return ItemCatalogList();
}

export async function itemCatalogListPaged(
  q: string,
  limit: number,
  offset: number
): Promise<{ items: ItemCatalogItemDTO[]; total: number }> {
  const p = await ItemCatalogListPaged(q, limit, offset);
  return { items: p.items ?? [], total: p.total ?? 0 };
}

export async function computoRubroItemsAdd(
  computoRubroId: string,
  itemId: string,
  cantidadMilli: number
): Promise<string> {
  return ComputoRubroItemsAdd(computoRubroId, itemId, cantidadMilli);
}

export async function computoRubroItemsSetCantidad(
  computoRubroItemId: string,
  cantidadMilli: number
): Promise<void> {
  return ComputoRubroItemsSetCantidad(computoRubroItemId, cantidadMilli);
}

export async function computoRubroItemsTrash(computoRubroItemId: string): Promise<void> {
  return ComputoRubroItemsTrash(computoRubroItemId);
}

export async function computoRubroTrashList(
  computoRubroId: string
): Promise<ComputoRubroItemTrashedDTO[]> {
  return ComputoRubroTrashList(computoRubroId);
}

export async function computoRubroTrashRestore(computoRubroItemId: string): Promise<void> {
  return ComputoRubroTrashRestore(computoRubroItemId);
}

export async function computoRubroTrashEmpty(computoRubroId: string): Promise<void> {
  return ComputoRubroTrashEmpty(computoRubroId);
}

// --- Catálogos globales (CRUD) ---

export async function rubroCatalogGet(id: string): Promise<RubroCatalogItemDTO | null> {
  return RubroCatalogGet(id);
}

export async function rubroCatalogCreate(nombre: string): Promise<string> {
  return RubroCatalogCreate(nombre);
}

export async function rubroCatalogUpdate(id: string, nombre: string): Promise<void> {
  return RubroCatalogUpdate(id, nombre);
}

export async function rubroCatalogDelete(id: string): Promise<void> {
  return RubroCatalogDelete(id);
}

export async function itemCatalogGet(id: string): Promise<ItemCatalogItemDTO | null> {
  return ItemCatalogGet(id);
}

export async function itemCatalogCreate(tarea: string, unidad: string): Promise<string> {
  return ItemCatalogCreate(tarea, unidad);
}

export async function itemCatalogUpdate(id: string, tarea: string, unidad: string): Promise<void> {
  return ItemCatalogUpdate(id, tarea, unidad);
}

export async function itemCatalogDelete(id: string): Promise<void> {
  return ItemCatalogDelete(id);
}

export async function componenteMaterialList(): Promise<ComponenteMaterialItemDTO[]> {
  return ComponenteMaterialList();
}

export async function componenteMaterialListPaged(
  q: string,
  limit: number,
  offset: number
): Promise<{ items: ComponenteMaterialItemDTO[]; total: number }> {
  const p = await ComponenteMaterialListPaged(q, limit, offset);
  return { items: p.items ?? [], total: p.total ?? 0 };
}

export async function componenteMaterialGet(id: string): Promise<ComponenteMaterialItemDTO | null> {
  return ComponenteMaterialGet(id);
}

export async function componenteMaterialCreate(
  descripcion: string,
  unidad: string,
  costoCentavos: number
): Promise<string> {
  return ComponenteMaterialCreate(descripcion, unidad, costoCentavos);
}

export async function componenteMaterialUpdate(
  id: string,
  descripcion: string,
  unidad: string,
  costoCentavos: number
): Promise<void> {
  return ComponenteMaterialUpdate(id, descripcion, unidad, costoCentavos);
}

export async function componenteMaterialDelete(id: string): Promise<void> {
  return ComponenteMaterialDelete(id);
}

export async function componenteManoObraList(): Promise<ComponenteManoObraItemDTO[]> {
  return ComponenteManoObraList();
}

export async function componenteManoObraListPaged(
  q: string,
  limit: number,
  offset: number
): Promise<{ items: ComponenteManoObraItemDTO[]; total: number }> {
  const p = await ComponenteManoObraListPaged(q, limit, offset);
  return { items: p.items ?? [], total: p.total ?? 0 };
}

export async function componenteManoObraGet(id: string): Promise<ComponenteManoObraItemDTO | null> {
  return ComponenteManoObraGet(id);
}

export async function componenteManoObraCreate(
  descripcion: string,
  unidad: string,
  costoCentavos: number
): Promise<string> {
  return ComponenteManoObraCreate(descripcion, unidad, costoCentavos);
}

export async function componenteManoObraUpdate(
  id: string,
  descripcion: string,
  unidad: string,
  costoCentavos: number
): Promise<void> {
  return ComponenteManoObraUpdate(id, descripcion, unidad, costoCentavos);
}

export async function componenteManoObraDelete(id: string): Promise<void> {
  return ComponenteManoObraDelete(id);
}

export async function itemCompositionListMaterials(itemId: string): Promise<ItemMaterialRowDTO[]> {
  return ItemCompositionListMaterials(itemId);
}

export async function itemCompositionListManoObra(itemId: string): Promise<ItemManoObraRowDTO[]> {
  return ItemCompositionListManoObra(itemId);
}

export async function itemCompositionAddMaterial(
  itemId: string,
  componenteId: string,
  dosajeMilli: number
): Promise<void> {
  return ItemCompositionAddMaterial(itemId, componenteId, dosajeMilli);
}

export async function itemCompositionAddManoObra(
  itemId: string,
  componenteId: string,
  dosajeMilli: number
): Promise<void> {
  return ItemCompositionAddManoObra(itemId, componenteId, dosajeMilli);
}

export async function itemCompositionSetMaterialDosaje(
  itemId: string,
  componenteId: string,
  dosajeMilli: number
): Promise<void> {
  return ItemCompositionSetMaterialDosaje(itemId, componenteId, dosajeMilli);
}

export async function itemCompositionSetManoObraDosaje(
  itemId: string,
  componenteId: string,
  dosajeMilli: number
): Promise<void> {
  return ItemCompositionSetManoObraDosaje(itemId, componenteId, dosajeMilli);
}

export async function itemCompositionDeleteMaterial(
  itemId: string,
  componenteId: string
): Promise<void> {
  return ItemCompositionDeleteMaterial(itemId, componenteId);
}

export async function itemCompositionDeleteManoObra(
  itemId: string,
  componenteId: string
): Promise<void> {
  return ItemCompositionDeleteManoObra(itemId, componenteId);
}

/** Listado de materiales agregados por obra (versión). */
export async function materialsAll(versionId: string): Promise<MaterialObraRowDTO[]> {
  return MaterialsAll(versionId);
}

/** Listado de mano de obra agregada por obra (versión). */
export async function manoObraAll(versionId: string): Promise<ManoObraObraRowDTO[]> {
  return ManoObraAll(versionId);
}

/** Abre diálogo para guardar copia de la base de datos. */
export async function backupDB(): Promise<void> {
  return BackupDB();
}

/** Genera CSV del cómputo (materiales y mano de obra) y abre diálogo para guardar. */
export async function exportComputoCSVAndSave(
  versionId: string,
  itemId: string,
  itemTitle: string
): Promise<void> {
  // Wails bindings for Go variadic parameters get exported as an array arg.
  return ExportComputoCSVAndSave(versionId, [itemId, itemTitle]);
}
