import { File } from "../../Models/file.js"; 
import {User}   from '../../Models/user.js';
import { nanoid } from 'nanoid';
import {redisConnection} from '../../Queue/connection_queue.js';


/**
 * @name : createInviteLink 
 * @description : 
 * @access : private 
 */

export const  createInviteLink  = async(req,res)=>{
    try {

         const {roomId,childId} = req.body;

          if(!roomId || !roomId.trim() || !childId || !childId.trim()) 
        {
            return res.status(400).json({
                success:false,
                message:"RoomID is not Available...."
            })
        }

        const inviteToken = nanoid(8);

        const payload = JSON.stringify({ roomId, childId: childId || roomId });

        await redisConnection.set(`invite:${inviteToken}`,payload,'EX',86400);

        await redisConnection.set(`room_invite:${roomId}`,inviteToken,'EX',86400);

         return res.status(200).json({
            success: true,
            inviteUrl: `${process.env.FRONTEND_API}/join/${inviteToken}`
        });


    } catch (error) {
        console.error("Error While Creating InviteLink ....",error.message);
        return res.status(500).json({ success: false, message: error.message });
        
    }
}


/**
 * @name : joinRoomWithToken
 * @description 
 * @acess : private 
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

        // 2. Add user to MongoDB collaborators
        const rootDoc = await File.findById(roomId);
        if (!rootDoc) {
            return res.status(404).json({ success: false, message: "Project not found." });
        }

        if (rootDoc.owner.toString() !== userId.toString()) {
            await File.findByIdAndUpdate(roomId, {
                $addToSet: { collaborators: userId }
            });
        }

        // 3. Fetch active file to open
        const activeFile = await File.findById(childId);

        return res.status(200).json({
            success: true,
            message: "Successfully joined project!",
            rootDoc,
            activeFile
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


/**
 * @name revokeInviteLink 
 * @description 
 * @access private
 */



export const revokeInviteLink = async (req, res) => {
    try {
        const { roomId } = req.body;
        const { userId } = req.user;

        // 1. Verify that the requester is the owner of the room
        const rootDoc = await File.findById(roomId);
        if (!rootDoc || rootDoc.owner.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Only the room owner can revoke invite links." });
        }

        // 2. Find the active token for this room in Redis
        const activeToken = await redisConnection.get(`room_invite:${roomId}`);
        if (activeToken) {
            // Delete both keys from Redis immediately!
            await redisConnection.del(`invite:${activeToken}`);
            await redisConnection.del(`room_invite:${roomId}`);
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
 * @name  removeCollaborator
 * @description
 * @access  private
 */


export const removeCollaborator = async (req, res) => {
    try {
        const { roomId, targetUserId } = req.params;
        const { userId } = req.user;

        // 1. Only the owner can remove collaborators
        const rootDoc = await File.findById(roomId);
        if (!rootDoc || rootDoc.owner.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Only the owner can remove collaborators." });
        }

        // 2. Remove targetUserId from MongoDB collaborators array
        await File.findByIdAndUpdate(roomId, {
            $pull: { collaborators: targetUserId }
        });

        // 3. (Optional) Real-time kick via Socket.IO:
        // io.to(roomId).emit("collaborator:removed", { userId: targetUserId });

        return res.status(200).json({
            success: true,
            message: "Collaborator removed successfully."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};