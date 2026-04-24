import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/errorHandler.js";
import { Channel } from "../models/channel.model.js";
import ApiResponce from "../utils/apiResponce.js";

export const createChannel = asyncHandler(async (req, res) => {
    const { channelName, description, banner } = req.body;
    const userId = req.user._id;

    if (!channelName?.trim()) {
        throw new ApiError(400, "channelName is required");
    }

    const existingChannel = await Channel.findOne({ userId });
    if (existingChannel) {
        throw new ApiError(409, "User already has a channel");
    }


    const bannerPath = req.files?.banner[0]?.path;
    let bannerUrl = "";
    if (bannerPath) {
        // Upload banner to Cloudinary and get the URL
        const uploadResult = await UploadOnCloudinary(bannerPath);
        bannerUrl = uploadResult.url;
    }

    const channel = await Channel.create({
        userId,
        channelName: channelName.trim(),
        description: description?.trim() || "",
        banner: bannerUrl || "",
    });

    res.status(201).json(
        new ApiResponce(201, channel, "Channel created successfully")
    );
});

export const updateChannel = asyncHandler(async (req, res) => {
    const { channelName, description } = req.body;
    const userId = req.user._id;

    const channel = await Channel.findOne({ userId });
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    if (channelName?.trim()) channel.channelName = channelName.trim();
    if (description !== undefined) channel.description = description.trim();

    await channel.save();

    res.status(200).json(
        new ApiResponce(200, channel, "Channel updated successfully")
    );
});

export const deleteChannel = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const channel = await Channel.findOneAndDelete({ userId });
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    res.status(200).json(
        new ApiResponce(200, {}, "Channel deleted successfully")
    );
});

export const getChannelInfo = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const channel = await Channel.findOne({ userId });

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    res.status(200).json(
        new ApiResponce(200, channel, "Channel info retrieved successfully")
    );
});
