import { S3Client, PutObjectCommand, HeadBucketRequest$, HeadBucketCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "./logger.js";
import fs from "fs";


const getS3Client = () => {
    // Validate required environment variables
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required');
    }

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

    const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
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

export const getS3ObjectUrl = (key) => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
    return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
};

export const uploadFolderToS3 = async (folderPath, s3FolderKey) => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
    
    if (!bucketName) {
        throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
    }

    if (!folderPath || !s3FolderKey) {
        throw new Error('folderPath and s3FolderKey are required');
    }

    if (!fs.existsSync(folderPath)) {
        throw new Error(`Folder path does not exist: ${folderPath}`);
    }

    const s3Client = getS3Client();
    const files = fs.readdirSync(folderPath);

    if (files.length === 0) {
        logger.warn(`No files found in folder: ${folderPath}`);
        return { keys: [] };
    }

    const uploadPromises = files.map((file) => {
        const localFilePath = `${folderPath}/${file}`;
        const s3Key = `${s3FolderKey}/${file}`;
        return uploadFileToS3(localFilePath, s3Key);
    });

    try {
        await Promise.all(uploadPromises);
        const uploadedUrls = files.map(file => `${process.env.AWS_S3_BUCKET_URL}/${s3FolderKey}/${file}`);
        logger.info(`Uploaded ${files.length} files to S3 under ${s3FolderKey}`);
        return { keys: uploadedUrls };
    } catch (error) {
        logger.error('Error uploading folder to S3', { error: error.message });
        throw error;
    }
};

export const uploadFileToS3 = async (localFilePath, s3Key) => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    console.log(process.env.AWS_S3_BUCKET_NAME)
    
    if (!bucketName) {
        throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
    }

    if (!localFilePath || !s3Key) {
        throw new Error('localFilePath and s3Key are required');
    }

    if (!fs.existsSync(localFilePath)) {
        throw new Error(`File does not exist: ${localFilePath}`);
    }

    try {
        const fileContent = fs.readFileSync(localFilePath);
        
        if (!fileContent || fileContent.length === 0) {
            throw new Error(`File is empty: ${localFilePath}`);
        }

        const s3Client = getS3Client();
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileContent
        });
        
        await s3Client.send(command);
        logger.info(`File uploaded to S3: ${s3Key}`);
    } catch (error) {
        logger.error(`Failed to upload file to S3: ${localFilePath}`, { 
            error: error.message,
            s3Key 
        });
        throw error;
    }
};

export const getObjectMetaDetail = async (s3Key) => {
    try {
        const s3Client = getS3Client()
        const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;

        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: s3Key
        })

        objDetail = await s3Client.send(command);

        return true, objDetail;
    } catch (error) {
        logger.error(`Failed to get key detail: ${localFilePath}`, { 
            error: error.message,
            s3Key 
        });
        throw error;

        return false, null;
    }
}