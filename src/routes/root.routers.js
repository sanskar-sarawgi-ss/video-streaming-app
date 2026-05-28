import { Router } from 'express'
import userRouter from './user.routes.js'
import channelRouter from './channel.routes.js'
import videoRouter from './video.routes.js'

const router = Router();

router.route('/user', userRouter)
router.route('/channels', channelRouter)
router.route('/videos', videoRouter)

export default router