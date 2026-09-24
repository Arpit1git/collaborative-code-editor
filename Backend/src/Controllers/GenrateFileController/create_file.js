import {File} from '../../Models/file.js'


/** 
* @name: GetRootFileOrFolder
 * @description: Fetches all files and folders at the root level (no parent directory) for the logged-in user.
 * @access: private
   */

 
export const GetRootFileOrFolder = async (req,res)=>{
        try {

            const {userId} = req.user;

            const searchRootFileAndFolder = await File.find({ owner: userId, parentId: null });
            
            console.log("\n");
            
            console.log("searchRootFileAndFolder :",searchRootFileAndFolder);

            console.log("\n");
            
             return res.status(200).json({
                success:true,
                message:"file fetch Successfully...",
                data:searchRootFileAndFolder
             })

        } catch (error) {
            console.error("Error while fetching file...",error.message);
            return res.status(500).json({
                success:false,
                message:"Unkown Internal Serve Error"
            })
        }
}

/** 
* @name: GetFilesInsideFolder
 * @description: Fetches all files and folders contained within a specific parent folder.
 * @access: private
   */

export const GetFilesInsideFolder = async (req,res)=>{
      try {

         const {userId} = req.user;
         const {parentId} = req.params;


         if (!parentId) {
            return res.status(400).json({ success: false, message: "Parent ID is required" });
        }


         const searchFile = await File.find({
                  parentId:parentId,
                  owner:userId
         });

          
         return res.status(200).json({
              success:true,
              message:"Successfully Fetch Filed",
              data:searchFile
         })
        
      } catch (error) {

           console.error("Error while fetching file fromFolder...",error.message);

           return res.status(500).json({
                success:false,
                message:"Unkown Internal Serve Error"
            })
           
      }
}


/** 
 * @name:CreateFileOrFolder
 * @decription: using this router user can create file
 * @acess:private
   */

export const CreateFileOrFolder = async(req,res)=>{
       try { 

           const {isFolder,name,parentId="",language=""} = req.body;
           const {userId} = req.user;

           if(!name){
               return res.status(400).json({
                 success:false,
                 message:"name is required"
               })
           }

           const seachfileorFolderNmae = await File.findOne(
            {
                name:name,
                parentId:parentId||null,
                owner:userId
            }
        );

           

           if(seachfileorFolderNmae){
                 return res.status(400).json({
                    success:false,
                    message:"File or Folder exist by this name"
                 })
           }

           // 3. Ensure the parent is actually a folder (if parentId is provided)
         let computedRootId = null;

         if (parentId) {
            const parentNode = await File.findOne({ _id: parentId, owner: userId });
            if (!parentNode) {
                return res.status(404).json({ success: false, message: "Parent directory not found." });
            }
            if (!parentNode.isFolder) {
                return res.status(400).json({ success: false, message: "Cannot place an item inside a file." });
            }

            computedRootId = parentNode?.rootId?parentNode.rootId :parentNode._id
        }

          
           
           if(isFolder){
              
             const folder=   await File.create({
                     name:name,
                     isFolder:true,
                     owner:userId,
                     parentId:parentId || null,
                     rootId:computedRootId || null
                })

                return res.status(201).json({
                    success:true,
                    message:"Folder Created Successfully",
                    data:folder
                })
             
           }

          


           const createFile  = await File.create({
                    
                  name:name,
                  isFolder:false,
                  owner:userId,
                  parentId:parentId || null,
                  rootId: computedRootId  ||null,
                  language: language || "javascript"
           })


          return res.status(201).json({
            success: true,
            message: "File Created Successfully",
            data: createFile
        });

        
       } catch (error) {

          if(error.code==11000)
          {
             return res.status(409).json({
                success:false,
                message:"A file or folder with this name already exists in this location."
             })
          }
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