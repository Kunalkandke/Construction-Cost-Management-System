import { makeCrudRouter } from '../crud.js';
import * as svc from './masterData.service.js';
import * as sch from './masterData.schema.js';

// Thin by design: the generic CRUD controller lives in crud.js.
export const routers = {
  'house-types': makeCrudRouter(svc.houseTypes, sch.houseTypes),
  'floor-options': makeCrudRouter(svc.floorOptions, sch.floorOptions),
  'bhk-configs': makeCrudRouter(svc.bhkConfigs, sch.bhkConfigs, { allowRemove: false }),
  'quality-tiers': makeCrudRouter(svc.qualityTiers, sch.qualityTiers, { allowCreate: false, allowRemove: false }),
  'structure-types': makeCrudRouter(svc.structureTypes, sch.structureTypes, { allowCreate: false, allowRemove: false }),
  locations: makeCrudRouter(svc.locations, sch.locations),
  'material-coefficients': makeCrudRouter(svc.materialCoefficients, sch.materialCoefficients),
};
