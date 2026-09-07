import { useRef, useState } from 'react';
import Split from 'react-split';


import MonacoEditorWrappe from '../Editor/Components/MonacoEditorWrappe.jsx';
import TopControlBar from '../Editor/Components/TopControlBar.jsx';
import Terminal from '../Editor/Components/Terminal.jsx';


import useCodeExecution from '../Execution/Hooks/useCodeExecution.js';

export function Editor() {
  const [language, setLanguage] = useState("javascript");
  const [fileName, setFileName] = useState("Enter FileName");

  const editorRef = useRef(null);

  const { 
        Output, 
        setOutput, 
        isWaitingForInput, 
        setIsWaitingForInput, 
        handleRunFile 
  } = useCodeExecution();

  return (
    <div className='h-screen flex flex-col bg-gray-900 overflow-hidden'>
      <TopControlBar 
          language={language} 
          setLanguage={setLanguage} 
          fileName={fileName} 
          setFileName={setFileName} 
          setOutput={setOutput} 
          editorRef={editorRef}  
          isWaitingForInput={isWaitingForInput}  
          setIsWaitingForInput={setIsWaitingForInput} 
          handleRunFile={handleRunFile} 
      />
       
       <Split
        className='flex flex-row flex-1 w-full' 
        sizes={[75, 25]} 
        minSize={100}
        expandToMin={false}
        gutterSize={10}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="horizontal"
        cursor="col-resize"
       >
        
        <div className='border-r border-gray-700 h-full'>
          <MonacoEditorWrappe language={language} editorRef={editorRef} roomId={fileName} />
        </div>
       
        <div className='bg-black h-full'>
          <Terminal 
              Output={Output} 
              isWaitingForInput={isWaitingForInput} 
              setIsWaitingForInput={setIsWaitingForInput} 
              handleRunFile={handleRunFile} 
              editorRef={editorRef} 
              language={language}
          />
        </div>
        
       </Split>
    </div>
  );
}