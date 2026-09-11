import React, { useState } from 'react';
import { 
  Terminal as TerminalIcon, 
  Sparkles, 
  MessageSquare, 
  X, 
  Send,
  Play,
  Trash2,
  AlertCircle,
  CornerDownLeft
} from 'lucide-react';

export const Right = ({ 
  activeView, 
  onClose,
  terminalOutput = "",
  onClearTerminal,
  isWaitingForInput = false,
  onSubmitCustomInput,
  onRunCode,
  isRunning = false,
  activeFile = null
}) => {
  // Terminal state
  const [terminalInput, setTerminalInput] = useState('');
  const [customInputText, setCustomInputText] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([]);

  // Gemini state
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [geminiMessages, setGeminiMessages] = useState([
    { role: 'assistant', content: 'Hello! I am Gemini. Ask me anything about your code, debugging, or optimization.' }
  ]);

  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'System', text: 'Welcome to the collaborative room chat!' }
  ]);

  if (!activeView) return null;

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    setTerminalHistory(prev => [...prev, `$ ${terminalInput}`, "Command received."]);
    setTerminalInput('');
  };

  const handleCustomInputSubmit = (e) => {
    e?.preventDefault?.();
    if (onSubmitCustomInput) {
      onSubmitCustomInput(customInputText);
      setCustomInputText('');
    }
  };

  const handleGeminiSubmit = (e) => {
    e.preventDefault();
    if (!geminiPrompt.trim()) return;
    const userPrompt = geminiPrompt;
    setGeminiMessages(prev => [
      ...prev,
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: `Analyzing: "${userPrompt}"... Code structure looks clean!` }
    ]);
    setGeminiPrompt('');
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { sender: 'You', text: chatMessage }
    ]);
    setChatMessage('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#120d24] text-[#cfc8de] border-l border-[#261a44] text-left select-none overflow-hidden">
      {/* 1. Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#261a44] bg-[#160f2d] h-9 shrink-0">
        <div className="flex items-center gap-2">
          {activeView === 'terminal' && (
            <>
              <TerminalIcon size={14} className="text-purple-400" />
              <span className="text-xs font-semibold text-white">Terminal</span>
            </>
          )}
          {activeView === 'gemini' && (
            <>
              <Sparkles size={14} className="text-purple-300" />
              <span className="text-xs font-semibold text-white">Gemini</span>
            </>
          )}
          {activeView === 'chat' && (
            <>
              <MessageSquare size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold text-white">Team Chat</span>
            </>
          )}
        </div>

        <button 
          onClick={onClose}
          className="p-1 hover:text-white hover:bg-[#271b48] rounded text-[#8f85a6] transition"
          title="Close Panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* 2. Panel Body: Terminal */}
      {activeView === 'terminal' && (
        <div className="flex-1 flex flex-col bg-[#0b0816] p-3 font-mono text-xs overflow-hidden">
          {/* Top Actions: Run & Clear */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#21163f] text-[11px] text-[#8e85a6]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-sans text-[#a79bc4]">Docker Sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              {activeFile && (
                <button
                  type="button"
                  onClick={onRunCode}
                  disabled={isRunning}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-sans transition px-1.5 py-0.5 rounded hover:bg-[#1f1638]"
                  title="Run Code"
                >
                  <Play size={11} className="fill-current" />
                  <span>{isRunning ? "Running..." : "Run"}</span>
                </button>
              )}
              {onClearTerminal && (
                <button
                  type="button"
                  onClick={onClearTerminal}
                  className="flex items-center gap-1 text-[#8f85a8] hover:text-white font-sans transition px-1.5 py-0.5 rounded hover:bg-[#1f1638]"
                  title="Clear Terminal Output"
                >
                  <Trash2 size={11} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Terminal Output Area */}
          <div className="flex-1 overflow-y-auto space-y-2 select-text font-mono text-xs">
            {!terminalOutput && terminalHistory.length === 0 && (
              <div className="text-[#645a80] space-y-1 select-none font-mono">
                <div>Got Collab Sandbox Terminal Initialized.</div>
                <div>Connected to secure Docker container runtime.</div>
                <div className="text-purple-400/80">Click "Run" to execute your active file.</div>
              </div>
            )}

            {terminalHistory.map((line, idx) => (
              <div key={`hist-${idx}`} className="leading-relaxed text-[#9f94bf]">{line}</div>
            ))}

            {terminalOutput && (
              <pre className="text-green-400 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {terminalOutput}
              </pre>
            )}

            {/* Interactive Stdin Waiting Form */}
            {isWaitingForInput && (
              <div className="mt-3 p-3 rounded-lg bg-[#191036] border border-amber-500/40 font-sans shadow-lg">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs mb-1.5">
                  <AlertCircle size={14} />
                  <span>Interactive Input (stdin) Required</span>
                </div>
                <p className="text-[11px] text-[#b8aed2] mb-2 font-mono">
                  Your code expects standard input. Type inputs below (separated by spaces or newlines):
                </p>
                <form onSubmit={handleCustomInputSubmit} className="flex flex-col gap-2">
                  <textarea
                    rows={3}
                    value={customInputText}
                    onChange={(e) => setCustomInputText(e.target.value)}
                    placeholder="Enter input values here..."
                    className="w-full bg-[#0d091a] border border-[#3b2a64] rounded p-2 text-xs font-mono text-green-300 outline-none focus:border-amber-400 resize-none"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs transition shadow-sm cursor-pointer"
                    >
                      <CornerDownLeft size={13} />
                      <span>Submit Input</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Bottom command prompt line */}
          {!isWaitingForInput && (
            <form onSubmit={handleTerminalSubmit} className="mt-2 flex items-center gap-2 border-t border-[#261a44] pt-2">
              <span className="text-purple-400 font-bold">$</span>
              <input 
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder={activeFile ? `Active: ${activeFile.name}` : "Type command..."}
                className="flex-1 bg-transparent text-green-400 outline-none text-xs font-mono"
              />
            </form>
          )}
        </div>
      )}

      {/* 3. Panel Body: Gemini AI */}
      {activeView === 'gemini' && (
        <div className="flex-1 flex flex-col bg-[#0f0a1d] overflow-hidden">
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {geminiMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`p-2.5 rounded-lg leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-purple-800/60 text-white ml-6' 
                    : 'bg-[#18112d] border border-[#2b1f48] text-[#ded9ec] mr-6'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {/* Gemini Textarea and Button at bottom */}
          <form onSubmit={handleGeminiSubmit} className="p-3 border-t border-[#261a44] bg-[#140e29] flex flex-col gap-2 shrink-0">
            <textarea 
              rows={3}
              value={geminiPrompt}
              onChange={(e) => setGeminiPrompt(e.target.value)}
              placeholder="Ask Gemini to explain, generate or fix code..."
              className="w-full bg-[#0b0816] border border-[#2e214d] rounded p-2 text-xs text-white outline-none focus:border-purple-500 resize-none font-sans"
            />
            <button 
              type="submit"
              className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium transition flex items-center justify-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>Ask Gemini</span>
            </button>
          </form>
        </div>
      )}

      {/* 4. Panel Body: Chat */}
      {activeView === 'chat' && (
        <div className="flex-1 flex flex-col bg-[#0f0a1d] overflow-hidden">
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="bg-[#18112d] p-2 rounded border border-[#261a44]">
                <span className="text-purple-400 font-bold block mb-0.5 text-[11px]">{msg.sender}</span>
                <span className="text-[#ded9ec]">{msg.text}</span>
              </div>
            ))}
          </div>

          {/* Chat Textarea and Send Button at bottom */}
          <form onSubmit={handleChatSubmit} className="p-3 border-t border-[#261a44] bg-[#140e29] flex flex-col gap-2 shrink-0">
            <textarea 
              rows={2}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-[#0b0816] border border-[#2e214d] rounded p-2 text-xs text-white outline-none focus:border-indigo-500 resize-none font-sans"
            />
            <button 
              type="submit"
              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition flex items-center justify-center gap-1.5 self-end"
            >
              <Send size={13} />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Right;
