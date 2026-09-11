import { Router } from "express";
import { CreateFileOrFolder, SearchFile, GetRootFileOrFolder, GetFilesInsideFolder } from "../../Controllers/GenrateFileController/create_file.js";
import { compileFile } from "../../Controllers/CodeCompilationcontroller/compilation.js";
import { authMiddleware } from '../../Middleware/authMiddleWare.js';

const fileRouter = Router();

fileRouter.post('/create', authMiddleware, CreateFileOrFolder);
fileRouter.get('/root', authMiddleware, GetRootFileOrFolder);
fileRouter.get('/folder/:parentId', authMiddleware, GetFilesInsideFolder);
fileRouter.get("/:id", authMiddleware, SearchFile);
fileRouter.post("/compile", authMiddleware, compileFile);

export default fileRouter;