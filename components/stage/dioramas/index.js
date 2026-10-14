import { buildDistrict12 } from './district12.js';
import { buildDistrict11 } from './district11.js';
import { buildDistrict4 } from './district4.js';

// id del distrito → función build del diorama (ver contrato en el plan, Tarea 5).
export const DIORAMAS = {
  12: buildDistrict12,
  11: buildDistrict11,
  4: buildDistrict4,
};
