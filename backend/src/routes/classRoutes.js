import express from 'express';
import multer from 'multer';
import {
  createClass,
  getClasses,
  getClassById,
  uploadStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  triggerSync,
  getDashboardMetrics,
  exportStudentsExcel,
  exportDashboardExcel,
} from '../controllers/classController.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getClasses);
router.post('/', requireAdmin, createClass);
router.get('/:classId', getClassById);
router.post('/:classId/students/upload', requireAdmin, upload.single('file'), uploadStudents);
router.post('/:classId/students', requireAdmin, addStudent);
router.put('/:classId/students/:studentId', requireAdmin, updateStudent);
router.delete('/:classId/students/:studentId', requireAdmin, deleteStudent);
router.get('/:classId/students/export', exportStudentsExcel);
router.post('/:classId/sync', requireAdmin, triggerSync);
router.get('/:classId/dashboard', getDashboardMetrics);
router.get('/:classId/dashboard/export', exportDashboardExcel);

export default router;
