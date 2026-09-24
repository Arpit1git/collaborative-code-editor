import { Router } from "express";
import { 
    createInviteLink, 
    joinRoomWithToken, 
    revokeInviteLink, 
    removeCollaborator 
} from "../../Controllers/CollaborationController/collaborationController.js";
import { authMiddleware } from "../../Middleware/authMiddleWare.js";

const collaborationRouter = Router();

// 1. Generate an expiring invite link (Returns URL with short token)
collaborationRouter.post("/invite", authMiddleware, createInviteLink);

// 2. Join a collaborative room using the invite token
collaborationRouter.post("/join/:inviteToken", authMiddleware, joinRoomWithToken);

// 3. Revoke/Disable an active invite link for a room
collaborationRouter.post("/invite/revoke", authMiddleware, revokeInviteLink);

// 4. Kick/Remove an existing collaborator from a project
collaborationRouter.delete("/:roomId/collaborators/:targetUserId", authMiddleware, removeCollaborator);

export default collaborationRouter;
