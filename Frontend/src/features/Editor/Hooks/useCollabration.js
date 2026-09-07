// import { useEffect } from 'react';
// import * as Y from 'yjs';
// import { HocuspocusProvider } from '@hocuspocus/provider';
// import { MonacoBinding } from 'y-monaco';
// import { useAuth } from '../../auth/Context/AuthContext';

// const useCollabration = (editorRef, roomId, isReady) => {
//   const { accessToken } = useAuth();

//   useEffect(() => {
//     if (!isReady || !editorRef.current || !accessToken) return;


//     console.log("⚡ React is OPENING the connection!");

//     const ydoc = new Y.Doc();

//     // The modern Hocuspocus connection
// const provider = new HocuspocusProvider({
//     url: import.meta.env.VITE_WS_API, 
//     name: roomId,
//     document: ydoc,
//     token: accessToken,
// });
   
//   provider.on('connect',()=>{
//      console.log("✅  provider has successfully connected to the serve");     
//   })  

  

//   provider.on('disconnect', () => {
//         console.log("❌ The server dropped the connection!");
//     });

//     const type = ydoc.getText('monaco');

//     const monacoBinding = new MonacoBinding(
//       type,
//       editorRef.current.getModel(),
//       new Set([editorRef.current]),
//       provider.awareness
//     );

//     return () => {
//       console.log(" React is DESTROYING the connection!");
//       monacoBinding.destroy();
//       provider.destroy();
//       ydoc.destroy();
//     };

//   }, [ roomId, isReady, accessToken]);
// };

// export default useCollabration;

import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { MonacoBinding } from 'y-monaco';
import { useAuth } from '../../auth/Context/AuthContext';

const useCollabration = (editorRef, roomId, isReady) => {
  const { accessToken } = useAuth();

  // --- DEBUG BLOCK START ---
  const prevDeps = useRef({ roomId, isReady, accessToken });
  
  useEffect(() => {
    if (prevDeps.current.roomId !== roomId) console.warn("🚨 roomId changed!", roomId);
    if (prevDeps.current.isReady !== isReady) console.warn("🚨 isReady changed!", isReady);
    if (prevDeps.current.accessToken !== accessToken) console.warn("🚨 accessToken changed!");
    
    prevDeps.current = { roomId, isReady, accessToken };
  }, [roomId, isReady, accessToken]);
  // --- DEBUG BLOCK END ---

  useEffect(() => {
    if (!isReady || !editorRef.current || !accessToken) return;

    console.log("⚡ React is OPENING the connection!");
    console.log("Creating provider with:", { url: import.meta.env.VITE_WS_API, roomId, accessToken });

    const ydoc = new Y.Doc();

    // The modern Hocuspocus connection
    const provider = new HocuspocusProvider({
        url: import.meta.env.VITE_WS_API, 
        name: roomId,
        document: ydoc,
        token: accessToken,
    });
       
    provider.on('connect',()=>{
         console.log("✅  provider has successfully connected to the serve");  
            console.log("Creating provider with:", { url: import.meta.env.VITE_WS_API, roomId, accessToken });   
    })  

    provider.on('disconnect', () => {
          console.log("❌ The server dropped the connection!");
             console.log("Creating provider with:", { url: import.meta.env.VITE_WS_API, roomId, accessToken });
      });

    const type = ydoc.getText('monaco');

    const monacoBinding = new MonacoBinding(
      type,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness
    );

    return () => {
      console.log(" React is DESTROYING the connection!");
      monacoBinding.destroy();
      provider.destroy();
      ydoc.destroy();
    };

  }, [roomId, isReady, accessToken]);
};

export default useCollabration;