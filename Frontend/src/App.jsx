import React ,{useRef, useState} from 'react'
import MonacoEditorWrappe from './features/Editor/Components/MonacoEditorWrappe.jsx'
import TopControlBar from './features/Editor/Components/TopControlBar.jsx'
import Terminal from './features/Editor/Components/Terminal.jsx'

const App = () => {


  const [language, setlanguage] = useState("javascript")
  const [fileName, setfileName] = useState("Enter FileNmae")
  const [Output, setOutput] = useState("")

  const editorRef = useRef(null);

  return (
    <div>
      <TopControlBar language={language} setLanguage={setlanguage} fileName={fileName} setfileName={setfileName} setOutput={setOutput} editorRef={editorRef}  />
      <MonacoEditorWrappe language={language} editorRef={editorRef} />
      <Terminal Output={Output}/>
    </div>
  )
}

export default App