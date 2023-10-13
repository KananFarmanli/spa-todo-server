import { Router } from 'express';
import * as commentController from '../controllers/commentController';

const commentRoute = Router();

commentRoute.get('/:taskId', commentController.getCommentByTaskId);
commentRoute.post('/', commentController.createComment);
commentRoute.delete('/:id', commentController.deleteComment);

export { commentRoute };
