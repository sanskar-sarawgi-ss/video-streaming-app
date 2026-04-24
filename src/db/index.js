import mongoose from "mongoose";
import { DBNAME } from "../constants.js";
import logger from "../utils/logger.js";

const DbConnect = async () => {
    try{
        logger.info('Attempting to connect to MongoDB database');
        const initConection = await mongoose.connect(`${process.env.MONGODB_URI}/${DBNAME}`)
        logger.info(`Connected to Database on port ${initConection.connection.port}`);
    }catch(error){
        logger.error(`Database connection error: ${error.message}`, { error });
        process.exit(1)
    }
}


export default DbConnect;