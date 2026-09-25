import { File } from "../../Models/file.js"; 
// import { User } from '../../Models/user.js';
import { nanoid } from 'nanoid';
import { redisConnection } from '../../Config/redis.js';

/**
 * @name : createInviteLink 
 * @description : Generates an expiring invite link for a project room
 * @access : private (Owner only)
 */
export const createInviteLink = async (req, res) => {
    try {
        const { roomId, childId } = req.body;
        const { userId } = req.user;

        if ((!roomId || !roomId.trim()) && (!childId || !childId.trim())) {
            return res.status(400).json({
                success: false,
                message: "RoomID or FileID is required."
            });
        }

        const targetId = childId || roomId;
        let targetDoc = await File.findById(targetId);
        if (!targetDoc) {
            targetDoc = await File.findById(roomId);
        }

        if (!targetDoc) {
            return res.status(404).json({ success: false, message: "File or Folder not found." });
        }

        // 1. Resolve true root parent folder (where parentId === null)
        let rootDoc = targetDoc;
        if (targetDoc.rootId) {
            const foundRoot = await File.findById(targetDoc.rootId);
            if (foundRoot) rootDoc = foundRoot;
        } else if (targetDoc.parentId) {
            let curr = targetDoc;
            while (curr && curr.parentId) {
                const parent = await File.findById(curr.parentId);
                if (parent) {
                    curr = parent;
                    if (!parent.parentId) {
                        rootDoc = parent;
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        // 2. Security: Only the owner can create invite links
        if (rootDoc.owner.toString() !== userId.toString() && targetDoc.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the project owner can share invite links."
            });
        }

        const resolvedRoomId = rootDoc._id.toString();
        const resolvedChildId = targetDoc._id.toString();

        const inviteToken = nanoid(8);
        const payload = JSON.stringify({ roomId: resolvedRoomId, childId: resolvedChildId });

        await redisConnection.set(`invite:${inviteToken}`, payload, 'EX', 86400);
        await redisConnection.set(`room_invite:${resolvedRoomId}`, inviteToken, 'EX', 86400);

        return res.status(200).json({
            success: true,
            inviteUrl: `${process.env.FRONTEND_API}/join/${inviteToken}`
        });

    } catch (error) {
        console.error("Error While Creating InviteLink ....", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @name : joinRoomWithToken
 * @description : Redeems invite token, adds user to MongoDB collaborators
 * @access : private 
 */
export const joinRoomWithToken = async (req, res) => {
    try {
        const { inviteToken } = req.params;
        const { userId } = req.user;

        // 1. Check Redis
        const cachedData = await redisConnection.get(`invite:${inviteToken}`);
        if (!cachedData) {
            return res.status(410).json({
                success: false,
                message: "This invite link has expired or is invalid."
            });
        }

        const { roomId, childId } = JSON.parse(cachedData);

        // 2. Fetch root document
        let rootDoc = await File.findById(roomId);
        if (!rootDoc) {
            rootDoc = await File.findById(childId);
        }

        if (!rootDoc) {
            return res.status(404).json({ success: false, message: "Project not found." });
        }

        // Resolve top-level root folder where parentId === null so it shows in Left Explorer
        let topRootDoc = rootDoc;
        if (rootDoc.parentId) {
            let curr = rootDoc;
            while (curr && curr.parentId) {
                const parent = await File.findById(curr.parentId);
                if (parent) {
                    curr = parent;
                    if (!parent.parentId) {
                        topRootDoc = parent;
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        // 3. Add User B to collaborators on both top root folder and child document
        const isNotOwner = topRootDoc.owner.toString() !== userId.toString();
        if (isNotOwner) {
            await File.findByIdAndUpdate(topRootDoc._id, {
                $addToSet: { collaborators: userId, collabration: userId }
            });

            if (childId && childId !== topRootDoc._id.toString()) {
                await File.findByIdAndUpdate(childId, {
                    $addToSet: { collaborators: userId, collabration: userId }
                });
            }

            // Real-time broadcast: New collaborator joined
            const io = req.app.get('io');
            if (io) {
                const ownerId = topRootDoc.owner.toString();
                const resolvedRoomId = topRootDoc._id.toString();

                const updatePayload = {
                    roomId: resolvedRoomId
                };

                io.to(resolvedRoomId).emit("room:collaborators-updated", updatePayload);
                io.to(ownerId).emit("room:collaborators-updated", updatePayload);
                io.to(`user:${ownerId}`).emit("room:collaborators-updated", updatePayload);
                if (childId && childId !== resolvedRoomId) {
                    io.to(childId).emit("room:collaborators-updated", updatePayload);
                }
            }
        }

        // 4. Fetch active file to open
        const activeFile = await File.findById(childId) || topRootDoc;

        return res.status(200).json({
            success: true,
            message: "Successfully joined project!",
            rootDoc: topRootDoc,
            activeFile
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @name : getRoomCollaborators
 * @description : Returns owner and active list of collaborators for a room
 * @access : private
 */
export const getRoomCollaborators = async (req, res) => {
    try {
        const { roomId } = req.params;

        const targetDoc = await File.findById(roomId);
        if (!targetDoc) {
            return res.status(404).json({ success: false, message: "Room / Project not found." });
        }

        // Resolve top root folder
        let rootDoc = targetDoc;
        if (targetDoc.rootId) {
            const foundRoot = await File.findById(targetDoc.rootId);
            if (foundRoot) rootDoc = foundRoot;
        } else if (targetDoc.parentId) {
            let curr = targetDoc;
            while (curr && curr.parentId) {
                const parent = await File.findById(curr.parentId);
                if (parent) {
                    curr = parent;
                    if (!parent.parentId) {
                        rootDoc = parent;
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        const populatedRoot = await File.findById(rootDoc._id)
            .populate('owner', '_id userName email')
            .populate('collaborators', '_id userName email');

        return res.status(200).json({
            success: true,
            owner: populatedRoot?.owner || targetDoc.owner,
            collaborators: populatedRoot?.collaborators || []
        });
    } catch (error) {
        console.error("Error fetching collaborators:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @name : revokeInviteLink 
 * @description : Revokes the active invite link from Redis
 * @access : private (Owner only)
 */
export const revokeInviteLink = async (req, res) => {
    try {
        const { roomId } = req.body;
        const { userId } = req.user;

        const targetDoc = await File.findById(roomId);
        if (!targetDoc) {
            return res.status(404).json({ success: false, message: "File or Project not found." });
        }

        let rootDoc = targetDoc;
        if (targetDoc.rootId) {
            const foundRoot = await File.findById(targetDoc.rootId);
            if (foundRoot) rootDoc = foundRoot;
        } else if (targetDoc.parentId) {
            let curr = targetDoc;
            while (curr && curr.parentId) {
                const parent = await File.findById(curr.parentId);
                if (parent) {
                    curr = parent;
                    if (!parent.parentId) {
                        rootDoc = parent;
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        if (rootDoc.owner.toString() !== userId.toString() && targetDoc.owner.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Only the room owner can revoke invite links." });
        }

        const resolvedRoomId = rootDoc._id.toString();
        const activeToken = await redisConnection.get(`room_invite:${resolvedRoomId}`);
        if (activeToken) {
            await redisConnection.del(`invite:${activeToken}`, `room_invite:${resolvedRoomId}`);
        }

        return res.status(200).json({
            success: true,
            message: "Invite link revoked successfully. Old link will no longer work."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @name : removeCollaborator
 * @description : Owner kicks / removes an existing collaborator from the project
 * @access : private (Owner only)
 */
export const removeCollaborator = async (req, res) => {
    try {
        const { roomId, targetUserId } = req.params;
        const { userId } = req.user;

        const targetDoc = await File.findById(roomId);
        if (!targetDoc) {
            return res.status(404).json({ success: false, message: "File or Project not found." });
        }

        // 1. Resolve true root parent folder
        let rootDoc = targetDoc;
        if (targetDoc.rootId) {
            const foundRoot = await File.findById(targetDoc.rootId);
            if (foundRoot) rootDoc = foundRoot;
        } else if (targetDoc.parentId) {
            let curr = targetDoc;
            while (curr && curr.parentId) {
                const parent = await File.findById(curr.parentId);
                if (parent) {
                    curr = parent;
                    if (!parent.parentId) {
                        rootDoc = parent;
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        // Only the owner can remove collaborators
        if (rootDoc.owner.toString() !== userId.toString() && targetDoc.owner.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Only the owner can remove collaborators." });
        }

        const resolvedRoomId = rootDoc._id.toString();

        // 2. Remove targetUserId from MongoDB collaborators array across all root and child docs
        await File.updateMany(
            {
                $or: [
                    { _id: resolvedRoomId },
                    { _id: roomId },
                    { rootId: resolvedRoomId },
                    { rootId: roomId }
                ]
            },
            {
                $pull: { collaborators: targetUserId, collabration: targetUserId }
            }
        );

        // 3. Real-time broadcast via Socket.IO
        const io = req.app.get('io');
        if (io) {
            const ownerId = rootDoc.owner.toString();
            const kickPayload = {
                roomId: resolvedRoomId,
                targetUserId,
                message: "You have been removed from this project by the owner."
            };

            io.to(resolvedRoomId).emit("collaborator:kicked", kickPayload);
            io.to(roomId).emit("collaborator:kicked", kickPayload);
            io.to(targetUserId).emit("collaborator:kicked", kickPayload);
            io.to(`user:${targetUserId}`).emit("collaborator:kicked", kickPayload);
            io.to(ownerId).emit("collaborator:kicked", kickPayload);
            io.to(`user:${ownerId}`).emit("collaborator:kicked", kickPayload);
        }

        return res.status(200).json({
            success: true,
            message: "Collaborator removed successfully."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @name : leaveRoom
 * @description : Collaborator voluntarily leaves a shared project
 * @access : private (Collaborators only)
 */
export const leaveRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId } = req.user;

        const targetDoc = await File.findById(roomId);
        if (!targetDoc) {
            return res.status(404).json({ success: false, message: "Project not found." });
        }

        // 1. Resolve true root parent folder (where parentId === null)
        let rootDoc = targetDoc;
        if (targetDoc.rootId) {
            const foundRoot = await File.findById(targetDoc.rootId);
            if (foundRoot) rootDoc = foundRoot;
        } else if (targetDoc.parentId) {
            let curr = targetDoc;
            while (curr && curr.parentId) {
                const parent = await File.findById(curr.parentId);
                if (parent) {
                    curr = parent;
                    if (!parent.parentId) {
                        rootDoc = parent;
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        // Owner cannot leave their own project (they should destroy/delete instead)
        if (rootDoc.owner.toString() === userId.toString() || targetDoc.owner.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: "The owner cannot leave their own project. Use 'End Collaboration' instead."
            });
        }

        const resolvedRoomId = rootDoc._id.toString();

        // 2. Remove user from collaborators on root, child, and all descendant files
        await File.updateMany(
            {
                $or: [
                    { _id: resolvedRoomId },
                    { _id: roomId },
                    { rootId: resolvedRoomId },
                    { rootId: roomId }
                ]
            },
            {
                $pull: { collaborators: userId, collabration: userId }
            }
        );

        // 3. Real-time broadcast
        const io = req.app.get('io');
        if (io) {
            const ownerId = rootDoc.owner.toString();
            const leavePayload = {
                roomId: resolvedRoomId,
                userId,
                userName: req.user.userName
            };

            io.to(resolvedRoomId).emit("collaborator:left", leavePayload);
            io.to(roomId).emit("collaborator:left", leavePayload);
            io.to(ownerId).emit("collaborator:left", leavePayload);
            io.to(`user:${ownerId}`).emit("collaborator:left", leavePayload);
        }

        return res.status(200).json({
            success: true,
            message: "You have left the project successfully."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @name : destroyRoomSession
 * @description : Owner destroys the collaborative room, revokes all access and kicks all collaborators
 * @access : private (Owner only)
 */
export const destroyRoomSession = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId } = req.user;

        const targetDoc = await File.findById(roomId);
        if (!targetDoc) {
            return res.status(404).json({ success: false, message: "Project not found." });
        }

        let rootDoc = targetDoc;
        if (targetDoc.rootId) {
            const foundRoot = await File.findById(targetDoc.rootId);
            if (foundRoot) rootDoc = foundRoot;
        } else if (targetDoc.parentId) {
            let curr = targetDoc;
            while (curr && curr.parentId) {
                const parent = await File.findById(curr.parentId);
                if (parent) {
                    curr = parent;
                    if (!parent.parentId) {
                        rootDoc = parent;
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        if (rootDoc.owner.toString() !== userId.toString() && targetDoc.owner.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Only the owner can destroy the collaboration room." });
        }

        const resolvedRoomId = rootDoc._id.toString();

        // 1. Find all files belonging to this project (root, child, and descendants)
        const projectFiles = await File.find({
            $or: [
                { _id: resolvedRoomId },
                { _id: roomId },
                { rootId: resolvedRoomId },
                { rootId: roomId },
                { parentId: resolvedRoomId }
            ]
        });

        // 2. Gather all collaborator user IDs across all project files
        const affectedUserIds = new Set();
        for (const file of projectFiles) {
            if (Array.isArray(file.collaborators)) {
                file.collaborators.forEach(c => {
                    if (c) affectedUserIds.add(c.toString());
                });
            }
            if (Array.isArray(file.collabration)) {
                file.collabration.forEach(c => {
                    if (c) affectedUserIds.add(c.toString());
                });
            }
        }

        // 3. Clear all collaborators from MongoDB across the entire project (makes the project private)
        await File.updateMany(
            {
                $or: [
                    { _id: resolvedRoomId },
                    { _id: roomId },
                    { rootId: resolvedRoomId },
                    { rootId: roomId },
                    { parentId: resolvedRoomId }
                ]
            },
            {
                $set: { collaborators: [], collabration: [] }
            }
        );

        // 4. Delete any active Redis invite tokens
        const activeToken = await redisConnection.get(`room_invite:${resolvedRoomId}`);
        if (activeToken) {
            await redisConnection.del(`invite:${activeToken}`, `room_invite:${resolvedRoomId}`);
        }

        // 5. Comprehensive Real-time broadcast to kick all connected collaborators immediately
        const io = req.app.get('io');
        if (io) {
            const payload = {
                roomId: resolvedRoomId,
                ownerId: userId.toString(),
                message: "This collaborative session has been ended by the owner. The project is now private."
            };

            // Emit to project root room and active requested room
            io.to(resolvedRoomId).emit("room:destroyed", payload);
            if (roomId !== resolvedRoomId) {
                io.to(roomId).emit("room:destroyed", payload);
            }

            // Emit to every individual file room in this project
            for (const file of projectFiles) {
                const fId = file._id.toString();
                io.to(fId).emit("room:destroyed", payload);
            }

            // Direct personal socket push to every collaborator's personal room
            for (const collabId of affectedUserIds) {
                if (collabId !== userId.toString()) {
                    io.to(collabId).emit("room:destroyed", payload);
                    io.to(`user:${collabId}`).emit("room:destroyed", payload);
                }
            }

            // Notify owner's UI that collaborators list is now cleared
            io.to(resolvedRoomId).emit("room:collaborators-updated", { roomId: resolvedRoomId });
        }

        return res.status(200).json({
            success: true,
            message: "Collaborative session destroyed successfully. Project is now private."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};