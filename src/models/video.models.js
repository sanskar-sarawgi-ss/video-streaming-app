import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, //s3 url
            required: true
        },
        thumbnail: {
            type: String, //cloudinary url
            required: false
        },
        title: {
            type: String, 
            required: true
        },
        description: {
            type: String, 
            required: true
        },
        duration: {
            type: Number, 
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: "Channel"
        },
        status: {
            type: Schema.Types.String,
            default: "pending",
            enum: ["failed", "ready", "processing", "pending"],
            validator: {
                validator: function(value) {
                    return ["failed", "ready", "processing", "pending"].includes(value);
                },
                message: props => `${props.value} is not a valid status`
            }
        }
    }, 
    {
        timestamps: true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema) 