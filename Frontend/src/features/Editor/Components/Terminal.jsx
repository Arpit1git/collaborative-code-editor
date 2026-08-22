import React, { useState } from 'react'

const Terminal = ({ Output, isWaitingForInput, setIsWaitingForInput, handleRunFile, editorRef, language }) => {
  
  // Local state just to hold what the user types before submitting
  const [inputText, setInputText] = useState("");

  const onSubmitInput = async () => {
      // 1. Grab the current code directly from the Monaco Editor
      const content = editorRef.current.getValue();

      // 2. Fire the execution API with the code, language, and the custom input!
      await handleRunFile(content, language, inputText);

      // 3. Close the input box and reset it for next time
      setIsWaitingForInput(false);
      setInputText("");
  }

  return (
    <div className='border-white text-amber-50 font-bold w-full h-full overflow-y-auto p-4 flex flex-col relative'>
      <p className='text-gray-400 mb-2'>Terminal</p>
      
      {/* Conditional Rendering: Input Mode vs. Output Mode */}
      {isWaitingForInput ? (
          
          <div className="flex flex-col h-full w-full flex-1">
             <p className="text-yellow-400 mb-2 text-sm font-normal">
                Input required! Type your custom input below:
             </p>
             
             {/* The "Invisible" Text Area */}
             <textarea 
                className="bg-transparent text-green-400 w-full flex-1 outline-none resize-none font-mono"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type inputs here..."
                autoFocus
             />
             
             <button 
                onClick={onSubmitInput}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 mt-2 rounded self-end w-full md:w-auto"
             >
                Submit Input
             </button>
          </div>

      ) : (

          // Standard Output Mode
          <pre className="font-mono text-green-400 whitespace-pre-wrap">
              {Output}
          </pre>

      )}
    </div>
  )
}

export default Terminal