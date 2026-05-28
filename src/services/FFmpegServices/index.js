import logger from '../../utils/logger.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

function spawnAsync(command, args, options = {}) {
    // we added promise to make the process awaitable and handle errors properly
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'pipe', ...options });
        let stdout = '';
        let stderr = '';

        if (child.stdout) {
            child.stdout.on('data', data => { stdout += data.toString(); });
        }
        if (child.stderr) {
            child.stderr.on('data', data => { stderr += data.toString(); });
        }

        child.on('error', reject);
        child.on('close', code => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                const error = new Error(`FFmpeg exited with code ${code}`);
                error.code = code;
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
            }
        });
    });
}

export class FFmpegService {
    
    static async isAvailable() {
        try {
            await execAsync('ffmpeg -version');
            logger.info('FFmpeg is available');
            return true;
        } catch (error) {
            logger.error('FFmpeg not installed', error);
            return false;
        }
    }

    static async convertToHls(inputPath, outputPath, outputSegmentFormat) {
        try {
            console.log({outputPath: outputPath, inputPath: inputPath, outputSegmentFormat: outputSegmentFormat})
            const args = [
                '-i', inputPath.replace(/\\/g, '/'),
                '-codec:v', 'libx264',
                '-codec:a', 'aac',
                '-hls_time', '10',
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', outputSegmentFormat.replace(/\\/g, '/'),
                '-start_number', '0',
                outputPath.replace(/\\/g, '/')
            ];

            await spawnAsync('ffmpeg', args);
            logger.info(`HLS conversion complete: ${outputPath}`);
            return true;
        } catch (error) {
            logger.error('FFmpeg conversion failed', {
                message: error.message,
                code: error.code,
                stdout: error.stdout,
                stderr: error.stderr
            });
            throw error;
        }
    }
}