import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
import logger from './logger.js';
          


const UploadOnCloudinary = async (localFilePath) => {
    try{

        cloudinary.config({ 
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
            api_key: process.env.CLOUDINARY_API_KEY, 
            api_secret: process.env.CLOUDINARY_API_SECRET 
        });

        if(!localFilePath) return null
        const res = await cloudinary.uploader.upload(localFilePath,{ resource_type: "auto" });
        
        fs.unlinkSync(localFilePath)
        return res
    }catch(error){
        logger.error('Cloudinary upload error', { error });
        return error
    }
}

export { UploadOnCloudinary }
