import { Router } from "express";
import { JwtAuth } from "../middlewares/auth.middlerware.js";
import {
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelInfo,
} from "../controllers/channel.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/create").post(JwtAuth,
    upload.single({
        name: 'banner',
        maxCount: 1
    })
    , createChannel);
router.route("/update").put(JwtAuth, updateChannel);
router.route("/delete").delete(JwtAuth, deleteChannel);
router.route("/info").get(getChannelInfo);

export default router;
