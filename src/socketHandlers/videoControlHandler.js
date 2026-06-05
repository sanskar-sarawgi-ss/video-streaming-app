import redisClient from '../config/redis.js';

export async function videoStateChangeHandler(socket, data) {
    console.log("Video control event received", data);

    const videoState = {
        currentTime: data.currentTime,
        isPlaying: data.isPlaying,
        updatedAt: Date.now()
    };

    await redisClient.hset(
      `room:${data.roomId}:video`,
      videoState
    );

    socket.to(data.roomId).emit("videoRoom:sync", videoState);
    socket.to(data.roomId).emit("videoControl:sync", videoState);
}

export async function joinRoomHandler(socket, data) {
    console.log("Join room event received", data);
    socket.join(data.roomId);

    await redisClient.sadd(`room:${data.roomId}:participants`, data.user_id || socket.id)

    const videoStateData = await redisClient.hgetall(`room:${data.roomId}:video`)
    if (videoStateData && Object.keys(videoStateData).length > 0) {
        socket.emit("videoRoom:sync", {
            currentTime: Number(videoStateData.currentTime || 0),
            isPlaying: videoStateData.isPlaying === true || videoStateData.isPlaying === 'true',
            updatedAt: Number(videoStateData.updatedAt || Date.now())
        });
    }
}
