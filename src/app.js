import express  from "express";
import cors from "cors"
import cookieParser from "cookie-parser"
import requestLogger from './middlewares/requestLogger.middleware.js'

export const app = express()


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true // Allow cookies to be sent in cross-origin requests
}))

// To avoid large paylaods we use limits
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"})) 
app.use(express.static("public"))
app.use(cookieParser())
app.use(requestLogger)


import userRouter from './routes/user.routes.js'
import channelRouter from './routes/channel.routes.js'
import videoRouter from './routes/video.routes.js'

app.use('/users', userRouter)
app.use('/channels', channelRouter)
app.use('/videos', videoRouter)


// Tips:
// npm audit fix => to fix vulnerabilities in dependencies
// npx npm-check-updates -u => to review and update dependencies in package.json