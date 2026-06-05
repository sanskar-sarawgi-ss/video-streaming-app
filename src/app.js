import express  from "express";
import cors from "cors"
import cookieParser from "cookie-parser"
import requestLogger from './middlewares/requestLogger.middleware.js'
import { swaggerUi, specs } from './utils/swagger.js'
import logger from './utils/logger.js'


export const app = express()

// yaha pe cros origin undefine kyo a raha hai ?
// kya evn file load nahi ho rahi hai ?
// no ye cors key pa
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // Allow requests from this origin
    credentials: true, // Allow cookies to be sent in cross-origin requests
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(requestLogger)

// Swagger documentation
app.use('/api-detail', swaggerUi.serve, swaggerUi.setup(specs));


import rootRouter from './routes/root.routers.js'
app.use('/', rootRouter)

app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    })
})

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err)
    }

    logger.error(`Unhandled error [${req.method} ${req.originalUrl}]`, {
        message: err.message,
        statusCode: err.statusCode || 500,
        stack: err.stack,
        body: req.body,
        query: req.query,
        params: req.params,
    })

    const statusCode = err.statusCode || 500
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        errors: err.errors || [],
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    })
})
// Tips:
// npm audit fix => to fix vulnerabilities in dependencies
// npx npm-check-updates -u => to review and update dependencies in package.json