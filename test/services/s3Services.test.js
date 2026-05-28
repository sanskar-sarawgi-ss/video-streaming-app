import { jest } from '@jest/globals';
import fs from 'fs';
import { S3ClientManager, S3Service, S3_CONFIG } from '../../src/services/s3Services/index.js';
import S3Validator from '../../src/services/s3Services/s3Validate.js';
import S3QueryProxy from '../../src/services/s3Services/s3QueryProxy.js';

const originalEnv = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME
};

describe('S3 Service', () => {
    const fakeClient = { send: jest.fn() };

    beforeEach(() => {
        jest.restoreAllMocks();
        S3ClientManager.s3Instance = null;

        process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-access-key';
        process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret-key';
        process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
        process.env.AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'test-bucket';
    });

    afterEach(() => {
        process.env.AWS_ACCESS_KEY_ID = originalEnv.AWS_ACCESS_KEY_ID;
        process.env.AWS_SECRET_ACCESS_KEY = originalEnv.AWS_SECRET_ACCESS_KEY;
        process.env.AWS_REGION = originalEnv.AWS_REGION;
        process.env.AWS_S3_BUCKET_NAME = originalEnv.AWS_S3_BUCKET_NAME;
    });

    describe('S3ClientManager', () => {
        test('creates a singleton S3 client instance', () => {
            const client1 = S3ClientManager.getS3Client();
            const client2 = S3ClientManager.getS3Client();

            expect(client1).toBe(client2);
        });

        test('throws when AWS credentials are missing', () => {
            delete process.env.AWS_ACCESS_KEY_ID;
            delete process.env.AWS_SECRET_ACCESS_KEY;

            expect(() => S3ClientManager.getS3Client()).toThrow(
                'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required'
            );
        });
    });

    describe('S3Service.getPresignedUploadUrl', () => {
        test('returns signed upload details for a valid file', async () => {
            jest.spyOn(S3Validator, 'validateFileName').mockImplementation(() => {});
            jest.spyOn(S3ClientManager, 'getS3Client').mockReturnValue(fakeClient);
            jest.spyOn(S3QueryProxy.prototype, 'execute').mockResolvedValue('https://signed.example.com');

            const result = await S3Service.getPresignedUploadUrl('video.mp4', 'video/mp4');

            expect(result).toEqual(
                expect.objectContaining({
                    presignedUrl: 'https://signed.example.com',
                    bucket: S3_CONFIG.BUCKET,
                    expiresIn: S3_CONFIG.PRESIGNED_URL_EXPIRY
                })
            );
            expect(result.key).toContain(`${S3_CONFIG.VIDEO_FOLDER}/`);
        });

        test('throws when file name is invalid', async () => {
            jest.spyOn(S3Validator, 'validateFileName').mockImplementation(() => {
                throw new Error('Valid fileName is required');
            });

            await expect(S3Service.getPresignedUploadUrl('', 'video/mp4')).rejects.toThrow(
                'Valid fileName is required'
            );
        });
    });

    describe('S3Service.getObjectUrl', () => {
        test('returns a valid public S3 object URL', () => {
            const key = 'videos/test.mp4';
            const url = S3Service.getObjectUrl(key);

            expect(url).toBe(
                `https://${S3_CONFIG.BUCKET}.s3.${S3_CONFIG.REGION}.amazonaws.com/${key}`
            );
        });

        test('throws when s3 key is invalid', () => {
            expect(() => S3Service.getObjectUrl('')).toThrow('Valid s3Key is required');
        });
    });

    describe('S3Service.uploadFile', () => {
        test('uploads file and returns upload metadata', async () => {
            jest.spyOn(S3Validator, 'validateFilePath').mockImplementation(() => {});
            jest.spyOn(S3Validator, 'validateS3Key').mockImplementation(() => {});
            jest.spyOn(S3ClientManager, 'getS3Client').mockReturnValue(fakeClient);
            jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('data'));
            jest.spyOn(S3QueryProxy.prototype, 'execute').mockResolvedValue({});

            const result = await S3Service.uploadFile('/tmp/video.mp4', 'videos/video.mp4');

            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    key: 'videos/video.mp4',
                    url: `https://${S3_CONFIG.BUCKET}.s3.${S3_CONFIG.REGION}.amazonaws.com/videos/video.mp4`,
                    bucket: S3_CONFIG.BUCKET
                })
            );
        });

        test('throws when file content is empty', async () => {
            jest.spyOn(S3Validator, 'validateFilePath').mockImplementation(() => {});
            jest.spyOn(S3Validator, 'validateS3Key').mockImplementation(() => {});
            jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from(''));

            await expect(
                S3Service.uploadFile('/tmp/video.mp4', 'videos/video.mp4')
            ).rejects.toThrow('File is empty: /tmp/video.mp4');
        });
    });

    describe('S3Service.uploadFolder', () => {
        test('uploads all files from a folder and returns urls', async () => {
            jest.spyOn(S3Validator, 'validateFolderPath').mockImplementation(() => {});
            jest.spyOn(S3Validator, 'validateS3Key').mockImplementation(() => {});
            jest.spyOn(fs, 'readdirSync').mockReturnValue(['file1.mp4', 'file2.mp4']);
            const uploadFileSpy = jest
                .spyOn(S3Service, 'uploadFile')
                .mockResolvedValueOnce({ url: 'url1' })
                .mockResolvedValueOnce({ url: 'url2' });

            const result = await S3Service.uploadFolder('/tmp/folder', 'videos');

            expect(uploadFileSpy).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true, uploadedFiles: ['url1', 'url2'], count: 2 });
        });

        test('returns empty result for an empty folder', async () => {
            jest.spyOn(S3Validator, 'validateFolderPath').mockImplementation(() => {});
            jest.spyOn(S3Validator, 'validateS3Key').mockImplementation(() => {});
            jest.spyOn(fs, 'readdirSync').mockReturnValue([]);

            const result = await S3Service.uploadFolder('/tmp/empty', 'videos');

            expect(result).toEqual({ success: true, uploadedFiles: [], count: 0 });
        });
    });

    describe('S3Service.getObjectMetadata', () => {
        test('returns object metadata for existing key', async () => {
            jest.spyOn(S3Validator, 'validateS3Key').mockImplementation(() => {});
            jest.spyOn(S3ClientManager, 'getS3Client').mockReturnValue(fakeClient);
            jest.spyOn(S3QueryProxy.prototype, 'execute').mockResolvedValue({
                ContentLength: 123,
                ContentType: 'video/mp4',
                LastModified: '2025-01-01T00:00:00Z',
                ETag: 'etag123',
                StorageClass: 'STANDARD'
            });

            const result = await S3Service.getObjectMetadata('videos/video.mp4');

            expect(result).toEqual({
                success: true,
                metadata: {
                    size: 123,
                    type: 'video/mp4',
                    lastModified: '2025-01-01T00:00:00Z',
                    etag: 'etag123',
                    storageClass: 'STANDARD'
                }
            });
        });

        test('returns false if object does not exist', async () => {
            jest.spyOn(S3Validator, 'validateS3Key').mockImplementation(() => {});
            jest.spyOn(S3ClientManager, 'getS3Client').mockReturnValue(fakeClient);
            jest.spyOn(S3QueryProxy.prototype, 'execute').mockRejectedValue(
                Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' })
            );

            const result = await S3Service.getObjectMetadata('videos/missing.mp4');

            expect(result).toEqual({ success: false, metadata: null });
        });
    });
});
