import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import  cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken';
import http from 'http';

import { Server as SocketIOServer } from "socket.io";
import { Hocuspocus } from '@hocuspocus/server';
import { WebSocketServer } from "ws"; 
import mongoose from "mongoose";
import { File } from "./src/Models/file.js";
import {registerTerminalSocket} from './src/Socket/terminalSocket.js';
import {registerChatSocket} from './src/Socket/chatSocket.js';

import connectDb from "./src/Config/Mongo_db.js";
import fileRouter from "./src/Routes/CRUD_Op_File_Routes/crudop_file_routes.js";
import authRouter from './src/Routes/Auth_Routes/authRoute.js';
import collaborationRouter from './src/Routes/collabrateRoute/collabrationRoute.js';
import './src/Queue/codeWorker.js';

// import { Logger } from '@hocuspocus/extension-logger';

process.on('uncaughtException', (err) => {
    console.error('\n🚨 CRITICAL UNCAUGHT EXCEPTION 🚨');
    console.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n🚨 CRITICAL UNHANDLED REJECTION 🚨');
    console.error(reason);
});


dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

connectDb();

app.use(cors({ origin: process.env.FRONTEND_API ,credentials:true}));
app.use(express.json());
app.use(cookieParser())


app.use("/api/auth",authRouter);
app.use("/api/file", fileRouter);
app.use("/api/collab", collaborationRouter);


const hocuspocus = new Hocuspocus({
    // port: 8001
       
   
    // extensions: [new Logger()],

    

    async onAuthenticate(data) {
        const token = data.token;
        console.log(`[Hocuspocus] Authentication attempt for room: ${data.documentName}`);

        if (!token) {
            throw new Error("Unauthorized: No token provided");
        }

        try {
            const decoded = jwt.verify(token, process.env.Access_Key);
            const userId = decoded.userId || decoded.id;

            // Strict permission check: User must be owner or active collaborator
            const isObjectId = mongoose.Types.ObjectId.isValid(data.documentName);
            if (isObjectId) {
                const file = await File.findById(data.documentName);
                if (file) {
                    const ownerId = file.owner ? file.owner.toString() : null;
                    const isOwner = ownerId && userId && ownerId === userId.toString();
                    const isCollab = (file.collaborators || []).some(c => c && c.toString() === userId.toString()) ||
                                     (file.collabration || []).some(c => c && c.toString() === userId.toString());

                    if (!isOwner && !isCollab) {
                        console.warn(`[Hocuspocus Auth Denied] User ${userId} is not authorized for file ${data.documentName}`);
                        throw new Error("Forbidden: This file is private and you do not have permission to access it.");
                    }
                }
            }

            console.log(`[Hocuspocus] User authenticated successfully!`);
            return decoded;
        } catch (err) {
            console.error("[Hocuspocus] Auth Failed:", err.message);
            throw new Error("Forbidden: " + err.message);
        }
    },

    async onLoadDocument(data) {
        try {
            console.log(`[Hocuspocus] Loading document for room: ${data.documentName}`);
            
            const yText = data.document.getText('monaco');

            // CRITICAL: Only inject content if Y.Text is truly empty.
            if (yText.length > 0) {
                console.log(`[Hocuspocus] Y.Text already has ${yText.length} chars, skipping DB injection.`);
                return;
            }

            const isObjectId = mongoose.Types.ObjectId.isValid(data.documentName);
            const query = isObjectId ? { _id: data.documentName } : { roomId: data.documentName };
            const file = await File.findOne(query);
            
            // If the file exists and has saved code, inject it into the Y.Text
            if (file && file.content) {
                console.log(`[Hocuspocus] Injecting existing code for "${file.name}" into editor (${file.content.length} chars)...`);
                yText.insert(0, file.content);
            }
        } catch (err) {
            console.error(`[Hocuspocus ERROR] Error in onLoadDocument:`, err.message);
        }
    },

    async onStoreDocument(data) {
        try {
            const rawCode = data.document.getText('monaco').toString();
            console.log(`[DB SAVE] File ${data.documentName} updated!`);

            const isObjectId = mongoose.Types.ObjectId.isValid(data.documentName);
            const query = isObjectId ? { _id: data.documentName } : { roomId: data.documentName };

            const file = await File.findOne(query);
            if (!file) {
                console.log(`[DB] Document ${data.documentName} not found in DB (nothing to update).`);
                return;
            }

            // Reject write if writer is not authorized
            const writerUserId = data.context?.userId || data.context?.id;
            if (writerUserId) {
                const ownerId = file.owner ? file.owner.toString() : null;
                const isOwner = ownerId && ownerId === writerUserId.toString();
                const isCollab = (file.collaborators || []).some(c => c && c.toString() === writerUserId.toString()) ||
                                 (file.collabration || []).some(c => c && c.toString() === writerUserId.toString());

                if (!isOwner && !isCollab) {
                    console.warn(`[DB SAVE BLOCKED] Unauthorized write rejected for user ${writerUserId} on file ${data.documentName}`);
                    return;
                }
            }

            const updated = await File.findOneAndUpdate(
                query, 
                { $set: { content: rawCode } },
                { returnDocument: 'after' }
            );

            if (updated) {
                console.log(`[DB] Successfully saved "${updated.name}" (${data.documentName}) to MongoDB!`);
            } else {
                console.log(`[DB] Document ${data.documentName} not found in DB (nothing to update).`);
            }
        } catch (err) {
            console.error(`[DB ERROR] Failed to save document ${data.documentName}:`, err.message);
        }
    }
});

