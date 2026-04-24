import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "./logger.js";


const getS3Client = () => {
    
    const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY 
        }
    });

    return s3Client;
}

export const getS3PresignedUrl = async (fileName, fileType, fileSize) => {
    
    const s3Client = getS3Client();

    const bucketName = process.env.AWS_S3_BUCKET_NAME?.trim().replace(/^['"]|['"]$/g, "") || process.env.AWS_S3_BUCKET?.trim().replace(/^['"]|['"]$/g, "");
    if (!bucketName) {
        throw new Error('AWS_S3_BUCKET_NAME or AWS_S3_BUCKET is required');
    }

    const key = `videos/${Date.now()}-${fileName}`;
    
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: fileType,
        ContentLength: fileSize
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600 // 1 hour expiration
    });

    return {
        presignedUrl,
        key,
        bucket: bucketName
    };
};