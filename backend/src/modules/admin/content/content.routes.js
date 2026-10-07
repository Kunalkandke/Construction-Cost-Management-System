import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { idParams } from '../crud.js';
import * as c from './content.controller.js';
import * as s from './content.schema.js';

const r = Router();
r.use('/faqs', c.faqRouter);
r.use('/announcements', c.announcementRouter);
r.get('/contact-messages', validate({ query: s.messagesQuery }), c.listMessages);
r.patch('/contact-messages/:id', validate({ params: idParams, body: s.messagePatch }), c.updateMessage);
export default r;