// Start Hocuspocus completely independently!
// hocusServer.listen();
// console.log("Hocuspocus (Yjs) is running on ws://localhost:8001");


// noServer: true → this WSS won't listen on any port by itself
// We manually feed it connections from the HTTP server's 'upgrade' event

const hocuspocusWSS  = new WebSocketServer({noServer:true})



// Socket.IO handles /socket.io/ path automatically — we don't need
    // to do anything here for it. It registered its own 'upgrade' listener
    // when we passed 'server' to new SocketIOServer(server, ...).
    //

const io = new SocketIOServer(server, {
    cors: { 
        origin: (origin, callback) => {
            // Allow all localhost origins (e.g. Vite on 5173, 5174, etc.) or FRONTEND_API
            callback(null, true);
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    destroyUpgrade: false
});

app.set('io', io);

io.use((socket, next) => {
   try {
        const token = socket.handshake.auth?.token;
        
        if (!token || token.trim() === "") {
            console.warn(`[Socket.IO Auth] Connection rejected for ${socket.id}: No token provided`);
            return next(new Error("Unauthorized: No token provided"));
        }

        jwt.verify(token, process.env.Access_Key, (err, decodedPayload) => {
            if (err) {
                console.warn(`[Socket.IO Auth] Connection rejected for ${socket.id}: Invalid token (${err.message})`);
                return next(new Error("Forbidden: Invalid or expired token"));
            }

            socket.user = decodedPayload;
            console.log(`[Socket.IO Auth] Socket ${socket.id} authenticated for user: ${decodedPayload.userId || decodedPayload.id || 'authorized'}`);
            next();
        });
   } catch (error) {
        console.error(`[Socket.IO Auth] Unexpected error:`, error.message);
        next(new Error("Unknown Server Error"));
   }
});

// Register interactive collaborative terminal Socket.IO handlers
registerTerminalSocket(io);

// Register collaborative room chat Socket.IO handlers
registerChatSocket(io);

io.on('connection', (socket) => {
    const userId = socket.user?.userId || socket.user?.id;
    if (userId) {
        socket.join(`user:${userId}`);
        socket.join(userId.toString());
        console.log(`[Socket] User ${userId} (${socket.id}) connected & joined personal socket rooms`);
    } else {
        console.log(`[Socket] User connected: ${socket.id}`);
    }

    socket.on('disconnect', (reason) => {
        console.log(`[Socket] User disconnected: ${socket.id} (${reason})`);
    });
});

server.on("upgrade",(request,socket,head)=>{
      
     // Parse the URL to check the path
       const { pathname } = new URL(request.url, `http://localhost:${PORT}`);

       console.log("requestUrl:",request.url);

       console.log("PathName :",pathname);
       
       
       
       if(pathname === '/yjs'){

        // hocuspocusWSS.handleUpgrade() does the HTTP→WebSocket upgrade,

        // then fires the 'connection' event above, which calls

        // hocuspocus.handleConnection(ws, request)

             
        hocuspocusWSS.handleUpgrade(request,socket,head,(ws)=>{
              hocuspocusWSS.emit("connection",ws,request);
        });
       }

});


hocuspocusWSS.on('error', (err) => {
    console.error('[Hocuspocus WSS Error]:', err.message);
});

// When a WebSocket connection is established on this WSS,
// hand it over to Hocuspocus
hocuspocusWSS.on('connection', (ws, request) => {
    console.log(`[WSS] Connection established, wiring up Hocuspocus v4...`);
    
    ws.on('error', (err) => {
        console.error(`[WS Client Error]:`, err.message);
    });

    // 1. v4 strictly requires a Web Standard Request, not a Node IncomingMessage
    const webRequest = new Request(`http://localhost:${process.env.PORT || 8000}${request.url}`);
    
    // 2. Capture the connection instance it returns
    const clientConnection = hocuspocus.handleConnection(ws, webRequest);
    
    // 3. YOU must manually listen for messages and hand them to Hocuspocus
    ws.on('message', (data) => {
        try {
            clientConnection.handleMessage(data);
        } catch (err) {
            console.error(`[Hocuspocus Message Error]:`, err.message);
        }
    });
    
    // 4. YOU must manually tell Hocuspocus when it closes
    ws.on('close', (code, reason) => {
        try {
            clientConnection.handleClose({ code, reason });
        } catch (err) {
            console.error(`[Hocuspocus Close Error]:`, err.message);
        }
    });
});


server.listen(PORT, () => {
    console.log(`Node JS server is running on http://localhost:${PORT}`);
});
