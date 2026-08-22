import {useRef, useState} from 'react'
import Split from 'react-split'

import MonacoEditorWrappe from './features/Editor/Components/MonacoEditorWrappe.jsx'
import TopControlBar from './features/Editor/Components/TopControlBar.jsx'
import Terminal from './features/Editor/Components/Terminal.jsx'
import useCodeExecution from './features/Execution/Hooks/useCodeExecution.js'

const App = () => {


  const [language, setlanguage] = useState("javascript")
  const [fileName, setfileName] = useState("Enter FileNmae")

  const editorRef = useRef(null);

  const {Output, 
        setOutput, 
        isWaitingForInput, 
        setIsWaitingForInput, 
        handleRunFile } = useCodeExecution

 return (
    <div className='h-screen flex flex-col bg-gray-900 overflow-hidden'>

      <TopControlBar language={language} setLanguage={setlanguage} fileName={fileName} setfileName={setfileName} setOutput={setOutput} editorRef={editorRef}  isWaitingForInput ={isWaitingForInput}  setIsWaitingForInput={setIsWaitingForInput} handleRunFile={handleRunFile} />
      

       
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
          <MonacoEditorWrappe language={language} editorRef={editorRef} />
        </div>
       

      
        <div className='bg-black h-full'>
          <Terminal Output={Output} isWaitingForInput={isWaitingForInput} setIsWaitingForInput={setIsWaitingForInput} handleRunFile={handleRunFile} editorRef={editorRef} language={language}/>
        </div>
        
       </Split>
    </div>
  )
}

export default App