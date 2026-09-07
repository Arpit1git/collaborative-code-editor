import { useState }  from 'react'
import {handleSaveFile,getFileById} from "../../Workspace/api/fileapi.js"
import { useAuth } from "../../auth/Context/AuthContext"

const TopControlBar= ({language,setLanguage,fileName,setFileName,editorRef, setIsWaitingForInput,handleRunFile}) => {
   
    const { accessToken } = useAuth();

    const handleChangeValue  =(event)=>{
        setLanguage(event.target.value);
    }

    const handleFileNameChange = (event)=>{
        setFileName(event.target.value);
    }
    
  
    const handleSave = async   ()=>{
       try {

        const content = editorRef.current.getValue();
        const res = await  handleSaveFile(fileName,content,language,accessToken);

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

        
        const response = await getFileById(FileIdInput, accessToken);
        
        
        const fetchedFile = response.file;
        
       
        setLanguage(fetchedFile.language);
        setFileName(fetchedFile.fileName);
        
        
       if (editorRef.current) {
            editorRef.current.setValue(fetchedFile.content);
            
            setTimeout(() => {
                editorRef.current?.getAction('editor.action.formatDocument')?.run();
            }, 100);

        }

        alert("File loaded successfully!");
        
    } catch (error) {
        alert("Failed to load file: " + error.message);
    }
}

const inputKeywords = {
    cpp: ["cin", "scanf"],
    python: ["input(", "sys.stdin"],
    java: ["Scanner", "System.in"],
    javascript: ["readFileSync(0)", "readline"]
};

  const RunFile = async()=>{
       try {
           let content ;

           if(editorRef.current){
            content = editorRef.current.getValue();
           }

           if(!content || !language){
              throw new Error("code is required");
           }

          const keyWord = inputKeywords[language]?.some((key) => content.includes(key));

          if(keyWord){
              setIsWaitingForInput(true);
              return;
           }

         // Ensure you wait for the hook to finish executing
        await handleRunFile(content,language);



       } catch (error) {
          alert("Run Error :"+error.message)
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
            <option value="python">Python</option>
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
         onClick={RunFile}
        >
          Run
        </button>

    </div>
  )
}

export default TopControlBar