import mongoose from 'mongoose';
import { GeminiMessage } from '../Models/geminiMessage.js';
import { File } from '../Models/file.js';
import { ai } from '../Config/gemini.js';

/**
 * Helper to resolve the true project root folder ID for any file/folder ID.
 * @param {string} targetId 
 * @returns {Promise<string>}
 */

async function resolveProjectRootId(targetId) {
    if (!targetId || typeof targetId !== 'string') return targetId;
    if (!mongoose.Types.ObjectId.isValid(targetId)) return targetId;

    try {
        const targetDoc = await File.findById(targetId);
        if (!targetDoc) return targetId;

        if (targetDoc.rootId) {
            const rootDoc = await File.findById(targetDoc.rootId);
            if (rootDoc) return rootDoc._id.toString();
        }

        if (targetDoc.parentId) {
            let curr = targetDoc;
            while (curr && curr.parentId) {
                const parent = await File.findById(curr.parentId);
                if (parent) {
                    curr = parent;
                    if (!parent.parentId) {
                        return parent._id.toString();
                    }
                } else {
                    break;
                }
            }
            if (curr) return curr._id.toString();
        }

        return targetDoc._id.toString();
    } catch (err) {
        console.error("[geminiSocket] Error resolving project root ID:", err.message);
        return targetId;
    }
}

/**
 * Register Socket.IO handlers for collaborative Gemini AI Assistant
 * @param {import('socket.io').Server} io 
 */
