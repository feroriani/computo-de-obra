import { ComputoList, ComputoCreate } from "../../../wailsjs/go/app/App";
import type { dto } from "../../../wailsjs/go/models";

export type ComputoListRowDTO = dto.ComputoListRowDTO;
export type ComputoCreateResultDTO = dto.ComputoCreateResultDTO;

export async function listComputos(): Promise<ComputoListRowDTO[]> {
  return ComputoList();
}

export async function createComputo(
  descripcion: string,
  superficieMilli: number,
  fechaInicio: string
): Promise<ComputoCreateResultDTO> {
  return ComputoCreate(descripcion, superficieMilli, fechaInicio);
}
