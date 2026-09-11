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


import connectDb from "./src/Config/Mongo_db.js";
import fileRouter from "./src/Routes/CRUD_Op_File_Routes/crudop_file_routes.js";
import authRouter from './src/Routes/Auth_Routes/authRoute.js';
import './src/Queue/codeWorker.js';

import { Logger } from '@hocuspocus/extension-logger';



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
            console.log(`[Hocuspocus] User authenticated successfully!`);
            return decoded;
        } catch (err) {
            console.error("[Hocuspocus] Auth Failed: Invalid token");
            throw new Error("Forbidden: Invalid or expired token");
        }
    },

    async onLoadDocument(data) {
        try {
            console.log(`[Hocuspocus] Loading document for room: ${data.documentName}`);
            const isObjectId = mongoose.Types.ObjectId.isValid(data.documentName);
            const query = isObjectId ? { _id: data.documentName } : { roomId: data.documentName };
            const file = await File.findOne(query);
            
            // If the file exists and has saved code, inject it into the editor
            if (file && file.content) {
                const yText = data.document.getText('monaco');
                
                // Only inject if the Yjs document is currently empty
                if (yText.length === 0) {
                    console.log(`[Hocuspocus] Injecting existing code for "${file.name}" into editor...`);
                    yText.insert(0, file.content);
                }
            }
        } catch (err) {
            console.error(`[Hocuspocus ERROR] Error in onLoadDocument:`, err.message);
        }
    },

    async onStoreDocument(data) {
        try {
            const rawCode = data.document.getText('monaco').toString();
            console.log(`[DB SAVE] File ${data.documentName} updated!`);
            console.log(`Code Content:\n${rawCode}`);

            const isObjectId = mongoose.Types.ObjectId.isValid(data.documentName);
            const query = isObjectId ? { _id: data.documentName } : { roomId: data.documentName };

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
    cors: { origin: process.env.FRONTEND_API, methods: ["GET", "POST"] },
    destroyUpgrade: false
});

io.use((socket,next)=>{
   try {

        const token = socket.handshake.auth.token;
        

        if(!token || token.trim()==="")
        {
            return next(new Error("Unauthorized: No token provided"));
        }

        jwt.verify(token,process.env.Access_Key,(err,decodedPayload)=>{
             
        if(err)
        {
            return next(new Error("Forbidden: Invalid or expired token"));
        }

        socket.user = decodedPayload;
        next();
    })
    
   } catch (error) {
        next(new Error("Unknown Server Error"));
   }
})

io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
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


// When a WebSocket connection is established on this WSS,
// hand it over to Hocuspocus

hocuspocusWSS.on('connection', (ws, request) => {
    console.log(`[WSS] Connection established, wiring up Hocuspocus v4...`);
    
    // 1. v4 strictly requires a Web Standard Request, not a Node IncomingMessage
    const webRequest = new Request(`http://localhost:${process.env.PORT || 8000}${request.url}`);
    
    // 2. Capture the connection instance it returns
    const clientConnection = hocuspocus.handleConnection(ws, webRequest);
    
    // 3. YOU must manually listen for messages and hand them to Hocuspocus
    ws.on('message', (data) => {
        clientConnection.handleMessage(data);
  
        
    });
    
    // 4. YOU must manually tell Hocuspocus when it closes
    ws.on('close', (code, reason) => {
        clientConnection.handleClose({ code, reason });
    });
});


server.listen(PORT, () => {
    console.log(`Node JS server is running on http://localhost:${PORT}`);
});
