
import { User } from "../../Models/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";



/**
 * @name :Registered
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

       const saltRound = 10;
       const hasedPassword = await bcrypt.hash(password,saltRound);

       const payload = {userName,email};

       const accessToken = await jwt.sign(payload,)

       User.create({
          userName,
          email,
          password:hasedPassword
       });

       return res.status(201).json({
        success:true,
        message:"Account Created Successfully........"
       })

        

    } catch (error) {
        console.log("Erroe Occur While  userSignUp:",error.message);
        return res.status(500).json({
            success:false,
            message:"Server Error ):"
        })
    }
} 



export const loginUser = async(req,res)=>{
      try {

         const {email,password} =  req.body;

        if( email.trim()==="" ||!email || !password || !password.trim()===""){
              
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

        return res.status(200).json({
            success:true,
            message:"User Sucessfully Logined..."
        })
        
      } catch (error) {
         console.log("Erroe Occur While  loginUser:",error.message);
         return res.status(500).json({
            success:false,
            message:"Server Error ):"
         })
      }
}