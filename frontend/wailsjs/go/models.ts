export namespace dto {
	
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

