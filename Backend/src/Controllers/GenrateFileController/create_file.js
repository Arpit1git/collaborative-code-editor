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

/**
 * @name:CompileFile
 * @description:
 * @access:public
 */



// import fs from 'fs/promises';
// import path from 'path';
// import { exec } from 'child_process';
// import { promisify } from 'util';

// const execPromise = promisify(exec);

// export const compileFile = async (req, res) => {
//     try {
//         const { content, language } = req.body;

//         if (!content || !language) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Content and language Required."
//             });
//         }

//         const jobId = Date.now();
//         const fileExtension = language === 'cpp' ? 'cpp' : language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'txt';
//         const fileName = `job_${jobId}.${fileExtension}`;
//         const filePath = path.join(process.cwd(), fileName);
//         const exePath = path.join(process.cwd(), `job_${jobId}.exe`);

//         // Write the file asynchronously
//         await fs.writeFile(filePath, content);

//         let command = '';

//         if (language === 'javascript') {
//             command = `node "${filePath}"`;
//         } else if (language === 'python') {
//             command = `python "${filePath}"`;
//         } else if (language === 'cpp') {
//             // STEP 1: Compile the C++ code separately
//             try {
//                 await execPromise(`g++ "${filePath}" -o "${exePath}"`, { timeout: 5000 });
//             } catch (compileError) {
//                 // If it fails here, it's a syntax error in the C++ code
//                 await fs.unlink(filePath);
//                 return res.status(200).json({ 
//                     success: true, 
//                     output: "Compilation Error:\n" + (compileError.stderr || compileError.message) 
//                 });
//             }
//             // STEP 2: If compilation succeeds, set the command to just run the .exe
//             command = `"${exePath}"`;
//         } else {
//             await fs.unlink(filePath);
//             return res.status(400).json({ success: false, output: "Language not supported yet" });
//         }

//         // Execute the code (or the .exe)
//         try {
//             const { stdout, stderr } = await execPromise(command, { timeout: 5000 });
            
//             // CLEANUP on Success
//             await fs.unlink(filePath);
//             if (language === 'cpp') {
//                 await fs.unlink(exePath).catch(() => {}); 
//             }

//             return res.status(200).json({ success: true, output: stdout || stderr });

//         } catch (execError) {
//             // CLEANUP on Error
//             await fs.unlink(filePath);
//             if (language === 'cpp') {
//                 await fs.unlink(exePath).catch(() => {});
//             }
            
//             return res.status(200).json({ 
//                 success: true, 
//                 output: "Runtime Error:\n" + (execError.stderr || execError.message) 
//             });
//         }

//     } catch (error) {
//         console.error("Error while compiling_File :", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
// }

