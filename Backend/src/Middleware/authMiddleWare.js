import jwt from "jsonwebtoken";

export const authMiddleware = async (req,res,next)=>{
    
      try {

        const authHeader =  req.headers.authorization ||  req.headers.Authorization;

        if(!authHeader?.startsWith('Bearer ')){
            return res.status(401).json({
                success: false, 
                message: "Unauthorized: No token provided"
            })
        }

        const token = authHeader.split(" ")[1];

         jwt.verify(token,process.env.Access_Key,(err,decodedPayload)=>{
               
            if(err){
                return res.status(401).json({ success: false, message: "Forbidden: Invalid or expired token" });
            }

            req.user = decodedPayload;

            next();
         });
       
        
      } catch (error) {
          console.error("Errro from authMiddleware",error.message);

          return res.status(500).json({
             success:false,
             message:"Unkown Server Error"
          })
          
      }
}