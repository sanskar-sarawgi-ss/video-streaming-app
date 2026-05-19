import { Router } from "express";
import {
    getUploadUrl,
    uploadVideoMetadata,
    getVideoById,
    getChannelVideos,
    updateVideoStatus,
    togglePublishStatus,
    deleteVideo
} from "../controllers/video.controller.js";
import { JwtAuth } from "../middlewares/auth.middlerware.js";

const router = Router();

/**
 * @swagger
 * /videos/{videoId}:
 *   get:
 *     summary: Get video details by ID
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Video'
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/:videoId').get(getVideoById);

// Protected routes (require authentication)
router.use(JwtAuth); // Apply JWT authentication to all routes below

/**
 * @swagger
 * /videos/list/{channelId}:
 *   get:
 *     summary: Get channel videos
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Channel videos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/list/:channelId').get(getChannelVideos);

/**
 * @swagger
 * /videos/upload-url:
 *   post:
 *     summary: Get presigned S3 URL for video upload
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *               - fileSize
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the video file
 *               fileType:
 *                 type: string
 *                 description: MIME type of the video file
 *                 example: "video/mp4"
 *               fileSize:
 *                 type: number
 *                 description: Size of the video file in bytes
 *                 example: 10485760
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         presignedUrl:
 *                           type: string
 *                           description: Presigned URL for S3 upload
 *                         key:
 *                           type: string
 *                           description: S3 object key
 *                         bucket:
 *                           type: string
 *                           description: S3 bucket name
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/upload-url').post(getUploadUrl);

/**
 * @swagger
 * /videos/upload:
 *   post:
 *     summary: Save video metadata after successful upload to S3
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - s3Key
 *             properties:
 *               title:
 *                 type: string
 *                 description: Video title
 *               description:
 *                 type: string
 *                 description: Video description
 *               s3Key:
 *                 type: string
 *                 description: S3 object key of the uploaded video
 *               thumbnail:
 *                 type: string
 *                 description: Thumbnail URL (optional)
 *               duration:
 *                 type: number
 *                 description: Video duration in seconds (optional)
 *     responses:
 *       201:
 *         description: Video metadata saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Video'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/upload').post(uploadVideoMetadata);

/**
 * @swagger
 * /videos/{videoId}/publish:
 *   patch:
 *     summary: Toggle video publish status
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video publish status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Video'
 *       403:
 *         description: Not authorized to update this video
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/:videoId/publish').patch(togglePublishStatus);

/**
 * @swagger
 * /videos/{videoId}:
 *   delete:
 *     summary: Delete video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: Not authorized to delete this video
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/:videoId').delete(deleteVideo);

export default router;
