import {User} from '../Models/user.js';
import jwt from 'jsonwebtoken';

export const generateTokensAndSetCookie = async (userId,res)=>{

   

    try {
        
    const serachUser = await User.findById(userId);

    if(!serachUser){
         return null;
    }

    const accessToken =  jwt.sign({userId:serachUser._id,email:serachUser.email},process.env.Access_Key,{expiresIn:"5m"})

    const refreshToken = jwt.sign({userId:serachUser._id},process.env.Refresh_Key,{expiresIn:"7d"})

     serachUser.refreshToken = refreshToken;
     await serachUser.save();

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
         httpOnly: true,
         sameSite: isProduction ? "none" : "lax",
         secure: isProduction,
         maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("refreshToken", refreshToken, cookieOptions);
     
    return accessToken;


    } catch (error) {
        console.error("Error while genrating token ");
        return null;
    }

  
}