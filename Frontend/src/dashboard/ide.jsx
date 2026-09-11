import React, { useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { 
  PanelLeft, 
  Terminal as TerminalIcon, 
  Sparkles, 
  MessageSquare,
  Code2,
  Play
} from 'lucide-react';
import Left from './left.jsx';
import Central from './central.jsx';
import Right from './right.jsx';
import useCodeExecution from '../features/Execution/Hooks/useCodeExecution.js';

export const Ide = () => {
  const editorRef = useRef(null);
  
  // Left div open/close state
  const [isLeftOpen, setIsLeftOpen] = useState(true);

  // Right div view state ('terminal' | 'gemini' | 'chat' | null)
  const [rightView, setRightView] = useState(null);

  // Tab and active file state (starts completely empty, NO dummy data)
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState(null);

  // Trigger file creation from the central empty state
  const [triggerRootCreate, setTriggerRootCreate] = useState(false);

  // Code Execution State & Hook
  const { 
    Output, 
    setOutput, 
    isWaitingForInput, 
    setIsWaitingForInput, 
    handleRunFile 
  } = useCodeExecution();

  const [isRunning, setIsRunning] = useState(false);

  const inputKeywords = {
    cpp: ["cin", "scanf"],
    python: ["input(", "sys.stdin"],
    java: ["Scanner", "System.in"],
    javascript: ["readFileSync(0)", "readline"]
  };

  // Run Code logic: inspects editor code and triggers Docker execution
  const handleRunCode = async () => {
    if (!activeFile) return;

    const content = editorRef.current ? editorRef.current.getValue() : "";
    const language = activeFile.language || "javascript";

    if (!content.trim()) {
      setOutput("Please enter some code before running.");
      setRightView('terminal');
      return;
    }

    setRightView('terminal');

    const requiresInput = inputKeywords[language]?.some((key) => content.includes(key));
    if (requiresInput) {
      setIsWaitingForInput(true);
      return;
    }

    setIsWaitingForInput(false);
    setIsRunning(true);
    try {
      await handleRunFile(content, language);
    } finally {
      setIsRunning(false);
    }
  };

  // Interactive stdin input submission
  const handleSubmitCustomInput = async (inputText) => {
    if (!activeFile) return;

    const content = editorRef.current ? editorRef.current.getValue() : "";
    const language = activeFile.language || "javascript";

    setIsWaitingForInput(false);
    setIsRunning(true);
    try {
      await handleRunFile(content, language, inputText);
    } finally {
      setIsRunning(false);
    }
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
          {/* Run Button (when a file is open) */}
          {activeFile && (
            <button
              type="button"
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              title="Run Code in Docker Sandbox"
            >
              <Play size={12} className="fill-current" />
              <span>{isRunning ? 'Running...' : 'Run'}</span>
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
          key={`${isLeftOpen ? 'left-open' : 'left-closed'}-${rightView ? rightView : 'no-right'}`}
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
              onRunCode={handleRunCode}
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
                activeView={rightView} 
                onClose={() => setRightView(null)} 
                terminalOutput={Output}
                onClearTerminal={() => setOutput("")}
                isWaitingForInput={isWaitingForInput}
                onSubmitCustomInput={handleSubmitCustomInput}
                onRunCode={handleRunCode}
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
