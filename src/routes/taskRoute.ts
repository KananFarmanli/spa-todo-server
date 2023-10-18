import { Router } from 'express';
import * as taskController from '../controllers/taskController';

const taskRouter = Router();

taskRouter.get('/', taskController.getTasks);
taskRouter.post('/', taskController.createTask);
taskRouter.post('/:parentId', taskController.createSubTask);
taskRouter.post('/:id/move', taskController.moveTaskInColumn);
taskRouter.delete('/:id', taskController.removeTask);
taskRouter.patch('/status/subtask/:id', taskController.updateSubtaskStatus);
taskRouter.patch('/status/:id', taskController.updateTaskStatus);
taskRouter.patch('/:id', taskController.updateTaskSubtask);
taskRouter.get('/:id', taskController.getTaskById);

export { taskRouter };

