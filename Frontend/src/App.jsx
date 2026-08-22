import React ,{useRef, useState} from 'react'
import Split from 'react-split'

import MonacoEditorWrappe from './features/Editor/Components/MonacoEditorWrappe.jsx'
import TopControlBar from './features/Editor/Components/TopControlBar.jsx'
import Terminal from './features/Editor/Components/Terminal.jsx'


const App = () => {


  const [language, setlanguage] = useState("javascript")
  const [fileName, setfileName] = useState("Enter FileNmae")
  const [Output, setOutput] = useState("")

  const editorRef = useRef(null);

 return (
    <div className='h-screen flex flex-col bg-gray-900 overflow-hidden'>
      <TopControlBar language={language} setLanguage={setlanguage} fileName={fileName} setfileName={setfileName} setOutput={setOutput} editorRef={editorRef}  />

       {/* The Split component wraps BOTH children and acts as the flex container */}
       <Split
        className='flex flex-row flex-1 w-full' // Moved your flex classes here!
        sizes={[75, 25]} // Editor gets 75%, Terminal gets 25%
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
          <Terminal Output={Output}/>
        </div>
        
       </Split>
    </div>
  )
}

export default App