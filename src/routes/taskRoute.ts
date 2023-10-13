import { Router } from 'express';
import * as taskController from '../controllers/taskController';

const taskRouter = Router();

taskRouter.get('/', taskController.getTasks);
taskRouter.post('/', taskController.createTask);
taskRouter.post('/:parentId', taskController.createSubTask);
taskRouter.patch('/:id', taskController.updateTask);
// taskRouter.patch('/status/:id', taskController.updateStatus);
taskRouter.post('/:id/move', taskController.moveTaskInColumn);
taskRouter.delete('/:id', taskController.removeTask);
//taskRouter.patch('/status/:id', taskController.updateTaskStatus);

export { taskRouter };
