import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  listEquipments, getEquipment, getEquipmentStats,
  createEquipment, updateEquipment, deleteEquipment,
} from '../controllers/equipment.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/',          listEquipments);
router.post('/',         createEquipment);
router.get('/:id',       getEquipment);
router.get('/:id/stats', getEquipmentStats);
router.put('/:id',       updateEquipment);
router.delete('/:id',    deleteEquipment);

export default router;
