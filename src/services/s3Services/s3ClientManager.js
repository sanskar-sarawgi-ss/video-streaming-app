// we can use singletone pattern because it will avoid creating instance again and again for single thread 
import { S3Client } from "@aws-sdk/client-s3";
import logger from "../../utils/logger.js";
import S3Validator from './s3Validate.js'

class S3ClientManager {
    static s3Instance = null;

    static getS3Client() {
        if(!S3ClientManager.s3Instance){
            S3Validator.validateS3Config(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY)

            S3ClientManager.s3Instance = new S3Client({
                region: process.env.AWS_REGION || 'us-east-1',
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY 
                }
            });
            
            logger.info('S3Client created');
        }
        return S3ClientManager.s3Instance
    }
}

export default S3ClientManager;