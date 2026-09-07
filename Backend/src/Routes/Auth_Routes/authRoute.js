import { Router } from "express";

import {userSignUp ,loginUser , refreshToken, logout,getMe} from '../../Controllers/AuthenticationController/auth_Controller.js';

import {authMiddleware} from '../../Middleware/authMiddleWare.js'

const authRouter = Router();



authRouter.post("/signup",userSignUp);
authRouter.post("/login",loginUser);
authRouter.post("/refresh", refreshToken);
authRouter.post("/logout",authMiddleware,logout);
authRouter.get("/getMe",authMiddleware,getMe)



export default authRouter