
import Editor from '@monaco-editor/react';


const MonacoEditorWrappe = ({language,editorRef}) => {
 

    // This runs once when Monaco loads
    
 function handleEditorChange (editor,monaco){
       editorRef.current=editor;
 }   
 
 
 return <div className='w-full h-full'>
          <Editor height="100%" theme="vs-dark" language={language} onMount={handleEditorChange}/>
 </div>;

}

export default MonacoEditorWrappe