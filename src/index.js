import dotenv from 'dotenv'
await dotenv.config({path: '.env'})

import { app } from './app.js'
import DbConnect from './config/db.js'
import logger from './utils/logger.js'
import SocketService from './config/socket.js'
import http from 'http'
import redisClient from './config/redis.js'

// why we are getting failed to load error 
import('./task/convertToHlc_v2.js').catch(error => {
    logger.error('Failed to load conversion task', { message: error.message, stack: error.stack });
});

DbConnect().then(async () => {
    try{
        // Create HTTP server from Express app
        const server = http.createServer(app);

        app.on('error' , (error) => {
            logger.error('Server error', { error });
            throw(error)
        })

        // start socket service with server instance
        const socketService = new SocketService()
        await socketService.initSocket(server);

        server.listen(process.env.PORT || 8000, () => {
            logger.info(`Server listening at port ${process.env.PORT || 8000}`);
        })

    }catch(error){
        logger.error('Server startup error', { error });
    }
}
).catch((error) => {
    logger.error('Database connection failed', { error });
})