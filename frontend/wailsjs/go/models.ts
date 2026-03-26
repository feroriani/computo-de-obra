export namespace dto {
	
	export class AppInfoDTO {
	    name: string;
	    version: string;
	    author: string;
	
	    static createFrom(source: any = {}) {
	        return new AppInfoDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.author = source["author"];
	    }
	}
	export class ComponenteManoObraItemDTO {
	    id: string;
	    descripcion: string;
	    unidad: string;
	    costo_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new ComponenteManoObraItemDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.descripcion = source["descripcion"];
	        this.unidad = source["unidad"];
	        this.costo_centavos = source["costo_centavos"];
	    }
	}
	export class ComponenteManoObraPageDTO {
	    items: ComponenteManoObraItemDTO[];
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new ComponenteManoObraPageDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], ComponenteManoObraItemDTO);
	        this.total = source["total"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ComponenteMaterialItemDTO {
	    id: string;
	    descripcion: string;
	    unidad: string;
	    costo_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new ComponenteMaterialItemDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.descripcion = source["descripcion"];
	        this.unidad = source["unidad"];
	        this.costo_centavos = source["costo_centavos"];
	    }
	}
	export class ComponenteMaterialPageDTO {
	    items: ComponenteMaterialItemDTO[];
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new ComponenteMaterialPageDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], ComponenteMaterialItemDTO);
	        this.total = source["total"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ComputoCreateResultDTO {
	    version_id: string;
	    series_id: string;
	    codigo: string;
	    version_n: number;
	    estado: string;
	
	    static createFrom(source: any = {}) {
	        return new ComputoCreateResultDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version_id = source["version_id"];
	        this.series_id = source["series_id"];
	        this.codigo = source["codigo"];
	        this.version_n = source["version_n"];
	        this.estado = source["estado"];
	    }
	}
	export class ComputoTotalesDTO {
	    total_material_centavos: number;
	    total_mo_centavos: number;
	    total_centavos: number;
	    costo_m2_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new ComputoTotalesDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_material_centavos = source["total_material_centavos"];
	        this.total_mo_centavos = source["total_mo_centavos"];
	        this.total_centavos = source["total_centavos"];
	        this.costo_m2_centavos = source["costo_m2_centavos"];
	    }
	}
	export class ComputoRubroItemDTO {
	    id: string;
	    item_id: string;
	    tarea: string;
	    unidad: string;
	    cantidad_milli: number;
	    unit_material_centavos: number;
	    unit_mo_centavos: number;
	    line_material_centavos: number;
	    line_mo_centavos: number;
	    line_total_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new ComputoRubroItemDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.item_id = source["item_id"];
	        this.tarea = source["tarea"];
	        this.unidad = source["unidad"];
	        this.cantidad_milli = source["cantidad_milli"];
	        this.unit_material_centavos = source["unit_material_centavos"];
	        this.unit_mo_centavos = source["unit_mo_centavos"];
	        this.line_material_centavos = source["line_material_centavos"];
	        this.line_mo_centavos = source["line_mo_centavos"];
	        this.line_total_centavos = source["line_total_centavos"];
	    }
	}
	export class ComputoRubroDTO {
	    id: string;
	    rubro_id: string;
	    nombre: string;
	    orden: number;
	    items: ComputoRubroItemDTO[];
	    subtotal_material_centavos: number;
	    subtotal_mo_centavos: number;
	    subtotal_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new ComputoRubroDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.rubro_id = source["rubro_id"];
	        this.nombre = source["nombre"];
	        this.orden = source["orden"];
	        this.items = this.convertValues(source["items"], ComputoRubroItemDTO);
	        this.subtotal_material_centavos = source["subtotal_material_centavos"];
	        this.subtotal_mo_centavos = source["subtotal_mo_centavos"];
	        this.subtotal_centavos = source["subtotal_centavos"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ComputoHeaderDTO {
	    version_id: string;
	    series_id: string;
	    codigo: string;
	    version_n: number;
	    estado: string;
	    descripcion: string;
	    superficie_milli: number;
	    fecha_inicio: string;
	
	    static createFrom(source: any = {}) {
	        return new ComputoHeaderDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version_id = source["version_id"];
	        this.series_id = source["series_id"];
	        this.codigo = source["codigo"];
	        this.version_n = source["version_n"];
	        this.estado = source["estado"];
	        this.descripcion = source["descripcion"];
	        this.superficie_milli = source["superficie_milli"];
	        this.fecha_inicio = source["fecha_inicio"];
	    }
	}
	export class ComputoGetDTO {
	    header: ComputoHeaderDTO;
	    rubros: ComputoRubroDTO[];
	    totales: ComputoTotalesDTO;
	
	    static createFrom(source: any = {}) {
	        return new ComputoGetDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.header = this.convertValues(source["header"], ComputoHeaderDTO);
	        this.rubros = this.convertValues(source["rubros"], ComputoRubroDTO);
	        this.totales = this.convertValues(source["totales"], ComputoTotalesDTO);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ComputoItemMaterialExtraRowDTO {
	    item_id: string;
	    componente_id: string;
	    descripcion: string;
	    unidad: string;
	    cantidad_milli: number;
	    total_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new ComputoItemMaterialExtraRowDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.item_id = source["item_id"];
	        this.componente_id = source["componente_id"];
	        this.descripcion = source["descripcion"];
	        this.unidad = source["unidad"];
	        this.cantidad_milli = source["cantidad_milli"];
	        this.total_centavos = source["total_centavos"];
	    }
	}
	export class ComputoListRowDTO {
	    series_id: string;
	    version_id: string;
	    codigo: string;
	    version_n: number;
	    estado: string;
	    descripcion: string;
	    fecha_inicio: string;
	    superficie_milli: number;
	    total_centavos?: number;
	    costo_m2_centavos?: number;
	
	    static createFrom(source: any = {}) {
	        return new ComputoListRowDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.series_id = source["series_id"];
	        this.version_id = source["version_id"];
	        this.codigo = source["codigo"];
	        this.version_n = source["version_n"];
	        this.estado = source["estado"];
	        this.descripcion = source["descripcion"];
	        this.fecha_inicio = source["fecha_inicio"];
	        this.superficie_milli = source["superficie_milli"];
	        this.total_centavos = source["total_centavos"];
	        this.costo_m2_centavos = source["costo_m2_centavos"];
	    }
	}
	
	
	export class ComputoRubroItemTrashedDTO {
	    id: string;
	    item_id: string;
	    tarea: string;
	    unidad: string;
	    cantidad_milli: number;
	
	    static createFrom(source: any = {}) {
	        return new ComputoRubroItemTrashedDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.item_id = source["item_id"];
	        this.tarea = source["tarea"];
	        this.unidad = source["unidad"];
	        this.cantidad_milli = source["cantidad_milli"];
	    }
	}
	
	export class ItemCatalogItemDTO {
	    id: string;
	    tarea: string;
	    unidad: string;
	
	    static createFrom(source: any = {}) {
	        return new ItemCatalogItemDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.tarea = source["tarea"];
	        this.unidad = source["unidad"];
	    }
	}
	export class ItemCatalogPageDTO {
	    items: ItemCatalogItemDTO[];
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new ItemCatalogPageDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], ItemCatalogItemDTO);
	        this.total = source["total"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ItemManoObraRowDTO {
	    item_id: string;
	    componente_id: string;
	    descripcion: string;
	    unidad: string;
	    dosaje_milli: number;
	
	    static createFrom(source: any = {}) {
	        return new ItemManoObraRowDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.item_id = source["item_id"];
	        this.componente_id = source["componente_id"];
	        this.descripcion = source["descripcion"];
	        this.unidad = source["unidad"];
	        this.dosaje_milli = source["dosaje_milli"];
	    }
	}
	export class ItemMaterialRowDTO {
	    item_id: string;
	    componente_id: string;
	    descripcion: string;
	    unidad: string;
	    dosaje_milli: number;
	
	    static createFrom(source: any = {}) {
	        return new ItemMaterialRowDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.item_id = source["item_id"];
	        this.componente_id = source["componente_id"];
	        this.descripcion = source["descripcion"];
	        this.unidad = source["unidad"];
	        this.dosaje_milli = source["dosaje_milli"];
	    }
	}
	export class ManoObraObraRowDTO {
	    componente_id: string;
	    descripcion: string;
	    unidad: string;
	    cantidad_milli: number;
	    total_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new ManoObraObraRowDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.componente_id = source["componente_id"];
	        this.descripcion = source["descripcion"];
	        this.unidad = source["unidad"];
	        this.cantidad_milli = source["cantidad_milli"];
	        this.total_centavos = source["total_centavos"];
	    }
	}
	export class MaterialObraRowDTO {
	    componente_id: string;
	    descripcion: string;
	    unidad: string;
	    cantidad_milli: number;
	    total_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new MaterialObraRowDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.componente_id = source["componente_id"];
	        this.descripcion = source["descripcion"];
	        this.unidad = source["unidad"];
	        this.cantidad_milli = source["cantidad_milli"];
	        this.total_centavos = source["total_centavos"];
	    }
	}
	export class QuickItemEstimateDTO {
	    item_id: string;
	    item_tarea: string;
	    item_unidad: string;
	    cantidad_milli: number;
	    materiales: MaterialObraRowDTO[];
	    mano_obra: ManoObraObraRowDTO[];
	    subtotal_material_centavos: number;
	    subtotal_mo_centavos: number;
	    total_centavos: number;
	
	    static createFrom(source: any = {}) {
	        return new QuickItemEstimateDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.item_id = source["item_id"];
	        this.item_tarea = source["item_tarea"];
	        this.item_unidad = source["item_unidad"];
	        this.cantidad_milli = source["cantidad_milli"];
	        this.materiales = this.convertValues(source["materiales"], MaterialObraRowDTO);
	        this.mano_obra = this.convertValues(source["mano_obra"], ManoObraObraRowDTO);
	        this.subtotal_material_centavos = source["subtotal_material_centavos"];
	        this.subtotal_mo_centavos = source["subtotal_mo_centavos"];
	        this.total_centavos = source["total_centavos"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RubroCatalogItemDTO {
	    id: string;
	    nombre: string;
	
	    static createFrom(source: any = {}) {
	        return new RubroCatalogItemDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.nombre = source["nombre"];
	    }
	}
	export class RubroCatalogPageDTO {
	    items: RubroCatalogItemDTO[];
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new RubroCatalogPageDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], RubroCatalogItemDTO);
	        this.total = source["total"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace sql {
	
	export class DB {
	
	
	    static createFrom(source: any = {}) {
	        return new DB(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}

}

