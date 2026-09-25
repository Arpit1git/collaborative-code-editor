import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        // The Project Root Folder / File to which this chat belongs
        rootId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
            required: true,
            index: true
        },

        // The user who sent the message
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Display name of the sender at the time of sending
        senderName: {
            type: String,
            required: true,
            trim: true
        },

        // The chat text content
        text: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

export const Message = mongoose.model("Message", messageSchema);