export function registerGeminiSocket(io) {
    io.on("connection", (socket) => {

        // 1. Fetch persistent AI conversation history from MongoDB
        socket.on("gemini:get_history", async ({ roomId }) => {
            if (!roomId) return;
            try {
                const projectRootId = await resolveProjectRootId(roomId);

                const messages = await GeminiMessage.find({ rootId: projectRootId })
                    .sort({ createdAt: 1 })
                    .limit(50)
                    .lean();

                const formattedMessages = messages.map((msg) => ({
                    id: msg._id.toString(),
                    _id: msg._id.toString(),
                    roomId: projectRootId,
                    role: msg.role,
                    content: msg.content,
                    sender: msg.senderName,
                    senderId: msg.sender ? msg.sender.toString() : null,
                    contextSnapshot: msg.contextSnapshot,
                    createdAt: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
                    timestamp: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString()
                }));

                socket.emit("gemini:history", {
                    roomId: projectRootId,
                    requestedRoomId: roomId,
                    messages: formattedMessages
                });
            } catch (err) {
                console.error("[geminiSocket] Error fetching history:", err.message);
            }
        });

        // 2. User asks a question / requests code analysis from Gemini
        socket.on("gemini:ask", async ({ roomId, prompt, activeFileId, activeFileName, activeCode, language }) => {
            if (!roomId || !prompt || !prompt.trim()) return;

            const trimmedPrompt = prompt.trim();
            const projectRootId = await resolveProjectRootId(roomId);
            const resolvedSender = socket.user?.userName || socket.user?.name || 'Teammate';
            const resolvedSenderId = socket.user?.userId || socket.user?.id;

            try {
                // A. Save User Prompt to MongoDB
                const userMsgDoc = await GeminiMessage.create({
                    rootId: projectRootId,
                    sender: resolvedSenderId || new mongoose.Types.ObjectId(),
                    senderName: resolvedSender,
                    role: "user",
                    content: trimmedPrompt,
                    contextSnapshot: {
                        fileId: activeFileId && mongoose.Types.ObjectId.isValid(activeFileId) ? activeFileId : null,
                        fileName: activeFileName || "",
                        language: language || ""
                    }
                });

                const userPayload = {
                    id: userMsgDoc._id.toString(),
                    _id: userMsgDoc._id.toString(),
                    roomId: projectRootId,
                    role: "user",
                    content: userMsgDoc.content,
                    sender: userMsgDoc.senderName,
                    senderId: resolvedSenderId,
                    contextSnapshot: userMsgDoc.contextSnapshot,
                    createdAt: userMsgDoc.createdAt.toISOString(),
                    timestamp: userMsgDoc.createdAt.toISOString()
                };

                // Broadcast user prompt live to all project collaborators
                io.to(projectRootId).emit("gemini:message", userPayload);
                if (roomId !== projectRootId) {
                    io.to(roomId).emit("gemini:message", userPayload);
                }

                // Notify frontend that Gemini is thinking
                io.to(projectRootId).emit("gemini:loading", { roomId: projectRootId, isLoading: true });
                if (roomId !== projectRootId) {
                    io.to(roomId).emit("gemini:loading", { roomId, isLoading: true });
                }

                // B. Fetch previous conversation messages for multi-turn context (last 8 messages)
                const pastMessages = await GeminiMessage.find({ rootId: projectRootId })
                    .sort({ createdAt: -1 })
                    .skip(1) // skip the message we just created
                    .limit(8)
                    .lean();

                pastMessages.reverse();

                // Format contents array for Gemini SDK
                const contents = [];
                for (const msg of pastMessages) {
                    contents.push({
                        role: msg.role === "model" ? "model" : "user",
                        parts: [{ text: msg.content }]
                    });
                }

                // Construct current prompt with active file code snapshot if available
                let currentPromptWithContext = trimmedPrompt;
                if (activeFileName || activeCode) {
                    const truncatedCode = activeCode && activeCode.length > 8000 
                        ? activeCode.substring(0, 8000) + "\n...[truncated]" 
                        : activeCode || "";

                    currentPromptWithContext = 
                        `[Active Editor File: ${activeFileName || "unnamed"} (${language || "code"})]\n` +
                        (truncatedCode ? `\`\`\`${language || ""}\n${truncatedCode}\n\`\`\`\n\n` : "") +
                        `User Question: ${trimmedPrompt}`;
                }

                contents.push({
                    role: "user",
                    parts: [{ text: currentPromptWithContext }]
                });

                // C. Call Google Gemini API
                const systemInstruction = 
                    "You are an expert AI pair programmer integrated inside 'Got Collab IDE'. " +
                    "Provide clear, concise, and structured code solutions, explanations, and debugging advice. " +
                    "Format code blocks using markdown with proper language tags (e.g. ```javascript, ```python).";

                const response = await ai.models.generateContent({
                    model: 'gemini-3.6-flash',
                    contents,
                    config: {
                        systemInstruction
                    }
                });

                const aiReplyText = response?.text || "Sorry, I could not generate a response at this moment.";

                // D. Save Gemini's Reply to MongoDB
                const modelMsgDoc = await GeminiMessage.create({
                    rootId: projectRootId,
                    sender: resolvedSenderId || new mongoose.Types.ObjectId(),
                    senderName: "Gemini AI",
                    role: "model",
                    content: aiReplyText,
                    contextSnapshot: {
                        fileId: activeFileId && mongoose.Types.ObjectId.isValid(activeFileId) ? activeFileId : null,
                        fileName: activeFileName || "",
                        language: language || ""
                    }
                });

                const modelPayload = {
                    id: modelMsgDoc._id.toString(),
                    _id: modelMsgDoc._id.toString(),
                    roomId: projectRootId,
                    role: "model",
                    content: modelMsgDoc.content,
                    sender: "Gemini AI",
                    senderId: "gemini_ai",
                    contextSnapshot: modelMsgDoc.contextSnapshot,
                    createdAt: modelMsgDoc.createdAt.toISOString(),
                    timestamp: modelMsgDoc.createdAt.toISOString()
                };

                // Broadcast AI reply live to all project collaborators
                io.to(projectRootId).emit("gemini:message", modelPayload);
                if (roomId !== projectRootId) {
                    io.to(roomId).emit("gemini:message", modelPayload);
                }

            } catch (error) {
                console.error("[geminiSocket] Error generating content with Gemini:", error.message);

                const errorPayload = {
                    id: new mongoose.Types.ObjectId().toString(),
                    roomId: projectRootId,
                    role: "model",
                    content: `⚠️ **Gemini AI Error:** ${error.message || "Failed to generate response. Please check your API key or quota."}`,
                    sender: "Gemini AI",
                    senderId: "gemini_ai",
                    createdAt: new Date().toISOString(),
                    timestamp: new Date().toISOString()
                };

                io.to(projectRootId).emit("gemini:message", errorPayload);
                if (roomId !== projectRootId) {
                    io.to(roomId).emit("gemini:message", errorPayload);
                }
            } finally {
                // Remove loading indicator
                io.to(projectRootId).emit("gemini:loading", { roomId: projectRootId, isLoading: false });
                if (roomId !== projectRootId) {
                    io.to(roomId).emit("gemini:loading", { roomId, isLoading: false });
                }
            }
        });
    });
}
