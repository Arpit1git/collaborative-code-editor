import React, { useRef, useState } from 'react'
import Editor, { DiffEditor, useMonaco, loader } from '@monaco-editor/react';


const MonacoEditorWrappe = ({language,editorRef}) => {
 

    // This runs once when Monaco loads
    
 function handleEditorChange (editor,monaco){
       editorRef.current=editor;
 }   
 
 
 return <div >
          <Editor height="90vh" theme="vs-dark" language={language} onMount={handleEditorChange}/>
 </div>;

}

export default MonacoEditorWrappe

