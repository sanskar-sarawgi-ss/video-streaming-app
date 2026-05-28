import cron from 'node-cron';
import { Video } from '../models/video.models.js';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { FFmpegService } from '../services/FFmpegServices/index.js';
import { HlcService } from '../services/hlcServices/index.js'
import { S3Service } from '../services/s3Services/index.js';
import { FileSystemService } from '../services/FileSystemServices/index.js';

const convertVideoToHlc = async () => {
    logger.info('Starting video conversion to HLS format...');

    // Check if FFmpeg is available
    if (!(await FFmpegService.isAvailable())) {
        logger.error('Skipping video conversion due to missing FFmpeg');
        return;
    }
    
    try {
        // Get videos in pending state
        const videos = await Video.find({ status: 'pending' });
        if (videos.length === 0) {
            logger.info('No pending videos to convert');
            return;
        }
        
        logger.info(`Found ${videos.length} pending videos`);

        // Process in batches to limit concurrency
        const batchSize = 5;
        for (let i = 0; i < videos.length; i += batchSize) {
            const batch = videos.slice(i, i + batchSize);
            logger.info(`Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} videos`);
            const results = await Promise.allSettled(batch.map(video => convertVideoToHlcInThread(video)));
            results.forEach(async (result, index) => {
                if (result.status === 'rejected') {
                    await Video.findByIdAndUpdate(batch[index]._id, { status: 'failed' });
                    logger.error(`Failed to process video ${batch[index]._id}`, result.reason);
                }
            });
        }

        logger.info('Video conversion task completed');
    } catch (error) {
        logger.error('Error in convertVideoToHlc', error);
    }
};

const convertVideoToHlcInThread = async (video) => {
    const videoId = video._id.toString();
    const channelId = video.channel ? video.channel.toString() : 'unknown';
    let outputFolderPath = null

    logger.info(`Starting conversion for video ${videoId}`);
    try {
        // Set status to processing
        await Video.findByIdAndUpdate(video._id, { status: 'processing' });
        // Get video file from S3
        outputFolderPath = await HlcService.convertVideoToHlc(video.videoFile, `${channelId}_${videoId}`)
        
        // Upload to S3
        const s3FolderKey = `videos/${videoId}`;
        const { uploadedFiles: uploadedFiles } = await S3Service.uploadFolder(outputFolderPath, s3FolderKey);
        const indexFileUrl = uploadedFiles.find(url => url.endsWith('index.m3u8'));
        if (!indexFileUrl) {
            throw new Error('Index file URL not found in upload response');
        }
        logger.info(`Uploaded HLS for video ${videoId} to S3`);

        // Update video status and URL
        await Video.findByIdAndUpdate(video._id, {
            videoFile: indexFileUrl,
            status: 'ready'
        });
        logger.info(`Updated video ${videoId} to ready status`);

    } catch (error) {
        logger.error(`Error processing video ${videoId}`, error);
        throw error; // Re-throw to mark as rejected in Promise.allSettled
    } finally {
        // Cleanup temp files
        try {
            await FileSystemService.cleanupDirectory(outputFolderPath)
        } catch (cleanupError) {
            logger.error(`Error during cleanup for video ${videoId}`, cleanupError);
        }
    }
};

// Schedule the task to run every 15 minutes
if(process.env.ENVIROMENT != 'development'){  
    cron.schedule('*/15 * * * *', convertVideoToHlc);
    convertVideoToHlc()
}

convertVideoToHlc()

// test => node -c src/task/convertToHlc.js