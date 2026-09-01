
import {  User } from "../../Models/user.js";
import bcrypt from "bcrypt";
import { generateTokensAndSetCookie} from '../../Utils/genrateToken_utils.js';
import jwt from 'jsonwebtoken';


/**
 * @name userSignUp
 * @description Creates a new user, hashes their password, generates access/refresh tokens, 
 * saves the refresh token to the database, and sets the secure HTTP-only cookie.
 */


export const userSignUp = async (req,res)=>{
    try {
        const {userName,email,password} =  req.body;

        if( !userName ||userName.trim()==="" || email.trim()==="" ||!email || !password || !password.trim()===""){
              
            return res.status(400).json({
                 success:false,
                 message:"All credential Required",
            })
        }

        const findUser = await User.findOne({userName:userName,email:email});

        if(findUser){
             return res.status(400).json({
                success:false,
                message:"User already exist this credential...."
             })
        }

       const saltRound = 10;
       const hasedPassword = await bcrypt.hash(password,saltRound);

      
     const newUser = await User.create({
          userName,
          email,
          password:hasedPassword
       });


        const accessToken = await  generateTokensAndSetCookie(newUser._id,res);

       return res.status(201).json({
        success:true,
        message:"Account Created Successfully........",
        accessToken
       })

        

    } catch (error) {
        console.log("Erroe Occur While  userSignUp:",error.message);
        return res.status(500).json({
            success:false,
            message:"Server Error ):"
        })
    }
} 

/**
 * @name loginUser
 * @description Authenticates an existing user, verifies their password, and issues 
 * a fresh set of access and refresh tokens. (Note: Token generation logic was added here 
 * because logging in requires the exact same token delivery as signing up).
 */

export const loginUser = async(req,res)=>{
      try {

         const {email,password} =  req.body;

        if(!email ||email.trim()===""|| !password || !password.trim()===""){
            
            return res.status(400).json({
                 success:false,
                 message:"All credential Required );",
            })
        }

        const serachUser = await User.findOne({"email":email});

        if (!serachUser){
             return res.status(404).json({
                success:false,
                message:"User Not Found );"
             })
        }

        const isMatch = await bcrypt.compare(password,serachUser.password);

        if(!isMatch){
            return res.status(401).json({
                success:false,
                message:" check your email and password  ]:"
            })
        }

        const accessToken = await generateTokensAndSetCookie(serachUser._id,res);

        return res.status(200).json({
            success:true,
            message:"User Sucessfully Logined...",
            accessToken:accessToken
        })
        
      } catch (error) {
         console.log("Erroe Occur While  loginUser:",error.message);
         return res.status(500).json({
            success:false,
            message:"Server Error ):"
         })
      }
}

/**
 * @name refreshToken
 * @description Automatically intercepts the HTTP-only refresh token sent by the browser's cookies, 
 * synchronously verifies its cryptographic signature, and checks the database to ensure the token 
 * is still active. If valid, it issues a brand new short-lived Access Token without requiring the user to log in again.
 */



export const refreshToken = async(req,res)=>{
      try {

         const currentRefreshToken = req.cookies.refreshToken;

        
         

        if (!currentRefreshToken) {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized: No refresh token provided" 
            });
        }

       let decodedPayload;

       try {

            

            decodedPayload = jwt.verify(currentRefreshToken, process.env.Refresh_Key);
            
        
              
       } catch (error) {
           console.log("JWT VERIFY ERROR:", error.message);
           
             return res.status(403).json({
                success: false,
                message: "Forbidden: Invalid or expired refresh token"
            });
       }


      const searchUser = await User.findById(decodedPayload.userId);

      if(!searchUser){
           
           return res.status(404).json({
                success: false,
                message: "User not found"
            });
      }


      if(searchUser.refreshToken !== currentRefreshToken){
        return res.status(401).json({
                success: false,
                message: "Unauthorized: Token mismatch (potentially compromised)"
            });
      }


      
      const newAccessToken = jwt.sign({userId: searchUser._id, email: searchUser.email},process.env.Access_Key,{expiresIn: '15m'});



     return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            accessToken: newAccessToken
        });
          

        
      } catch (error) {
        console.error("Error  while RefreshToken ):");
        return res.status(500).json({
             success:false,
             message:"Unkown Server Error"
        })
      }
}


/**
 * @name logout
 * @description Securely logs a user out by removing their refresh token from the 
 * MongoDB database and clearing the HTTP-only cookie from their browser.
 */

export const logout = async(req,res)=>{
     try {

        const userId = req.user.userId; 
        const searchUser = await User.findById(userId);

        if(!searchUser){
             return res.status(404).json({
                success:false,
                message:"Uaser not found"
             })
        }

        searchUser.refreshToken="";
        await searchUser.save();

        const cookieOptions = {
            httpOnly: true,
            sameSite: "strict"
        };

        res.clearCookie("refreshToken", cookieOptions);

        return res.status(200).json({
            success:true,
            message:"User logout Sucessfully"
        })
        
     } catch (error) {
         console.error("Error while Logout..",error.message);
         return res.status(500).json({
            success:false,
            message:"Unkown Server Error"
         })
     }
} 