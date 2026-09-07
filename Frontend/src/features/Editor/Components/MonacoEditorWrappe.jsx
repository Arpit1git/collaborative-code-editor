
import Editor from '@monaco-editor/react';
import useCollabration from '../Hooks/useCollabration.js'
import { useState } from 'react';

const MonacoEditorWrappe = ({language,editorRef,roomId}) => {
      

      const [isReady, setIsReady] = useState(false)
      
      useCollabration(editorRef,"default_room", isReady);

    // This runs once when Monaco loads
    
 function handleEditorChange (editor,monaco){
       editorRef.current=editor;
       setIsReady(true);
 }   
 
 
 return <div className='w-full h-full'>
          <Editor height="100%" theme="vs-dark" language={language} onMount={handleEditorChange}/>
 </div>;

}

export default MonacoEditorWrappe