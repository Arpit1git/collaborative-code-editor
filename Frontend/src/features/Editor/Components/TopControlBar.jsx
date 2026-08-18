import React, { useState }  from 'react'
import {handleSaveFile,getFileById,runFile} from "../../Workspace/api/fileapi.js"


const TopControlBar= ({language,setLanguage,fileName,setfileName,setOutput,editorRef}) => {
   
    const handleChangeValue  =(event)=>{
        setLanguage(event.target.value);
    }

    const handleFileNameChange = (event)=>{
        setfileName(event.target.value);
    }
    
  
    const handleSave = async   ()=>{
       try {

        const content = editorRef.current.getValue();
        const res = await  handleSaveFile(fileName,content,language,);

        alert("Filed Saved Successfully");
        
       } catch (error) {
           alert("Failed to save: " + error.message);
       }
    }

    const [FileIdInput, setFileIdInput] = useState("");

    const handleSetId = (event)=>{
        setFileIdInput(event.target.value);
    }

   const handleSearchFileById = async () => {
    try {
       
        if (!FileIdInput) {
            alert("Please enter a file ID to search!");
            return;
        }

        
        const response = await getFileById(FileIdInput);
        
        
        const fetchedFile = response.file;
        
       
        setLanguage(fetchedFile.language);
        setfileName(fetchedFile.fileName);
        
        
       if (editorRef.current) {
            editorRef.current.setValue(fetchedFile.content);
            
            setTimeout(() => {
                editorRef.current.getAction('editor.action.formatDocument').run();
            }, 100);

        }

        alert("File loaded successfully!");
        
    } catch (error) {
        alert("Failed to load file: " + error.message);
    }
}

  const handleRunFile = async()=>{
       try {
           let content ;

           if(editorRef.current){
            content = editorRef.current.getValue();
           }

           if(!content || !language){
              throw new Error("code is requirde");
           }

           const res = await runFile(content,language);
           
            setOutput(res.output);

       } catch (error) {
          alert("Run Error :",error)
       }
  }


  return (
    <div className='flex flex-wrap gap-5 px-4'> 
        <input 
        type="text" 
        value={fileName}
        onChange={handleFileNameChange}
        required
        placeholder='Enter fileName'
        className="border p-1"
        />

        <select   id="dropdown" value={language} onChange={handleChangeValue} >
            <option value="" disabled>--Select_Language--</option>
            <option value="cpp">C++</option>
            <option value="python">Pyhton</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
        </select>

       <button
       onClick={handleSave}
       className="bg-blue-500 text-white px-3 py-1 rounded"
       >
           Save
       </button>

       <input 
       className="border p-1"
       type="text"
       placeholder='Enter_Id'
       value={FileIdInput}
       onChange={handleSetId}
        />

        <button
         className="bg-blue-500 text-white px-3 py-1 rounded"
         onClick={handleSearchFileById}
        >
          Search
        </button>

        <button
         className="bg-green-600 text-white px-3 py-1 rounded"
         onClick={handleRunFile}
        >
          Run
        </button>

    </div>
  )
}

export default TopControlBar