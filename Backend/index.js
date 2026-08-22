import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import connectDb from "./src/Config/Mongo_db.js"
import  fileRouter from "./src/Routes/CRUD_Op_File_Routes/crudop_file_routes.js";
import './src/Queue/codeWorker.js';

dotenv.config();

const app = express();
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

app.listen(PORT, ()=>{
    console.log(`node js server is running on http://localhost:${PORT}`);
})