import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/errorHandler.js";
import jwt from "jsonwebtoken"


export const JwtAuth = asyncHandler(async (req, _, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if(!token) throw new ApiError(401, "unauthorized request")

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
    )

    if(!user) throw new ApiError(401, "User not find invalid access token")

    req.user = user
    next()
})