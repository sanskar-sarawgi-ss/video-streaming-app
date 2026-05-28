import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger.js';

export class FileSystemService {
    
    static ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            logger.info(`Created directory: ${dirPath}`);
        }
    }

    static async deleteFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`Deleted: ${filePath}`);
            }
        } catch (error) {
            logger.error(`Failed to delete file: ${filePath}`, error);
            throw error;
        }
    }

    static async cleanupDirectory(dirPath) {
        try {
            if (fs.existsSync(dirPath)) {
                fs.rmSync(dirPath, { recursive: true, force: true });
                logger.info(`Cleaned up directory: ${dirPath}`);
            }
        } catch (error) {
            logger.error(`Failed to cleanup: ${dirPath}`, error);
            throw error;
        }
    }
}