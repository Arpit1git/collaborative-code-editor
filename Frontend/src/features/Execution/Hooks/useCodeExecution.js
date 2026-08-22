import { useState } from "react"
import {runFile} from '../../Workspace/api/fileapi.js';




const useCodeExecution = () => {
   
     const [Output, setOutput] = useState("")
     const [isWaitingForInput, setIsWaitingForInput] = useState(false);


     const handleRunFile = async (content,language,customInput="") => {

        if (!content || !language) {
            alert("Code and language are required");
            return;
        }

        try {
            setOutput("Executing in secure sandbox..."); 
            const res = await runFile(content, language, customInput);
            setOutput(res.output);
        } catch (error) {
            setOutput("Run Error:\n" + error.message);
        }

     } 
   

  return { 
        Output, 
        setOutput, 
        isWaitingForInput, 
        setIsWaitingForInput, 
        handleRunFile 
    };
}

export default useCodeExecution