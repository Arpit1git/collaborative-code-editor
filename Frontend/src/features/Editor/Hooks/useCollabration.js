import React, { useEffect } from 'react'
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'



const useCollabration = (editorRef, roomId,isReady) => {

    useEffect(() => {
       
     if(  !isReady|| !editorRef.current) return ;
    
    // this acts as the local mathematical brain that will calculate all the conflict-free merges.
       const ydoc = new Y.Doc()  
    //    Connect peers directly using WebRTC for the specific file/room
       const provider = new WebsocketProvider(roomId, ydoc)
    //    Define the shared text data structure
       const type = ydoc.getText('monaco')

    // 4. Bind the React editor reference to the Yjs document   

      const monacoBinding = new MonacoBinding(
            type,
            editorRef.current.getModel(),
            new Set([editorRef.current]),
            provider.awareness
        );

      return () => {
       monacoBinding.destroy();
       provider.destroy();
       ydoc.destroy();
      };
    }, [editorRef,roomId,isReady])
};

export default useCollabration;