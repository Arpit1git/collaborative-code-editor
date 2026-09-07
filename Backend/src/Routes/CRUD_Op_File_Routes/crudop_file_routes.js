import { Router } from "express";
import {CreateFile,SearchFile} from "../../Controllers/GenrateFileController/create_file.js";
import {compileFile} from "../../Controllers/CodeCompilationcontroller/compilation.js";
import { authMiddleware } from '../../Middleware/authMiddleWare.js';

const fileRouter = Router();

fileRouter.post('/create',authMiddleware,CreateFile);

fileRouter.get("/:id",authMiddleware,SearchFile);

fileRouter.post("/compile",authMiddleware,compileFile);


export default fileRouter;