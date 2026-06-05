import redisClient from '../../config/redis.js';
import { ApiError } from '../../utils/errorHandler.js';

class RoomService {
    static async createRoom(videoId, hostUser, participants = []) {
        const roomId = RoomService.generateRoomId();
        const roomKey = `room:${roomId}`;

        try {
            await redisClient.hset(roomKey, {
                videoId,
                hostUser: hostUser?.toString?.() || '',
                participants: JSON.stringify(participants.map((participant) => participant?.toString?.() || participant)),
                createdAt: Date.now().toString(),
                status: "active"
            });
        } catch (error) {
            throw new ApiError(500, "Failed to create stream room");
        }

        return roomId;
    }

    static async addParticipant(roomId, userId) {
        const roomKey = `room:${roomId}`;
        const roomData = await redisClient.hgetall(roomKey);

        if (!roomData || !roomData.videoId) {
            return null;
        }

        const participants = roomData.participants ? JSON.parse(roomData.participants) : [];
        const participantId = userId?.toString?.() || userId;

        if (participantId && !participants.includes(participantId)) {
            participants.push(participantId);
            await redisClient.hset(roomKey, {
                participants: JSON.stringify(participants)
            });
        }

        return { roomId, userId: participantId, videoId: roomData.videoId };
    }

    static generateRoomId() {
        return `${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default RoomService;
