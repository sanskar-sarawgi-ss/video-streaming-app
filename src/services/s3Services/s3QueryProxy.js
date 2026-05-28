import logger from "../../utils/logger.js";
import {S3_CONFIG} from './index.js'

export default class S3QueryProxy {

    constructor(operation, operationMessage) {
        this.operation = operation;
        this.operationMessage = operationMessage;
    }

    async execute(retries = 0){
        try {
            logger.info(`[S3] Executing: ${this.operationMessage}`);
            const result = await this.operation();
            logger.info(`[S3] Success: ${this.operationMessage}`);
            return result;
        } catch (error) {
            if (retries < S3_CONFIG.RETRY_ATTEMPTS) {
                logger.warn(`[S3] Retrying ${this.operationMessage} (attempt ${retries + 1})`);
                await this.delay(S3_CONFIG.RETRY_DELAY);
                return this.execute(retries + 1);
            }

            logger.error(`[S3] Failed: ${this.operationMessage}`, { error: error.message });
            throw error;
        }
    }

    async delay(ms) { 
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}