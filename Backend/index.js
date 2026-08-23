import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import http from 'http'
import { Server } from "socket.io"

import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils.js';

import connectDb from "./src/Config/Mongo_db.js"
import  fileRouter from "./src/Routes/CRUD_Op_File_Routes/crudop_file_routes.js";
import './src/Queue/codeWorker.js';


dotenv.config();

const app = express();

const server = http.createServer(app);



const PORT  = process.env.PORT ;

connectDb();

app.use(cors({
    origin: process.env.FRONTEND_API
}));

app.use(express.json())

app.use("/api/file",fileRouter)


app.get("/health",(req,res)=>{
     return res.status(200).json({
        "success":true,
        "message":"node_js server is running..."
     })
})

const wss = new WebSocketServer({
    Server:server,
    path:'/yjs'
})

const io =  new Server(server,{
    cors:{
        origin: process.env.FRONTEND_API,
        methods: ["GET", "POST"]
    }
})

wss.on('connection', (ws, req) => {
    console.log("[Yjs] Peer connected to room:", req.url);
    
    // Hand the raw connection over to the Yjs utility.
    // This function automatically manages the rooms, syncs the peers, and resolves conflicts!
    setupWSConnection(ws, req);
});

io.on('connection',(socket)=>{
        console.log(`[Socket] User connected: ${socket.id}`);

        socket.on('disconnect',()=>{
             console.log(`[Socket] User disconnected: ${socket.id}`);
        })

})

server.listen(PORT, ()=>{
    console.log(`node js server is running on http://localhost:${PORT}`);
})