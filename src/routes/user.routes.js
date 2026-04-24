import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changeUserPassword} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { JwtAuth } from "../middlewares/auth.middlerware.js";


const router = Router()

router.route('/register').post(
    upload.fields([
        {
            name: 'coverImage',
            maxCount: 1
        },
        {
            name: 'avatar',
            maxCount: 1
        }
    ])
    ,registerUser)

router.route('/login').post(loginUser)

router.route('/logout').post(JwtAuth ,logoutUser)

router.route('/refresh-token').post(refreshAccessToken)

router.route('/change-password').post(changeUserPassword)

export default router