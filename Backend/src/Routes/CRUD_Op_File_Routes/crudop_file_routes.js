import { Router } from "express";
import { 
    CreateFileOrFolder, 
    SearchFile, 
    GetRootFileOrFolder, 
    GetFilesInsideFolder,
    DeleteFileOrFolder
} from "../../Controllers/GenrateFileController/create_file.js";
import { authMiddleware } from '../../Middleware/authMiddleWare.js';

const fileRouter = Router();

fileRouter.post('/create', authMiddleware, CreateFileOrFolder);
fileRouter.get('/root', authMiddleware, GetRootFileOrFolder);
fileRouter.get('/folder/:parentId', authMiddleware, GetFilesInsideFolder);
fileRouter.get("/:id", authMiddleware, SearchFile);
fileRouter.delete("/:id", authMiddleware, DeleteFileOrFolder);

export default fileRouter;