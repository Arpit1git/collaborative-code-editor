import { Router } from "express";
import {CreateFile,SearchFile} from "../../Controllers/GenrateFileController/create_file.js"

import {compileFile} from "../../Controllers/CodeCompilationcontroller/compilation.js"

const fileRouter = Router();

fileRouter.post('/create',CreateFile);

fileRouter.get("/:id",SearchFile);

fileRouter.post("/compile",compileFile);


export default fileRouter;