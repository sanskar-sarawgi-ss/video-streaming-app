import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/errorHandler.js";
import ApiResponce from "../utils/apiResponce.js";
import { Video } from "../models/video.models.js";
import { getS3PresignedUrl } from "../utils/s3.js";
import logger from "../utils/logger.js";
import { changeUserPassword } from "./user.controller.js";
import { Channel } from "../models/channel.model.js";

/**
 * Get presigned S3 URL for video upload
 * POST /videos/upload-url
 */
export const getUploadUrl = asyncHandler(async (req, res) => {
    const { fileName, fileType, fileSize } = req.body;

    // Validation
    if (!fileName || !fileType || !fileSize) {
        throw new ApiError(400, "fileName, fileType, and fileSize are required");
    }

    // Validate file type (video formats only)
    const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (!allowedVideoTypes.includes(fileType)) {
        throw new ApiError(400, "Only video files are allowed");
    }

    // Validate file size (max 500MB)
    const maxFileSize = 500 * 1024 * 1024;
    if (fileSize > maxFileSize) {
        throw new ApiError(400, "File size exceeds maximum limit of 500MB");
    }

    try {
        const uploadData = await getS3PresignedUrl(fileName, fileType, fileSize);

        return res.status(200).json(
            new ApiResponce(200, uploadData, "Presigned URL generated successfully")
        );
    } catch (error) {
        logger.error('Failed to get presigned URL', { error });
        throw new ApiError(500, "Failed to generate upload URL");
    }
});

/**
 * Save video metadata after successful upload to S3
 * POST /videos/upload
 */
export const uploadVideoMetadata = asyncHandler(async (req, res) => {
    const { title, description, s3Key, thumbnail, duration } = req.body;
    const userId = req.user?._id;

    // Get user channel id
    let channelId = null;
    try {
        const channel = await Channel.findOne({ userId: userId });
        channelId = channel ? channel._id : null;
    } catch (error) {
        logger.warn('Failed to fetch user channel, proceeding without channel', { error });
    }

    // Validation
    if (!title || !description || !s3Key) {
        throw new ApiError(400, "title, description, and s3Key are required");
    }

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    // Validate duration
    if (duration && (typeof duration !== 'number' || duration <= 0)) {
        throw new ApiError(400, "Duration must be a positive number");
    }

    // check if s3 url have video 
    try {
        // Create video document
        const video = await Video.create({
            videoFile: `${process.env.AWS_S3_BUCKET_URL}/${s3Key}`, // S3 video URL
            thumbnail: thumbnail || null, // Make thumbnail optional for now
            title,
            description,
            duration: duration || 0,
            owner: userId,
            channel: channelId,
            status: "pending"
        });

        logger.info(`Video metadata saved for video ${video._id} by user ${userId}`);
        return res.status(201).json(
            new ApiResponce(201, video, "Video metadata saved successfully. Video is being processed.")
        );
    } catch (error) {
        logger.error('Failed to save video metadata', { error: error.message, stack: error.stack });
        throw new ApiError(500, "Failed to save video metadata");
    }
});

/**
 * Get video details
 * GET /videos/:videoId
 */
export const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Increment views
    video.views += 1;
    await video.save();

    return res.status(200).json(
        new ApiResponce(200, video, "Video fetched successfully")
    );
});

/**
 * Get user's videos
 * GET /videos/list/:channelId
 */
export const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = req.params.channelId;

    try {
        const videos = await Video.find({ channel: channelId })
            .sort({ createdAt: -1 });

        return res.status(200).json(
            new ApiResponce(200, videos, "Channel videos fetched successfully")
        );
    } catch (error) {
        logger.error('Failed to fetch channel videos', { error });
        throw new ApiError(500, "Failed to fetch videos");
    }
});

/**
 * Update video status
 * PATCH /videos/:videoId/status
 */
export const updateVideoStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { status } = req.body;
    const userId = req.user?._id;

    if (!videoId || !status) {
        throw new ApiError(400, "Video ID and status are required");
    }

    const validStatuses = ["failed", "ready", "processing", "pending"];
    if (!validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if user is the owner
    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "Not authorized to update this video");
    }

    video.status = status;
    await video.save();

    return res.status(200).json(
        new ApiResponce(200, video, "Video status updated successfully")
    );
});

/**
 * Publish/Unpublish video
 * PATCH /videos/:videoId/publish
 */
export const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if user is the owner
    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "Not authorized to update this video");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    return res.status(200).json(
        new ApiResponce(200, video, `Video ${video.isPublished ? 'published' : 'unpublished'} successfully`)
    );
});

/**
 * Delete video
 * DELETE /videos/:videoId
 */
export const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if user is the owner
    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "Not authorized to delete this video");
    }

    // TODO: Delete video file from S3 bucket
    // await deleteFromS3(video.videoFile);

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(
        new ApiResponce(200, {}, "Video deleted successfully")
    );
});
