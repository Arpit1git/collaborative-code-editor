import {File} from '../../Models/file.js'


/** 
 * @name:CreateFile
 * @decription: using this router user can create file
 * @acess:public
   */

export const CreateFile = async(req,res)=>{
       try { 

        const {fileName,content,language} = req.body;

        if(!fileName || !language){
             return res.status(400).json({
                success:false,
                message:"fileName and language is required"
             })
        }

        const checkFileExist = await File.findOne({fileName});

        if(checkFileExist){
             return res.status(400).json({
                success:false,
                message:"already a file exist by same name",
             })
        }

        const create_file = await  File.create({
            fileName,
            content:content || "",
            language
        })

        console.log("sending msg to frontend from backend......");
        

        return res.status(200).json({
            success: true,
            message: `File ${fileName} is created`,
            fileId: create_file._id
        })
        
       } catch (error) {
          console.error("Error: while creating file from GenrateFileController/create_file.js\n",error.message);
          res.status(500).json({ success: false, message: "Server Error" });
       }
}

/**
 * @name:SearchFile
 * @description:this allow to serch file using _id
 * @access:public
   */

export const SearchFile = async(req,res)=>{
    try {

        const {id} = req.params;

        if(!id){
            return res.status(400).json({
                success:false,
                message:"id required"
             })
        }

        const serch_file = await File.findById(id);

        if(!serch_file)
        {
            return res.status(404).json({
                success:false,
                message:`File is not exist `
            })
        }


        return res.status(200).json({
                success:true,
                message:"File avail",
                file:serch_file,
            })


        
    } catch (error) {

          
          console.error("Error: while searching file from GenrateFileController/create_file.js\n",error.message);

          if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: "Invalid File ID format" });
          }

          res.status(500).json({ success: false, message: "Server Error" });
    }
}