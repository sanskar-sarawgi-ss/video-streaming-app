import fs from 'fs';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import S3ClientManager from './s3ClientManager.js'
import S3QueryProxy from './s3QueryProxy.js'
import S3Validator from './s3Validate.js';
import logger from '../../utils/logger.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileSystemService } from '../FileSystemServices/index.js';
import path from 'path';

export const S3_CONFIG = {
    REGION: process.env.AWS_REGION || 'us-east-1',
    BUCKET: process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET,
    PRESIGNED_URL_EXPIRY: 3600, // 1 hour
    VIDEO_FOLDER: 'videos',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // milliseconds
};

class S3Service {

    static async getPresignedUploadUrl(fileName, fileType) {
        try {
            
            S3Validator.validateFileName(fileName, fileType);
 
            const s3Client = S3ClientManager.getS3Client();
            const key = `${S3_CONFIG.VIDEO_FOLDER}/${Date.now()}-${fileName}`;
 
            const command = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: key,
                ContentType: fileType
            });

            // USE PROXY to trigger Execute with retry + logging for all command
            const proxy = new S3QueryProxy(
                () => getSignedUrl(s3Client, command, { expiresIn: S3_CONFIG.PRESIGNED_URL_EXPIRY }),
                `getPresignedUrl for ${fileName}`
            );
 
            const presignedUrl = await proxy.execute();
 
            return {
                presignedUrl,
                key,
                bucket: S3_CONFIG.BUCKET,
                expiresIn: S3_CONFIG.PRESIGNED_URL_EXPIRY
            };
        } catch (error) {
            logger.error('Failed to get presigned URL', { error: error.message, fileName });
            throw error;
        }
    }
 
    // Get public URL for an S3 object
    static getObjectUrl(key) {
        S3Validator.validateS3Key(key);
        return `https://${S3_CONFIG.BUCKET}.s3.${S3_CONFIG.REGION}.amazonaws.com/${key}`;
    }
 
    // Upload single file to S3
    static async uploadFile(localFilePath, s3Key) {
        try {
            S3Validator.validateFilePath(localFilePath);
            S3Validator.validateS3Key(s3Key);
 
            const fileContent = fs.readFileSync(localFilePath);
            
            if (!fileContent || fileContent.length === 0) {
                throw new Error(`File is empty: ${localFilePath}`);
            }
 
            const s3Client = S3ClientManager. getS3Client();
            const command = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: s3Key,
                Body: fileContent
            });
 
 
            const proxy = new S3QueryProxy(
                () => s3Client.send(command),
                `uploadFile: ${s3Key}`
            );
 
            await proxy.execute();
 
            const objectUrl = this.getObjectUrl(s3Key);
            logger.info(`File uploaded successfully: ${s3Key}`, { url: objectUrl });
 
            return {
                success: true,
                key: s3Key,
                url: objectUrl,
                bucket: process.env.AWS_S3_BUCKET_NAME
            };
        } catch (error) {
            logger.error(`Failed to upload file: ${localFilePath}`, { 
                error: error.message,
                s3Key 
            });
            throw error;
        }
    }
 
    // Upload entire folder to S3
    static async uploadFolder(folderPath, s3FolderKey) {
        try {
            S3Validator.validateFolderPath(folderPath);
            S3Validator.validateS3Key(s3FolderKey);
 
            const files = fs.readdirSync(folderPath);
 
            if (files.length === 0) {
                logger.warn(`No files found in folder: ${folderPath}`);
                return { success: true, uploadedFiles: [], count: 0 };
            }
 
            const uploadPromises = files.map(file => {
                const localFilePath = `${folderPath}/${file}`;
                const s3Key = `${s3FolderKey}/${file}`;
                return this.uploadFile(localFilePath, s3Key);
            });
 
            const results = await Promise.all(uploadPromises);
            const uploadedUrls = results.map(r => r.url);
 
            logger.info(`Uploaded ${files.length} files to S3 under ${s3FolderKey}`);
 
            return {
                success: true,
                uploadedFiles: uploadedUrls,
                count: files.length
            };
        } catch (error) {
            logger.error(`Failed to upload folder: ${folderPath}`, { 
                error: error.message,
                s3FolderKey 
            });
            throw error;
        }
    }
 
    // Get object metadata
    static async getObjectMetadata(s3Key) {
        try {
            S3Validator.validateS3Key(s3Key);
 
            const s3Client = S3ClientManager.getS3Client();
            const command = new HeadObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: s3Key
            });
 
 
            const proxy = new S3QueryProxy(
                () => s3Client.send(command),
                `getObjectMetadata: ${s3Key}`
            );
 
            const metadata = await proxy.execute();
 
            return {
                success: true,
                metadata: {
                    size: metadata.ContentLength,
                    type: metadata.ContentType,
                    lastModified: metadata.LastModified,
                    etag: metadata.ETag,
                    storageClass: metadata.StorageClass
                }
            };
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                logger.warn(`Object not found: ${s3Key}`);
                return { success: false, metadata: null };
            }
            logger.error(`Failed to get object metadata: ${s3Key}`, { 
                error: error.message 
            });
            throw error;
        }
    }

    // Get public object
    static async getPublicObject(publicUrl, desDir) {
        try {
            const fileExt = publicUrl.split('.').at(-1)
            const randomStr = Math.random().toString(36).substr(2, 9)

            FileSystemService.ensureDirectory(desDir);
            const tempFilePath = path.join(desDir, `${Date.now()}_${randomStr}.${fileExt}`)

            const response = await fetch(publicUrl)
            if (!response.ok) throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)

            const arrayBuffer = await response.arrayBuffer()
            fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer))
            
            return tempFilePath
        } catch(error) {
            logger.error(`Failed to get object: ${publicUrl}`, { 
                error: error.message 
            });
            throw error;
        }
    }
}

// export const {
//     getObjectMetadata,
//     uploadFile,
//     uploadFolder,
//     getPresignedUploadUrl,
//     getObjectUrl
// } = S3Service;

export {
   S3ClientManager,
   S3Service
};