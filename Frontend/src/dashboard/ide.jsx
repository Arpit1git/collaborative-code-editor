import { useRef, useState, useEffect } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { 
  PanelLeft, 
  Terminal as TerminalIcon, 
  Sparkles, 
  MessageSquare,
  Code2,
  Play,
  Square
} from 'lucide-react';

import Left from './left.jsx';
import Central from './central.jsx';
import Right from './right.jsx';
import { socket } from '../Config/socketClient.js';

export const Ide = () => {
  const editorRef = useRef(null);
  
  // Left div open/close state
  const [isLeftOpen, setIsLeftOpen] = useState(true);

  // Right div view state ('terminal' | 'gemini' | 'chat' | null)
  const [rightView, setRightView] = useState(null);

  // Tab and active file state (starts completely empty)
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState(null);

  // Trigger file creation from the central empty state
  const [triggerRootCreate, setTriggerRootCreate] = useState(false);

  // Execution state synchronized with backend Docker container across the room
  const [isRunning, setIsRunning] = useState(false);
 
  const currentRoomId = activeFile?._id;
  
  console.log(" activeFile :", activeFile);
  

  // Listen to Docker container lifecycle events for this room
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    // If socket is already connected and we have a room, join immediately
    if (socket.connected && currentRoomId) {
      socket.emit('room:join', { roomId: currentRoomId });
    }

    const handleConnect = () => {
      console.log(`[Socket] Connected to backend: ${socket.id}`);
      if (currentRoomId) {
        socket.emit('room:join', { roomId: currentRoomId });
      }
    };

    const handleConnectError = (err) => {
      console.error(`[Socket] Connection error:`, err.message);
    };

    const handleStatus = ({ isRunning: running }) => {
      setIsRunning(Boolean(running));
    };

    const handleError = (errMsg) => {
      setIsRunning(false);
      console.error('Terminal error:', errMsg);
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('terminal:status', handleStatus);
    socket.on('terminal:error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('terminal:status', handleStatus);
      socket.off('terminal:error', handleError);
    };
  }, [currentRoomId]);

  // Synchronized Run / Stop Button handler
  const handleRunOrStop = () => {
    if (!activeFile) return;

    // If container is already executing, clicking Stop sends terminal:stop immediately
    if (isRunning) {
      socket.emit('terminal:stop', { roomId: currentRoomId });
      setIsRunning(false);
      return;
    }

    const content = editorRef.current ? editorRef.current.getValue() : '';
    const language = activeFile.language || 'javascript';

    if (!content.trim()) {
      setRightView('terminal');
      return;
    }

    // Automatically reveal terminal so the user sees live output
    setRightView('terminal');

    const token = localStorage.getItem('accessToken');
    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    // Emit terminal:run with roomId, language, and editor code
    socket.emit('terminal:run', {
      roomId: currentRoomId,
      language,
      content
    });
  };


  // Toggle Left Div
  const toggleLeftDiv = () => {
    setIsLeftOpen(prev => !prev);
  };

  // Toggle Right Div options: clicking the active option closes it ("it go back")
  const handleToggleRightView = (viewName) => {
    if (rightView === viewName) {
      setRightView(null);
    } else {
      setRightView(viewName);
    }
  };

  // Open file in tabs & editor
  const handleOpenFile = (fileItem) => {
    if (!fileItem || fileItem.isFolder) return;

    // Check if file is already in openTabs
    const exists = openTabs.some(t => t._id === fileItem._id);
    if (!exists) {
      setOpenTabs(prev => [...prev, fileItem]);
    }
    setActiveFile(fileItem);
   
    
  };

  // Close tab
  const handleCloseTab = (fileId) => {
    const nextTabs = openTabs.filter(t => t._id !== fileId);
    setOpenTabs(nextTabs);

    // If the currently open file was closed, switch to another tab or null
    if (activeFile?._id === fileId) {
      setActiveFile(nextTabs[nextTabs.length - 1] || null);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0817] text-white overflow-hidden text-left font-sans select-none">
      {/* 1. Main Top Navbar */}
      <header className="h-11 w-full bg-[#130d29] border-b border-[#261a44] flex items-center justify-between px-3 shrink-0 z-10">
        {/* Left corner: IDE Name + Toggle Left Div Button */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={toggleLeftDiv}
            className={`p-1.5 rounded transition ${
              isLeftOpen 
                ? 'bg-[#2b1b52] text-purple-300' 
                : 'text-[#8f85a8] hover:bg-[#20153d] hover:text-white'
            }`}
            title="Toggle Explorer"
          >
            <PanelLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Code2 size={14} />
            </div>
            <span className="font-bold text-xs tracking-wide text-white">Got Collab IDE</span>
          </div>
        </div>

        {/* Right corner: Run Button + Three options (Terminal, Gemini, Chat) */}
        <div className="flex items-center gap-2">
          {/* Run / Stop Button (when a file is open) */}
          {activeFile && (
            <button
              type="button"
              onClick={handleRunOrStop}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer ${
                isRunning
                  ? 'bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
                  : 'bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white'
              }`}
              title={isRunning ? "Stop Execution (Kill Docker Sandbox)" : "Run Code in Docker Sandbox"}
            >
              {isRunning ? (
                <>
                  <Square size={12} className="fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play size={12} className="fill-current" />
                  <span>Run</span>
                </>
              )}
            </button>
          )}

          {/* Option 1: Open Terminal */}
          <button
            type="button"
            onClick={() => handleToggleRightView('terminal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              rightView === 'terminal'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-[#1a1236] text-[#9f94bf] hover:bg-[#261b4a] hover:text-white border border-[#2b1f4c]'
            }`}
            title="Toggle Terminal"
          >
            <TerminalIcon size={14} className="text-purple-400" />
            <span>Open Terminal</span>
          </button>

          {/* Option 2: Gemini */}
          <button
            type="button"
            onClick={() => handleToggleRightView('gemini')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              rightView === 'gemini'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-[#1a1236] text-[#9f94bf] hover:bg-[#261b4a] hover:text-white border border-[#2b1f4c]'
            }`}
            title="Toggle Gemini AI"
          >
            <Sparkles size={14} className="text-purple-300" />
            <span>Gemini</span>
          </button>

          {/* Option 3: Chat */}
          <button
            type="button"
            onClick={() => handleToggleRightView('chat')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              rightView === 'chat'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-[#1a1236] text-[#9f94bf] hover:bg-[#261b4a] hover:text-white border border-[#2b1f4c]'
            }`}
            title="Toggle Team Chat"
          >
            <MessageSquare size={14} className="text-indigo-400" />
            <span>Chat</span>
          </button>
        </div>
      </header>

      {/* 2. Adjustable Main Body: Left Div, Central Div, Right Div */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        <Group 
          orientation="horizontal" 
          id="ide-main-group"
          style={{ height: '100%', width: '100%' }}
        >
          {/* Left Div (Adjustable between 10% and 40%, default 20%) */}
          {isLeftOpen && (
            <Panel 
              defaultSize="20%" 
              minSize="10%" 
              maxSize="40%" 
              id="ide-left-panel"
              className="h-full overflow-hidden"
            >
              <Left 
                onSelectFile={handleOpenFile} 
                activeFileId={activeFile?._id}
                triggerRootCreate={triggerRootCreate}
                setTriggerRootCreate={setTriggerRootCreate}
              />
            </Panel>
          )}

          {isLeftOpen && (
            <Separator 
              className="bg-[#24173e] hover:bg-purple-500 active:bg-purple-400 cursor-col-resize transition-colors flex items-center justify-center relative select-none shrink-0"
              style={{ width: '6px' }}
            >
              <div className="w-0.5 h-6 bg-[#4c357d] rounded-full pointer-events-none" />
            </Separator>
          )}

          {/* Central Div (Code Editor & Tab Manager or Empty State) */}
          <Panel 
            defaultSize="55%" 
            minSize="30%" 
            id="ide-central-panel"
            className="h-full overflow-hidden"
          >
            <Central 
              editorRef={editorRef}
              openTabs={openTabs}
              activeFile={activeFile}
              onSelectTab={setActiveFile}
              onCloseTab={handleCloseTab}
              onStartCreateFile={() => {
                if (!isLeftOpen) setIsLeftOpen(true);
                setTriggerRootCreate({ isFolder: false });
              }}
              onStartCreateFolder={() => {
                if (!isLeftOpen) setIsLeftOpen(true);
                setTriggerRootCreate({ isFolder: true });
              }}
              onRunCode={handleRunOrStop}
              isRunning={isRunning}
            />
          </Panel>

          {/* Right Div (Adjustable between 15% and 50%, default 25%) */}
          {rightView && (
            <Separator 
              className="bg-[#24173e] hover:bg-purple-500 active:bg-purple-400 cursor-col-resize transition-colors flex items-center justify-center relative select-none shrink-0"
              style={{ width: '6px' }}
            >
              <div className="w-0.5 h-6 bg-[#4c357d] rounded-full pointer-events-none" />
            </Separator>
          )}

          {rightView && (
            <Panel 
              defaultSize="25%" 
              minSize="15%" 
              maxSize="50%" 
              id="ide-right-panel"
              className="h-full overflow-hidden"
            >
              <Right 
                roomId={currentRoomId}
                activeView={rightView} 
                onClose={() => setRightView(null)} 
                onRunCode={handleRunOrStop}
                isRunning={isRunning}
                activeFile={activeFile}
              />
            </Panel>
          )}
        </Group>
      </div>
    </div>
  );
};

export default Ide;