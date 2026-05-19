import express  from "express";
import cors from "cors"
import cookieParser from "cookie-parser"
import requestLogger from './middlewares/requestLogger.middleware.js'
import { swaggerUi, specs } from './utils/swagger.js'


export const app = express()

// yaha pe cros origin undefine kyo a raha hai ?
// kya evn file load nahi ho rahi hai ?
// no ye cors key pa
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // Allow requests from this origin
    credentials: true, // Allow cookies to be sent in cross-origin requests
}))

// To avoid large paylaods we use limits
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(requestLogger)

// Swagger documentation
app.use('/api-detail', swaggerUi.serve, swaggerUi.setup(specs));


// import rootRouter from './routes/root.routers.js'

// app.use('/', rootRouter)
import userRouter from './routes/user.routes.js'
import channelRouter from './routes/channel.routes.js'
import videoRouter from './routes/video.routes.js'

app.use('/users', userRouter)
app.use('/channels', channelRouter)
app.use('/videos', videoRouter)


// Tips:
// npm audit fix => to fix vulnerabilities in dependencies
// npx npm-check-updates -u => to review and update dependencies in package.json