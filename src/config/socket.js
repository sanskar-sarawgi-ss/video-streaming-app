import {Server} from "socket.io";
import logger from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export default class SocketService {
    constructor() {
        logger.info("Initializing SocketService");
        this._io = null; // Will be set in initSocket
    }
    
    async loadHandlers() {
        let handlerFolderPath = path.join(process.cwd(), "src", "socketHandlers");
    
        this.handlers = (await Promise.all(fs.readdirSync(handlerFolderPath).map(async (file) => {
            let handlerPath = path.join(handlerFolderPath, file);
            let NameSpace = file.split("Handler.")[0];
            let handlerFunList = await import(pathToFileURL(handlerPath).href);
    
            return Object.keys(handlerFunList).map((funName) => {
                let eventName = `${NameSpace}:${funName}`;
                let handlerFunction = handlerFunList[funName];

                return {eventName, handlerFunction}
            })
        }))).flat()

        logger.info(`Load socket handlers`);
    }

    async initSocket(server) {
        try {
            // Create socket.io server attached to existing HTTP server
            this._io = new Server(server, {
                cors: {
                    origin: process.env.CORS_ORIGIN || '*',
                    methods: ["GET", "POST"],
                    credentials: true 
                }
            });

            console.log("SocketService initialized, loading handlers...");

            await this.loadHandlers();
            this._io.on("connection", this.addEventListener.bind(this));
    
            this._io.on("error", (error) => {
                logger.error("Socket error", { message: error.message, stack: error.stack });
            });

            logger.info("Socket.io connected successfully");
        }
        catch (error) {
            logger.error("Failed to initialize SocketService", { message: error.message, stack: error.stack });
            throw error;
        }
    }

    addEventListener(socket) {
        logger.info(`New client connected: ${socket.id}`);

        this.handlers.forEach((handler) => {
            let [eventName, handlerFunction] = [handler.eventName, handler.handlerFunction]
            socket.on(eventName, (data) => {
                handlerFunction(socket, data);
            });
        })

        socket.on("disconnect", () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });
    }
}