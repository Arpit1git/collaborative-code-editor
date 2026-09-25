import { Router } from "express";
import { 
    createInviteLink, 
    joinRoomWithToken, 
    getRoomCollaborators,
    revokeInviteLink, 
    removeCollaborator,
    leaveRoom,
    destroyRoomSession
} from "../../Controllers/CollaborationController/collaborationController.js";
import { authMiddleware } from "../../Middleware/authMiddleWare.js";

const collaborationRouter = Router();

// 1. Generate an expiring invite link (Returns URL with short token)
collaborationRouter.post("/invite", authMiddleware, createInviteLink);

// 2. Join a collaborative room using the invite token
collaborationRouter.post("/join/:inviteToken", authMiddleware, joinRoomWithToken);

// 3. Get all collaborators & owner for a room
collaborationRouter.get("/:roomId/collaborators", authMiddleware, getRoomCollaborators);

// 4. Revoke/Disable an active invite link for a room
collaborationRouter.post("/invite/revoke", authMiddleware, revokeInviteLink);

// 5. Kick/Remove an existing collaborator from a project (Owner only)
collaborationRouter.delete("/:roomId/collaborators/:targetUserId", authMiddleware, removeCollaborator);

// 6. Collaborator voluntarily leaves a project room
collaborationRouter.post("/:roomId/leave", authMiddleware, leaveRoom);

// 7. Owner destroys collaborative session (makes project private, kicks all collaborators)
collaborationRouter.post("/:roomId/destroy", authMiddleware, destroyRoomSession);

export default collaborationRouter;
