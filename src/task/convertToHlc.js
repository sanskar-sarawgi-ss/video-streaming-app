import cron from 'node-cron';
import { Video } from '../models/video.models.js';
import fs from 'fs';
import path from 'path';
import { uploadFileToS3, uploadFolderToS3 } from '../utils/s3.js';
import logger from '../utils/logger.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const checkFFmpeg = async () => {
    try {
        await execAsync('ffmpeg -version');
        logger.info('FFmpeg is available');
        return true;
    } catch (error) {
        logger.error('FFmpeg is not installed or not in PATH', error);
        return false;
    }
};

const convertVideoToHlc = async () => {
    logger.info('Starting video conversion to HLS format...');

    // Check if FFmpeg is available
    if (!(await checkFFmpeg())) {
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

    logger.info(`Starting conversion for video ${videoId}`);

    let tempFilePath = null;
    let outputFolderPath = null;

    try {
        // Set status to processing
        await Video.findByIdAndUpdate(video._id, { status: 'processing' });

        // Download video from S3
        tempFilePath = await getVideoFromS3(video.videoFile);
        logger.info(`Downloaded video ${videoId} to ${tempFilePath}`);

        // Convert to HLS
        outputFolderPath = await convertVideoToHlcFormat(tempFilePath, videoId, channelId);
        logger.info(`Converted video ${videoId} to HLS at ${outputFolderPath}`);

        // Upload to S3
        const indexFilePath = path.join(outputFolderPath, `${videoId}-${channelId}-index.m3u8`);
        if (!fs.existsSync(indexFilePath)) {
            throw new Error(`Index file not found: ${indexFilePath}`);
        }
        const s3FolderKey = `videos/${videoId}`;
        const { keys: publicUrls } = await uploadFolderToS3(outputFolderPath, s3FolderKey);
        const indexFileUrl = publicUrls.find(url => url.endsWith('index.m3u8'));
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
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                logger.info(`Cleaned up temp file ${tempFilePath}`);
            }
            if (outputFolderPath && fs.existsSync(outputFolderPath)) {
                fs.rmSync(outputFolderPath, { recursive: true, force: true });
                logger.info(`Cleaned up output folder ${outputFolderPath}`);
            }
        } catch (cleanupError) {
            logger.error(`Error during cleanup for video ${videoId}`, cleanupError);
        }
    }
};

const getVideoFromS3 = async (publicUrl) => {
    if (!publicUrl || typeof publicUrl !== 'string') {
        throw new Error('Invalid public URL provided');
    }

    const tempDir = './temp/input';
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`);

    try {
        const response = await fetch(publicUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
        return tempFilePath;
    } catch (error) {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        throw error;
    }
};

const convertVideoToHlcFormat = async (inputFilePath, videoId, channelId) => {
    if (!fs.existsSync(inputFilePath)) {
        throw new Error(`Input file does not exist: ${inputFilePath}`);
    }

    const outputFolderPath = path.join('./temp/output', channelId, videoId);
    if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath, { recursive: true });
    }

    const indexOutputFilePath = path.join(outputFolderPath, `${videoId}-${channelId}-index.m3u8`);
    const outputFilePath = path.join(outputFolderPath, 'segment%03d.ts');

    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-i', inputFilePath,
            '-codec:v', 'libx264',
            '-codec:a', 'aac',
            '-hls_time', '10',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', outputFilePath,
            '-start_number', '0',
            indexOutputFilePath
        ]);

        ffmpeg.stderr.on('data', (data) => {
            logger.debug(`FFmpeg stderr: ${data}`);
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve(outputFolderPath);
            } else {
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });

        ffmpeg.on('error', (error) => {
            reject(new Error(`FFmpeg spawn error: ${error.message}`));
        });
    });
};

// Schedule the task to run every 15 minutes
if(process.env.ENVIROMENT != 'development'){  
    cron.schedule('*/15 * * * *', convertVideoToHlc);
    convertVideoToHlc()
}

// test => node -c src/task/convertToHlc.js