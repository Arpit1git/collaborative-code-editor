import mongoose from "mongoose";

const geminiMessageSchema = new mongoose.Schema(
    {
        // The shared Project Root Folder / File to which this AI conversation belongs
        rootId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
            required: true,
            index: true
        },

        // User who submitted the query / prompt (or for AI response, user who requested it)
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // User's name at the time of query
        senderName: {
            type: String,
            required: true,
            trim: true
        },

        // Role: 'user' for team member prompts, 'model' for Gemini AI responses
        role: {
            type: String,
            enum: ["user", "model"],
            required: true
        },

        // Markdown / code response content
        content: {
            type: String,
            required: true
        },

        // Snapshot of the active file when prompt was sent
        contextSnapshot: {
            fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
            fileName: { type: String, default: "" },
            language: { type: String, default: "" }
        }
    },
    {
        timestamps: true
    }
);

export const GeminiMessage = mongoose.model("GeminiMessage", geminiMessageSchema);
