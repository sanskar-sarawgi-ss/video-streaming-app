import { app } from './app.js'
import DbConnect from './db/index.js'
import dotenv from 'dotenv'
import logger from './utils/logger.js'

dotenv.config({path: '.env'})

// Load the conversion task after environment is configured
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