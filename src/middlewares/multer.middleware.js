import multer from "multer";
import fs from 'fs'

const storage = multer.diskStorage({
    destination: function (req, file, cb) {

        if(!fs.existsSync('./public/temp')) {
            fs.mkdirSync('./public/temp', { recursive: true })
        }

        cb(null, './public/temp') 
    },
    filename: function (req, file, cb) {
        // Use the original name of the file as the filename with some unique identifier to avoid conflicts
        let fileName = Date.now() + '-' + file.originalname
        cb(null, fileName)
    }
})
  

export const upload = multer({ storage: storage })