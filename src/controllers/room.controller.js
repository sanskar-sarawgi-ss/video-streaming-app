import roomService from "../services/roomServices/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/errorHandler.js";
import ApiResponce from "../utils/apiResponce.js";
import { Video } from "../models/video.models.js";

export const createStreamRoom = asyncHandler(async (req, res) => {
    const { videoId } = req.body;
    const userId = req.user?._id;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const roomId = await roomService.createRoom(
        videoId,
        userId,
        userId ? [userId] : [],
    );

    const video = await Video.findById(videoId);

    res.status(201).json(
        new ApiResponce(201, { roomId, videoUrl: video.videoFile }, "Stream room created successfully")
    );
});

export const joinStreamRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.body;
    const userId = req.user?._id;

    if (!roomId) {
        throw new ApiError(400, "Room ID is required");
    }

    const room = await roomService.addParticipant(roomId, userId);
    if (!room) {
        throw new ApiError(404, "Room not found");
    }

    const video = await Video.findById(room.videoId)

    res.status(200).json(
        new ApiResponce(200, { roomId: room.roomId, videoUrl: video.videoFile }, "Successfully joined the stream room")
    );
});
