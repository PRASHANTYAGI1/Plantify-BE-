// Routes/MLRout.js
import express from 'express';
const router = express.Router();

import upload from '../Middleware/uploadMiddleware.js';
import { isAuthenticated } from '../Middleware/auth.js';
import * as MlController from '../controllers/MlController.js'; // Use a better alias, like MlController

// POST /api/ml/detect-disease
router.post(
    '/detect-disease', 
    isAuthenticated,
    upload.single('plantImage'), 
    // FIX: The function is exported as 'runMLModel', so you must reference it as MlController.runMLModel
    MlController.runMLModel 
);

export default router;