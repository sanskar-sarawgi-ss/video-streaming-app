import { Router } from 'express'
import userRouter from './user.routes.js'
import channelRouter from './channel.routes.js'
import videoRouter from './video.routes.js'
import roomRouter from './room.routes.js'

const router = Router();

router.use('/users', userRouter)
router.use('/channels', channelRouter)
router.use('/videos', videoRouter)
router.use('/room', roomRouter)

export default router