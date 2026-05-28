// http live stream
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { S3Service } from '../s3Services/index.js';
import { FFmpegService } from '../FFmpegServices/index.js';
import { FileSystemService } from '../FileSystemServices/index.js';
import logger from '../../utils/logger.js';
import path from 'path';

const execAsync = promisify(exec);

export class HlcService {

    static async convertVideoToHlc(videoUrl, outFolderName) {
        let inputVideoFile = null
        try {

            logger.info('Starting video conversion to HLS format...')

            // get video file
            inputVideoFile = await S3Service.getPublicObject(videoUrl, './temp/hlc_input')

            // get input video file 
            const outputFolderPath = path.join('./temp/hlc_output', outFolderName)
            FileSystemService.ensureDirectory(outputFolderPath)

            const indexOutputFilePath = path.join(outputFolderPath, `${outFolderName}-index.m3u8`)
            const outputFilePath = path.join(outputFolderPath, 'segment%03d.ts')

            await FFmpegService.convertToHls(inputVideoFile, indexOutputFilePath, outputFilePath)

            return outputFolderPath

        } catch (error) {
            logger.error('Error in convertVideoToHlc', error);
        }
        finally {
            await FileSystemService.cleanupDirectory(inputVideoFile)
        }
    };
}
