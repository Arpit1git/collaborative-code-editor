import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from 'http';
import { Server as SocketIOServer } from "socket.io";
import { Server } from '@hocuspocus/server';

import connectDb from "./src/Config/Mongo_db.js";
import fileRouter from "./src/Routes/CRUD_Op_File_Routes/crudop_file_routes.js";
import './src/Queue/codeWorker.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

connectDb();

app.use(cors({ origin: process.env.FRONTEND_API }));
app.use(express.json());
app.use("/api/file", fileRouter);


const hocusServer = new Server({
    port: 8001,
    async onStoreDocument(data) {
        const rawCode = data.document.getText('monaco').toString();
        console.log(`[DB SAVE] File ${data.documentName} updated!`);
        console.log(`Code Content:\n${rawCode}`);
    }
});

// Start Hocuspocus completely independently!
hocusServer.listen();
console.log("Hocuspocus (Yjs) is running on ws://localhost:8001");


const io = new SocketIOServer(server, {
    cors: { origin: process.env.FRONTEND_API, methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
    });
});


server.listen(PORT, () => {
    console.log(`Node JS server is running on http://localhost:${PORT}`);
});