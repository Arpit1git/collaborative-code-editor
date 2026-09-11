import React from 'react';
import MonacoEditorWrappe from '../features/Editor/Components/MonacoEditorWrappe.jsx';
import { FileCode, X, Code2, FilePlus, FolderPlus, Folder, Play } from 'lucide-react';

export const Central = ({ 
  editorRef, 
  openTabs = [],
  activeFile = null,
  onSelectTab,
  onCloseTab,
  onStartCreateFile,
  onStartCreateFolder,
  onRunCode,
  isRunning = false
}) => {
  // ── EMPTY STATE: NO FILE OPEN ──
  if (!activeFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0d0918] text-center p-6 select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-900/40 to-indigo-900/40 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-lg">
          <Code2 size={32} />
        </div>

        <h2 className="text-lg font-bold text-white mb-1.5 tracking-wide">
          No File Open
        </h2>
        
        <p className="text-xs text-[#8e85a6] max-w-sm mb-6 leading-relaxed">
          Select a file from the explorer on the left or create a new file or folder to organize and start writing code.
        </p>

        {/* Both File and Folder Initial Creation Actions */}
        <div className="flex items-center gap-3">
          {onStartCreateFile && (
            <button
              type="button"
              onClick={onStartCreateFile}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition transform active:scale-95"
            >
              <FilePlus size={15} />
              <span>Create New File</span>
            </button>
          )}

          {onStartCreateFolder && (
            <button
              type="button"
              onClick={onStartCreateFolder}
              className="flex items-center gap-2 px-4 py-2 bg-[#1c1438] hover:bg-[#271b4a] text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold shadow-sm transition transform active:scale-95"
            >
              <FolderPlus size={15} />
              <span>Create New Folder</span>
            </button>
          )}
        </div>

        <div className="mt-10 border-t border-[#22173d] pt-4 flex items-center gap-6 text-[11px] text-[#6d6387]">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-[#1b1233] border border-[#2b1f48] rounded text-[#a69cc4] font-mono text-[10px]">Explorer</kbd>
            <span>Click "+" at top for root items</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-[#1b1233] border border-[#2b1f48] rounded text-[#a69cc4] font-mono text-[10px]">Folder</kbd>
            <span>Hover folder row for nested items</span>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE EDITOR VIEW (WITH TABS) ──
  return (
    <div className="flex flex-col h-full w-full bg-[#0f0a1c] overflow-hidden text-left">
      {/* 1. Editor Tab Bar */}
      <div className="flex items-center justify-between border-b border-[#261a44] bg-[#140e29] h-9 shrink-0 overflow-x-auto no-scrollbar">
        {/* Open Tabs */}
        <div className="flex items-center h-full">
          {openTabs.map((tab) => {
            const isActive = tab._id === activeFile._id;
            return (
              <div
                key={tab._id}
                onClick={() => onSelectTab(tab)}
                className={`group flex items-center gap-2 px-3.5 h-full cursor-pointer border-r border-[#261a44] transition text-xs relative select-none ${
                  isActive
                    ? 'bg-[#25153f] text-white font-medium shadow-inner'
                    : 'bg-[#120d24] text-[#8e85a6] hover:bg-[#1a1236] hover:text-[#d3cde0]'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
                )}
                <FileCode size={13} className={isActive ? 'text-yellow-400' : 'text-[#8e85a6]'} />
                <span className="truncate max-w-[130px]">{tab.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab._id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-[#3c1d68] p-0.5 rounded text-gray-300 hover:text-white transition ml-1"
                  title="Close Tab"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Actions & Language Badge on right */}
        <div className="flex items-center gap-2 px-3 shrink-0">
          {onRunCode && (
            <button
              type="button"
              onClick={onRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50"
              title="Run Code (Docker Sandbox)"
            >
              <Play size={11} className="fill-current" />
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>
          )}

          <span className="text-[10px] uppercase font-mono tracking-wider text-[#9d92b8] bg-[#22163f] px-2 py-0.5 rounded border border-[#2d1e52]">
            {activeFile.language || 'javascript'}
          </span>
        </div>
      </div>

      {/* 2. Embedded Monaco Editor from Editor folder */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <MonacoEditorWrappe 
          key={activeFile._id}
          language={activeFile.language || 'javascript'}
          editorRef={editorRef}
          roomId={activeFile._id}
        />
      </div>
    </div>
  );
};

export default Central;