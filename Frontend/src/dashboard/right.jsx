import  { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { socket } from '../Config/socketClient.js';
import { 
  Terminal as TerminalIcon, 
  Sparkles, 
  MessageSquare, 
  X, 
  Send
} from 'lucide-react';

export const Right = ({ 
  roomId = 'default_room',
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
  
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

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

  // Mount & manage xterm.js canvas
  useEffect(() => {
    if (activeView !== 'terminal' || !terminalContainerRef.current) return;

    // 1. Initialize xterm instance with sleek dark theme
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0b0816',
        foreground: '#e2e8f0',
        cursor: '#a855f7',
        selectionBackground: 'rgba(168, 85, 247, 0.3)',
        black: '#1e1a2e',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f8fafc'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainerRef.current);

    const fitTimer = setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {}
    }, 50);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // 2. Connect socket if disconnected & join room
    if (!socket.connected) {
      socket.connect();
    }

    const currentRoomId = roomId || 'default_room';
    socket.emit('room:join', { roomId: currentRoomId });

    // 3. Receive data stream from Docker container
    const handleData = (data) => {
      term.write(data);
    };
    socket.on('terminal:data', handleData);

    // 4. Send user keystrokes to container
    const disposable = term.onData((data) => {
      socket.emit('terminal:input', { roomId: currentRoomId, data });
    });

    // 5. Observe terminal resize and sync dimensions to Docker
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (term.cols && term.rows) {
          socket.emit('terminal:resize', {
            roomId: currentRoomId,
            cols: term.cols,
            rows: term.rows
          });
        }
      } catch (e) {}
    });

    resizeObserver.observe(terminalContainerRef.current);

    // Initial welcome banner
    term.writeln('\x1b[35m[Got Collab Terminal]\x1b[0m Ready. Click Run to execute code.');

    return () => {
      clearTimeout(fitTimer);
      resizeObserver.disconnect();
      disposable.dispose();
      socket.off('terminal:data', handleData);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [activeView, roomId]);

  if (!activeView) return null;

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
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[#2e2050]">
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                <span className="text-[10px] text-[#8e85a6]">
                  {isRunning ? "Running..." : "Sandbox"}
                </span>
              </div>
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
          className="p-1 hover:text-white hover:bg-[#271b48] rounded text-[#8f85a6] transition cursor-pointer"
          title="Close Panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* 2. Panel Body: Terminal */}
      {activeView === 'terminal' && (
        <div className="flex-1 flex flex-col bg-[#0b0816] overflow-hidden">
          {/* xterm.js Terminal Canvas */}
          <div 
            ref={terminalContainerRef} 
            className="flex-1 w-full h-full p-2 bg-[#0b0816] overflow-hidden" 
          />
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
