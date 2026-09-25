import mongoose from 'mongoose';
import { Message } from '../Models/message.js';
import { File } from '../Models/file.js';

/**
 * Helper to resolve the true project root folder ID for any file/folder ID.
 * Ensures all chat messages belong to the top project root.
 * @param {string} targetId 
 * @returns {Promise<string>}
 */
async function resolveProjectRootId(targetId) {
    if (!targetId || typeof targetId !== 'string') return targetId;
    if (!mongoose.Types.ObjectId.isValid(targetId)) return targetId;

    try {
        const targetDoc = await File.findById(targetId);
        if (!targetDoc) return targetId;

        // If rootId is explicitly saved on the document
        if (targetDoc.rootId) {
            const rootDoc = await File.findById(targetDoc.rootId);
            if (rootDoc) return rootDoc._id.toString();
        }

        // If it's a child folder or nested file, traverse up to top parent (where parentId is null)
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

        // Otherwise this targetDoc is already the root item
        return targetDoc._id.toString();
    } catch (err) {
        console.error("[chatSocket] Error resolving project root ID:", err.message);
        return targetId;
    }
}

/**
 * Register Socket.IO handlers for persistent collaborative project chat
 * @param {import('socket.io').Server} io 
 */
export function registerChatSocket(io) {
    io.on("connection", (socket) => {
        
        // 1. Fetch persistent chat history from MongoDB
        socket.on("chat:get_history", async ({ roomId }) => {
            if (!roomId) return;
            try {
                const projectRootId = await resolveProjectRootId(roomId);

                // Auto-join the socket to projectRootId and roomId
                socket.join(projectRootId);
                if (roomId && roomId !== projectRootId) {
                    socket.join(roomId);
                }
                
                // Fetch up to 100 most recent messages sorted chronologically
                const messages = await Message.find({ rootId: projectRootId })
                    .sort({ createdAt: 1 })
                    .limit(100)
                    .lean();

                const formattedMessages = messages.map((msg) => ({
                    id: msg._id.toString(),
                    _id: msg._id.toString(),
                    roomId: projectRootId,
                    text: msg.text,
                    sender: msg.senderName,
                    senderId: msg.sender ? msg.sender.toString() : null,
                    avatar: (msg.senderName || "U").charAt(0).toUpperCase(),
                    createdAt: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
                    timestamp: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString()
                }));

                socket.emit("chat:history", {
                    roomId: projectRootId,
                    requestedRoomId: roomId,
                    messages: formattedMessages
                });
            } catch (err) {
                console.error("[chatSocket] Error fetching chat history from DB:", err.message);
            }
        });

        // 2. Persist new message to MongoDB & broadcast to all project members
        socket.on("chat:send", async ({ roomId, text, sender, senderId, avatar }) => {
            if (!roomId || !text || !text.trim()) return;

            try {
                const projectRootId = await resolveProjectRootId(roomId);
                const resolvedSender = sender || socket.user?.userName || socket.user?.name || 'Teammate';
                const resolvedSenderId = senderId || socket.user?.userId || socket.user?.id;

                // Ensure sender socket is in both rooms
                socket.join(projectRootId);
                if (roomId && roomId !== projectRootId) {
                    socket.join(roomId);
                }

                if (!resolvedSenderId || !mongoose.Types.ObjectId.isValid(resolvedSenderId)) {
                    console.warn("[chatSocket] Invalid senderId for chat message:", resolvedSenderId);
                }

                // Save message into MongoDB
                const savedMessage = await Message.create({
                    rootId: projectRootId,
                    sender: resolvedSenderId && mongoose.Types.ObjectId.isValid(resolvedSenderId) ? resolvedSenderId : new mongoose.Types.ObjectId(),
                    senderName: resolvedSender,
                    text: text.trim()
                });

                const payload = {
                    id: savedMessage._id.toString(),
                    _id: savedMessage._id.toString(),
                    roomId: projectRootId,
                    text: savedMessage.text,
                    sender: savedMessage.senderName,
                    senderId: savedMessage.sender ? savedMessage.sender.toString() : null,
                    avatar: avatar || (savedMessage.senderName || "U").charAt(0).toUpperCase(),
                    createdAt: savedMessage.createdAt.toISOString(),
                    timestamp: savedMessage.createdAt.toISOString()
                };

                // Broadcast to both project root room and active room (frontend deduplicates by ID)
                io.to(projectRootId).emit("chat:message", payload);
                if (roomId && roomId !== projectRootId) {
                    io.to(roomId).emit("chat:message", payload);
                }
            } catch (err) {
                console.error("[chatSocket] Error saving chat message to DB:", err.message);
            }
        });

        // 3. Live typing indicator broadcast
        socket.on("chat:typing", async ({ roomId, userName, isTyping }) => {
            if (!roomId) return;
            try {
                const projectRootId = await resolveProjectRootId(roomId);
                const resolvedName = userName || socket.user?.userName || socket.user?.name || 'A teammate';

                socket.to(projectRootId).emit("chat:typing", {
                    roomId: projectRootId,
                    userName: resolvedName,
                    isTyping: Boolean(isTyping)
                });

                if (roomId && roomId !== projectRootId) {
                    socket.to(roomId).emit("chat:typing", {
                        roomId,
                        userName: resolvedName,
                        isTyping: Boolean(isTyping)
                    });
                }
            } catch (err) {
                console.error("[chatSocket] Error in chat:typing handler:", err.message);
            }
        });
    });
}
