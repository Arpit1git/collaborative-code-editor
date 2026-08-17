import React ,{useRef, useState} from 'react'
import MonacoEditorWrappe from './features/Editor/Components/MonacoEditorWrappe.jsx'
import TopControlBar from './features/Editor/Components/TopControlBar.jsx'


const App = () => {


  const [language, setlanguage] = useState("javascript")
  const [fileName, setfileName] = useState("Enter FileNmae")

  const editorRef = useRef(null);

  return (
    <div>
      <TopControlBar language={language} setLanguage={setlanguage} fileName={fileName} setfileName={setfileName} editorRef={editorRef}  />
      <MonacoEditorWrappe language={language} editorRef={editorRef} />
    </div>
  )
}

export default App