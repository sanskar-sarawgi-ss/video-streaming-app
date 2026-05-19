import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/errorHandler.js";
import { User } from "../models/user.models.js"
import { UploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponce from "../utils/apiResponce.js";
import jwt  from "jsonwebtoken";

const generateRefreshTokenAndAccessToken = asyncHandler(async (userId) => {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return {accessToken , refreshToken}
})

export const registerUser = asyncHandler(async (req, res) => {

    const {fullName, email, username, password} = req.body

    if( [fullName, email, username, password].some(field => field?.trim() === '') ){
        throw new ApiError(400, "Enter Required field")
    }

    const existingUser = await User.findOne({
        $or: [{username} , {email}]
    })

    if(existingUser) { 
        throw new ApiError(409, "user already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath = null

    if(req.files && Array.isArray(req.files.coverImage)) coverImageLocalPath = req.files.coverImage[0].path

    if(!avatarLocalPath) throw new ApiError(400 , 'avatar image not found')
    
    const avatar = await UploadOnCloudinary(avatarLocalPath)
    const coverImage = await UploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(400 , 'avatar image not found')

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage.url || '',
        email,
        password,
        username: username.toLowerCase()
    })

    const userResponce = await User.findById(user._id)?.select(
        "-password -refreshToken"
    )

    res.status(200).json(
        new ApiResponce(200, userResponce, "user register successfully")
    )
})

export const loginUser = asyncHandler(async (req, res) => {
    // get request body
    // validate username or email
    // find user
    // validate password 
    // generate refresh and access token
    // res send secure cookie

    const {username , email, password} = req.body

    if(!(username || email)){
        throw new ApiError(400, "send username or email")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user) throw new ApiError(400, "User do not exist")

    if(!password) throw new ApiError(400, "send password")

    if(!user.isPasswordCorrect(password)) throw new ApiError(401, "password not correct")

    const {accessToken, refreshToken} = await generateRefreshTokenAndAccessToken(user._id)

    const loginUser = await User.findById(user._id).
    select("-password -refreshToken")

    const CookieOptions = {
        httpOnly: true,
        secure: true
    } 

    return res.status(200)
    .cookie("accessToken", accessToken, CookieOptions)
    .cookie("refreshToken", refreshToken, CookieOptions)
    .json(
        new ApiResponce("200",
        {
            user: loginUser,
            refreshToken: refreshToken,
            accessToken: accessToken
        },
        "user login successfully")
    )
})

export const logoutUser = asyncHandler(async (req, res) => {
    // get data
    // find user by access token
    // get user
    // expire access token 
    // remove refresh token
    // res

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const CookieOptions = {
        httpOnly: true,
        server: true
    }

    return res.status(200)
    .clearCookie("accessToken", CookieOptions)
    .clearCookie("refreshToken", CookieOptions)
    .json(
        new ApiResponce("200",
        {},
        "user logout successfully")
    )

})

export const refreshAccessToken = asyncHandler (async (req, res) => {
    // get value form cookies
    const refToken = req.cookie.refreshToken || req.body.refreshToken

    if(!refToken) {
        throw new ApiError(401, "token not valid")
    }

    // validate token
    const decodedToken = jwt.verify(refToken, process.env.REFRESH_TOKEN_SECRET)

    if(!decodedToken) throw new ApiError(401, "token not valid")

    const user = await User.findById(decodedToken?._id)
    
    if(!user) ApiError(400, "Invalid Refresh Token")

    // this step is used when we want to revoke the permission of the token so we can simply do that by removing from databases 
    if(user.refreshToken != refToken)  throw new ApiError(400, "Refresh Token do not match")

    const {accessToken , refreshToken} = generateRefreshTokenAndAccessToken(user?._id)

    const CookieOptions = {
        httpOnly: true,
        secure: true
    } 

    return res(200)
    .cookie("accessToken", accessToken, CookieOptions)
    .cookie("refreshToken", refreshToken, CookieOptions)
    .json(
        new ApiResponce("200",
        {
            refreshToken: refreshToken,
            accessToken: accessToken
        },
        "Refresh Token Generated")
    )
})

export const changeUserPassword = asyncHandler (async (req, res) => {

    // get res info 
    const {newPassword, oldPassword} = req.body;

    if(!newPassword && !oldPassword) throw new ApiError(401, "Enter New/Old Password")

    // check with old password
    if(!await req.user.isPasswordCorrect(oldPassword)) throw new ApiError(401, "Enter Correct Old Password")

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .clearCookie("accessToken", CookieOptions)
    .clearCookie("refreshToken", CookieOptions)
    .json(
        new ApiResponce("200",
        {},
        "Password Change successFully")
    )
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponce(200, req.user, "Current user fetched successfully")
    )
})