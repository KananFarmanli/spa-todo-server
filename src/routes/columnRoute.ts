import { Router } from 'express';
import * as columnController from '../controllers/columnController';

const columnRouter = Router();

columnRouter.get('/', columnController.getColumns);
// columnRouter.post('/', columnController.getColumns);

export { columnRouter };
