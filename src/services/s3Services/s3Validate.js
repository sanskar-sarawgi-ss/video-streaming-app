import fs from 'fs';

export default class S3Validator {
    static validateFileName(fileName, fileType) {
        if (!fileName || typeof fileName !== 'string') {
            throw new Error('Valid fileName is required');
        }
        if (!fileType || typeof fileType !== 'string') {
            throw new Error('Valid fileType is required');
        }
    }
 
    static validateFilePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Valid filePath is required');
        }
        if (!fs.existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`);
        }
    }
 
    static validateFolderPath(folderPath) {
        if (!folderPath || typeof folderPath !== 'string') {
            throw new Error('Valid folderPath is required');
        }
        if (!fs.existsSync(folderPath)) {
            throw new Error(`Folder path does not exist: ${folderPath}`);
        }
    }

    static validateS3Key(s3Key) {
        if (!s3Key || typeof s3Key !== 'string') {
            throw new Error('Valid s3Key is required');
        }
    }

    static validateS3Config(accessKey, secretKey) {
        if (!accessKey || !secretKey) 
            throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required');
    }
}