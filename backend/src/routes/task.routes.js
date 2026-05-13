import { Router } from 'express';
import {
  createTask, listTasks, getTask,
  updateTask, deleteTask,
  addComment, changeStatus, addCobrar,
} from '../controllers/task.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const taskRoutes = Router();

taskRoutes.use(authMiddleware);
taskRoutes.get('/',                listTasks);
taskRoutes.post('/',               createTask);
taskRoutes.get('/:id',             getTask);
taskRoutes.put('/:id',             updateTask);
taskRoutes.delete('/:id',          deleteTask);
taskRoutes.post('/:id/comments',   addComment);
taskRoutes.patch('/:id/status',    changeStatus);
taskRoutes.post('/:id/cobrar',     addCobrar);
