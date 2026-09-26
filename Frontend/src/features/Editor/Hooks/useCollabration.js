import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { MonacoBinding } from 'y-monaco';
import { useAuth } from '../../auth/Context/AuthContext';
import { WS_API } from '../../../Config/apiConfig.js';

const useCollabration = (editorRef, roomId, isReady) => {
  const { accessToken } = useAuth();

  // Keep a ref to track if this hook instance has already been set up.
  // This prevents React StrictMode double-fire from creating duplicate providers.
  const providerRef = useRef(null);

  useEffect(() => {
    if (!isReady || !editorRef.current || !accessToken) return;

    // Guard: if a provider already exists for this exact roomId, skip
    if (providerRef.current?.roomId === roomId) return;

    console.log("⚡ useCollabration: OPENING connection for room:", roomId);

    const ydoc = new Y.Doc();

    const provider = new HocuspocusProvider({
      url: WS_API,
      name: roomId,
      document: ydoc,
      token: accessToken,
      // CRITICAL: Don't let the provider broadcast local content before
      // the server has a chance to send its authoritative state.
      // This prevents the duplication on reconnect.
      broadcast: false,
    });

    providerRef.current = { provider, roomId };

    // CRITICAL FIX: Clear the editor BEFORE creating the binding.
    // This ensures MonacoBinding doesn't copy stale editor content into Y.Text
    // before the server sync arrives. The server's onLoadDocument will inject
    // the correct content into Y.Text, which then flows to Monaco via the binding.
    const editor = editorRef.current;
    const model = editor.getModel();

    // Save cursor position to restore after sync
    const savedPosition = editor.getPosition();

    // Clear the editor model so MonacoBinding starts with empty content
    // (the server will push the real content via Y.Text after sync)
    model.setValue('');

    const type = ydoc.getText('monaco');

    const monacoBinding = new MonacoBinding(
      type,
      model,
      new Set([editor]),
      provider.awareness
    );

    provider.on('connect', () => {
      console.log("✅ useCollabration: connected to server for room:", roomId);
    });

    provider.on('synced', () => {
      console.log("🔄 useCollabration: synced with server for room:", roomId);
      // Restore cursor position after sync if possible
      if (savedPosition) {
        try {
          editor.setPosition(savedPosition);
        } catch (e) {
          // Position may be out of range if content changed, ignore
        }
      }
    });

    provider.on('disconnect', () => {
      console.log("❌ useCollabration: disconnected from server for room:", roomId);
    });

    return () => {
      console.log("🗑️ useCollabration: DESTROYING connection for room:", roomId);
      providerRef.current = null;
      monacoBinding.destroy();
      provider.destroy();
      ydoc.destroy();
    };

  }, [roomId, isReady, accessToken]);
};

export default useCollabration;