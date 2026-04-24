import { Router } from "express";
import { 
    getUploadUrl, 
    uploadVideoMetadata, 
    getVideoById, 
    updateVideoStatus, 
    togglePublishStatus, 
    deleteVideo 
} from "../controllers/video.controller.js";
import { JwtAuth } from "../middlewares/auth.middlerware.js";

const router = Router();

// Public routes
router.route('/:videoId').get(getVideoById);

// Protected routes (require authentication)
router.use(JwtAuth); // Apply JWT authentication to all routes below

// Get presigned S3 URL for uploading video
router.route('/upload-url').post(getUploadUrl);

// Save video metadata after upload
router.route('/upload').post(uploadVideoMetadata);

// Toggle publish status
router.route('/:videoId/publish').patch(togglePublishStatus);

// Delete video
router.route('/:videoId').delete(deleteVideo);

export default router;
