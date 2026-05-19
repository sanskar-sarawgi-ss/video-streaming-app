import dotenv from 'dotenv'
dotenv.config({path: '.env'})

import { app } from './app.js'
import DbConnect from './db/index.js'
import logger from './utils/logger.js'

import('./task/convertToHlc.js').catch(error => {
    logger.error('Failed to load conversion task', { error: error.message });
});

DbConnect().then(() => {
    try{
        app.on('error' , (error) => {
            logger.error('Server error', { error });
            throw(error)
        })

        app.listen(process.env.PORT || 8000, () => {
            logger.info(`Server listening at port ${process.env.PORT || 8000}`);
        })

    }catch(error){
        logger.error('Server startup error', { error });
    }
}
).catch((error) => {
    logger.error('Database connection failed', { error });
})