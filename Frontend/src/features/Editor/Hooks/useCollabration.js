import { useEffect } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider'; // NEW IMPORT
import { MonacoBinding } from 'y-monaco';

const useCollabration = (editorRef, roomId, isReady) => {
  useEffect(() => {
    if (!isReady || !editorRef.current) return;


    console.log("⚡ React is OPENING the connection!");

    const ydoc = new Y.Doc();

    // The modern Hocuspocus connection
  const provider = new HocuspocusProvider({
         url: 'ws://localhost:8001', 
         name: roomId, 
         document: ydoc,
    });

  provider.on('disconnect', () => {
        console.log("❌ The server dropped the connection!");
    });

    const type = ydoc.getText('monaco');

    const monacoBinding = new MonacoBinding(
      type,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness
    );

    return () => {

      console.log("🧹 React is DESTROYING the connection!");

      monacoBinding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [ roomId, isReady]);
};

export default useCollabration;