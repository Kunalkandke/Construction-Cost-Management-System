import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { validate } from '../../../middleware/validate.js';
import { ApiError } from '../../../utils/ApiError.js';
import * as c from './rateItems.controller.js';
import * as s from './rateItems.schema.js';

// CSV only, 2 MB, memory storage (Section 5.5 "Uploads")
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const okMime = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/csv'].includes(file.mimetype);
    const okExt = path.extname(file.originalname).toLowerCase() === '.csv';
    cb(okMime && okExt ? null : ApiError.validation('Only .csv files are accepted'), okMime && okExt);
  },
});

const r = Router();
r.get('/rate-sets/:id/items', validate({ params: s.setParams, query: s.listQuery }), c.list);
r.post('/rate-sets/:id/items', validate({ params: s.setParams, body: s.createBody }), c.create);
r.get('/rate-sets/:id/items/export.csv', validate({ params: s.setParams }), c.exportCsv);
r.post('/rate-sets/:id/items/import', validate({ params: s.setParams, query: s.importQuery }), upload.single('file'), c.importCsv);
r.patch('/rate-items/:itemId', validate({ params: s.itemParams, body: s.patchBody }), c.patch);
r.delete('/rate-items/:itemId', validate({ params: s.itemParams }), c.remove);
export default r;
