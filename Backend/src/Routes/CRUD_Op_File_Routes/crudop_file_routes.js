import { Router } from "express";
import {CreateFile,SearchFile,compileFile} from "../../Controllers/GenrateFileController/create_file.js"


const fileRouter = Router();

fileRouter.post('/create',CreateFile);

fileRouter.get("/:id",SearchFile);

fileRouter.post("/compile",compileFile);

export default fileRouter;