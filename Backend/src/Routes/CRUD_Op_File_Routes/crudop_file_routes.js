import { Router } from "express";
import {CreateFile,SearchFile} from "../../Controllers/GenrateFileController/create_file.js"


const fileRouter = Router();

fileRouter.post('/create',CreateFile);

fileRouter.get("/:id",SearchFile);

export default fileRouter;