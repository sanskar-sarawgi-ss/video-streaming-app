import { Router } from "express";
import { createStreamRoom, joinStreamRoom } from "../controllers/room.controller.js";
import { JwtAuth } from "../middlewares/auth.middlerware.js";


const router = Router()
router.route('/create').post(JwtAuth, createStreamRoom)
router.route('/join').post(JwtAuth, joinStreamRoom)

export default router
