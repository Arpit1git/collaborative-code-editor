import { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { socket } from '../Config/socketClient.js';
import { 
  Terminal as TerminalIcon, 
  Sparkles, 
  MessageSquare, 
  X, 
  Send,
  Bot,
  Loader2,
  FileCode,
  Lightbulb,
  Bug,
  Zap,
  CheckCheck
} from 'lucide-react';

/**
 * Simple markdown text & code block renderer for Gemini responses
 */
function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split by code blocks ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed break-words font-sans">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const language = part.slice(3, firstLineEnd).trim() || 'code';
          const code = part.slice(firstLineEnd + 1, -3).trim();

          return (
            <div key={index} className="my-2 rounded-xl bg-[#090614] border border-[#2c1d52] overflow-hidden text-left">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#140e2b] border-b border-[#2c1d52] text-[10px] text-[#9d92be]">
                <span className="font-mono uppercase text-purple-300 font-semibold">{language}</span>
                <span className="text-[10px] text-[#6d6288]">Gemini Generated</span>
              </div>
              <pre className="p-3 text-[11px] font-mono text-[#e2d9f3] overflow-x-auto custom-scrollbar select-text whitespace-pre">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Standard text lines
        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-1" />;
              
              // Bullet points
              if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 pl-1">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{line.trim().substring(2)}</span>
                  </div>
                );
              }

              // Bold headers / titles
              if (line.trim().startsWith('### ') || line.trim().startsWith('## ')) {
                return (
                  <div key={lIdx} className="font-bold text-white text-xs mt-2 mb-1">
                    {line.replace(/^#+\s*/, '')}
                  </div>
                );
              }

              return <p key={lIdx}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

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
  activeFile = null,
  user = null
}) => {
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  
  const chatEndRef = useRef(null);
  const geminiEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Gemini state
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [geminiMessages, setGeminiMessages] = useState([]);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  // Real-time Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const currentUserId = user?._id || user?.userId || user?.id;
  const currentUserName = user?.userName || user?.name || user?.email?.split('@')[0] || 'Teammate';
  const currentRoomId = roomId || 'default_room';

  // 1. Mount & manage xterm.js canvas for Terminal View
  useEffect(() => {
    if (activeView !== 'terminal' || !terminalContainerRef.current) return;

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

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('room:join', { roomId: currentRoomId });

    const handleData = (data) => {
      term.write(data);
    };
    socket.on('terminal:data', handleData);

    const disposable = term.onData((data) => {
      socket.emit('terminal:input', { roomId: currentRoomId, data });
    });

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
  }, [activeView, currentRoomId]);

  // 2. Real-time Team Chat & Gemini Socket Listeners
  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      if (token) socket.auth = { token };
      socket.connect();
    }

    if (currentRoomId) {
      socket.emit('room:join', { roomId: currentRoomId });
      // Fetch persisted recent room chat history & Gemini history
      socket.emit('chat:get_history', { roomId: currentRoomId });
      socket.emit('gemini:get_history', { roomId: currentRoomId });
    }

    // ── Chat Listeners ──
    const handleChatHistory = ({ roomId: histRoomId, requestedRoomId, messages }) => {
      if ((histRoomId === currentRoomId || requestedRoomId === currentRoomId) && Array.isArray(messages)) {
        setChatMessages(messages);
      }
    };

    const handleChatMessage = (newMsg) => {
      if (newMsg) {
        setChatMessages((prev) => {
          const msgId = newMsg.id || newMsg._id;
          if (msgId && prev.some((m) => (m.id === msgId || m._id === msgId))) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    };

    const handleChatTyping = ({ roomId: typingRoomId, userName, isTyping }) => {
      if (typingRoomId !== currentRoomId) return;
      if (userName === currentUserName) return;

      setTypingUsers((prev) => {
        if (isTyping) {
          if (!prev.includes(userName)) return [...prev, userName];
          return prev;
        } else {
          return prev.filter((u) => u !== userName);
        }
      });
    };

    // ── Gemini Listeners ──
    const handleGeminiHistory = ({ roomId: histRoomId, requestedRoomId, messages }) => {
      if ((histRoomId === currentRoomId || requestedRoomId === currentRoomId) && Array.isArray(messages)) {
        setGeminiMessages(messages);
      }
    };

    const handleGeminiMessage = (newMsg) => {
      if (newMsg) {
        setGeminiMessages((prev) => {
          const msgId = newMsg.id || newMsg._id;
          if (msgId && prev.some((m) => (m.id === msgId || m._id === msgId))) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    };

    const handleGeminiLoading = ({ roomId: loadRoomId, isLoading }) => {
      if (loadRoomId === currentRoomId) {
        setIsGeminiLoading(Boolean(isLoading));
      }
    };

    socket.on('chat:history', handleChatHistory);
    socket.on('chat:message', handleChatMessage);
    socket.on('chat:typing', handleChatTyping);

    socket.on('gemini:history', handleGeminiHistory);
    socket.on('gemini:message', handleGeminiMessage);
    socket.on('gemini:loading', handleGeminiLoading);

    return () => {
      socket.off('chat:history', handleChatHistory);
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:typing', handleChatTyping);

      socket.off('gemini:history', handleGeminiHistory);
      socket.off('gemini:message', handleGeminiMessage);
      socket.off('gemini:loading', handleGeminiLoading);
    };
  }, [currentRoomId, currentUserName]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeView === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, typingUsers, activeView]);

  // Auto-scroll Gemini to latest message
  useEffect(() => {
    if (activeView === 'gemini') {
      geminiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [geminiMessages, isGeminiLoading, activeView]);

  // Handle typing indicator dispatch for Chat
  const handleChatInputChange = (e) => {
    const value = e.target.value;
    setChatMessage(value);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('chat:typing', {
        roomId: currentRoomId,
        userName: currentUserName,
        isTyping: true
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('chat:typing', {
        roomId: currentRoomId,
        userName: currentUserName,
        isTyping: false
      });
    }, 2000);
  };

  // Send message to collaborative team chat
  const handleChatSubmit = (e) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    socket.emit('chat:typing', {
      roomId: currentRoomId,
      userName: currentUserName,
      isTyping: false
    });

    socket.emit('chat:send', {
      roomId: currentRoomId,
      text: chatMessage.trim(),
      sender: currentUserName,
      senderId: currentUserId,
      avatar: currentUserName.charAt(0).toUpperCase()
    });

    setChatMessage('');
  };

  // Submit prompt to Gemini AI
  const handleGeminiSubmit = (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || geminiPrompt;
    if (!promptToSend || !promptToSend.trim() || isGeminiLoading) return;

    socket.emit('gemini:ask', {
      roomId: currentRoomId,
      prompt: promptToSend.trim(),
      activeFileId: activeFile?._id,
      activeFileName: activeFile?.name,
      activeCode: activeFile?.content || '',
      language: activeFile?.language || ''
    });

    setGeminiPrompt('');
  };

  // Quick Action Prompts for Gemini
  const handleQuickPrompt = (actionType) => {
    if (!activeFile) {
      alert("Please open a file first to use quick code actions.");
      return;
    }

    let promptText = "";
    if (actionType === 'explain') {
      promptText = `Explain the logic and structure of the code in ${activeFile.name} step by step.`;
    } else if (actionType === 'bugs') {
      promptText = `Carefully review ${activeFile.name} for bugs, security vulnerabilities, edge cases, and potential errors.`;
    } else if (actionType === 'optimize') {
      promptText = `Suggest performance optimizations, cleaner syntax, and best practices for ${activeFile.name}.`;
    }

    handleGeminiSubmit(null, promptText);
  };

  // Key Down handlers
  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const handleGeminiKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGeminiSubmit();
    }
  };

  // Format timestamp helper
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!activeView) return null;

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
              <span className="text-xs font-semibold text-white">Gemini AI</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-purple-900/40 text-purple-300 rounded border border-purple-700/40 ml-1 font-medium">
                3.6 Flash
              </span>
            </>
          )}
          {activeView === 'chat' && (
            <>
              <MessageSquare size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold text-white">Team Chat</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-900/40 text-indigo-300 rounded border border-indigo-700/40 ml-1">
                Live
              </span>
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
          <div 
            ref={terminalContainerRef} 
            className="flex-1 w-full h-full p-2 bg-[#0b0816] overflow-hidden" 
          />
        </div>
      )}

      {/* 3. Panel Body: Gemini AI Assistant */}
      {activeView === 'gemini' && (
        <div className="flex-1 flex flex-col bg-[#0f0a1d] overflow-hidden">
          {/* Quick Context Banner */}
          {activeFile && (
            <div className="px-3 py-1.5 bg-[#140e2b] border-b border-[#251944] flex items-center justify-between text-[11px] text-[#9d92be] shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <FileCode size={12} className="text-purple-400 shrink-0" />
                <span className="truncate">Context: <strong className="text-white">{activeFile.name}</strong> ({activeFile.language || 'code'})</span>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3.5 text-xs custom-scrollbar">
            {geminiMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#7e7498]">
                <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-purple-600/30 to-indigo-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-2.5 shadow-md">
                  <Sparkles size={22} />
                </div>
                <p className="font-semibold text-xs text-white">Gemini AI Pair Programmer</p>
                <p className="text-[11px] text-[#8e85a6] mt-1 max-w-[230px] leading-relaxed">
                  Ask questions, generate code, or debug errors across your collaborative project.
                </p>

                {/* Quick Starters */}
                {activeFile && (
                  <div className="flex flex-col gap-1.5 mt-4 w-full max-w-[220px]">
                    <button
                      type="button"
                      onClick={() => handleQuickPrompt('explain')}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#181133] hover:bg-[#231749] border border-[#2d1e56] text-purple-300 text-[11px] transition text-left cursor-pointer"
                    >
                      <Lightbulb size={12} className="text-amber-400 shrink-0" />
                      <span>Explain {activeFile.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPrompt('bugs')}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#181133] hover:bg-[#231749] border border-[#2d1e56] text-purple-300 text-[11px] transition text-left cursor-pointer"
                    >
                      <Bug size={12} className="text-rose-400 shrink-0" />
                      <span>Find bugs in {activeFile.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPrompt('optimize')}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#181133] hover:bg-[#231749] border border-[#2d1e56] text-purple-300 text-[11px] transition text-left cursor-pointer"
                    >
                      <Zap size={12} className="text-emerald-400 shrink-0" />
                      <span>Optimize performance</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              geminiMessages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isMe = (currentUserId && msg.senderId && currentUserId.toString() === msg.senderId.toString()) || (msg.sender === currentUserName);

                return (
                  <div 
                    key={msg.id || idx} 
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {/* Header Label */}
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      {isUser ? (
                        <>
                          <span className="text-[10px] text-[#71678b]">{formatTime(msg.timestamp || msg.createdAt)}</span>
                          <span className="text-[11px] font-semibold text-purple-300">
                            {isMe ? 'You' : msg.sender}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 rounded bg-purple-600/30 text-purple-300 flex items-center justify-center">
                            <Bot size={11} />
                          </div>
                          <span className="text-[11px] font-semibold text-purple-300">Gemini AI</span>
                          <span className="text-[10px] text-[#71678b]">{formatTime(msg.timestamp || msg.createdAt)}</span>
                        </>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div 
                      className={`max-w-[92%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                        isUser 
                          ? 'bg-linear-to-r from-purple-700 to-indigo-700 text-white rounded-br-xs border border-purple-600/40' 
                          : 'bg-[#181131] border border-[#2d1e56] text-[#ded9ec] rounded-bl-xs w-full select-text'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Gemini Thinking / Loading State */}
            {isGeminiLoading && (
              <div className="flex flex-col items-start animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <div className="w-4 h-4 rounded bg-purple-600/30 text-purple-300 flex items-center justify-center">
                    <Bot size={11} />
                  </div>
                  <span className="text-[11px] font-semibold text-purple-300">Gemini AI</span>
                </div>
                <div className="bg-[#181131] border border-[#2d1e56] rounded-2xl rounded-bl-xs p-3 text-xs text-[#b8aed2] flex items-center gap-2.5">
                  <Loader2 size={14} className="animate-spin text-purple-400 shrink-0" />
                  <span>Gemini is analyzing your code and generating a solution...</span>
                </div>
              </div>
            )}

            <div ref={geminiEndRef} />
          </div>

          {/* Input Box & Action Toolbar */}
          <div className="p-2.5 border-t border-[#261a44] bg-[#140e29] flex flex-col gap-2 shrink-0">
            {/* Quick Action Pills when input is empty */}
            {activeFile && !geminiPrompt && (
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('explain')}
                  disabled={isGeminiLoading}
                  className="px-2 py-0.8 rounded-md bg-[#1d143b] hover:bg-[#291b52] border border-[#30215b] text-[10px] text-purple-300 shrink-0 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Lightbulb size={10} className="text-amber-400" />
                  <span>Explain Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('bugs')}
                  disabled={isGeminiLoading}
                  className="px-2 py-0.8 rounded-md bg-[#1d143b] hover:bg-[#291b52] border border-[#30215b] text-[10px] text-purple-300 shrink-0 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Bug size={10} className="text-rose-400" />
                  <span>Find Bugs</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('optimize')}
                  disabled={isGeminiLoading}
                  className="px-2 py-0.8 rounded-md bg-[#1d143b] hover:bg-[#291b52] border border-[#30215b] text-[10px] text-purple-300 shrink-0 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Zap size={10} className="text-emerald-400" />
                  <span>Optimize</span>
                </button>
              </div>
            )}

            {/* Prompt Textarea */}
            <form onSubmit={handleGeminiSubmit} className="flex items-center gap-1.5 bg-[#0b0816] border border-[#2e214d] focus-within:border-purple-500 rounded-xl p-1.5 pl-3 transition">
              <textarea 
                rows={2}
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                onKeyDown={handleGeminiKeyDown}
                placeholder="Ask Gemini to generate, explain, or fix code..."
                className="w-full bg-transparent text-xs text-white outline-none resize-none font-sans custom-scrollbar"
              />
              <button 
                type="submit"
                disabled={!geminiPrompt.trim() || isGeminiLoading}
                className="p-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs"
                title="Send Prompt to Gemini"
              >
                {isGeminiLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Panel Body: Real-time Team Chat */}
      {activeView === 'chat' && (
        <div className="flex-1 flex flex-col bg-[#0f0a1d] overflow-hidden">
          {/* Chat Messages Roster */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs custom-scrollbar">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#7e7498]">
                <div className="w-10 h-10 rounded-2xl bg-indigo-900/30 border border-indigo-700/40 flex items-center justify-center text-indigo-400 mb-2">
                  <MessageSquare size={20} />
                </div>
                <p className="font-semibold text-xs text-white">Project Room Chat</p>
                <p className="text-[11px] text-[#8e85a6] mt-1 max-w-[200px]">
                  Send messages to collaborate live with your teammates in this room.
                </p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isMe = (currentUserId && msg.senderId && currentUserId.toString() === msg.senderId.toString()) || (msg.sender === currentUserName);
                const isSystem = msg.sender === 'System';

                if (isSystem) {
                  return (
                    <div key={msg.id || idx} className="flex justify-center my-1.5">
                      <span className="text-[10px] bg-[#1a1236] text-[#8e85a6] px-2.5 py-0.5 rounded-full border border-[#2b1f4c]">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={msg.id || idx} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <div className="w-4 h-4 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center text-[9px] font-bold">
                          {(msg.sender || "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-semibold text-purple-300">
                          {msg.sender}
                        </span>
                        <span className="text-[9px] text-[#71678b]">
                          {formatTime(msg.timestamp || msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div 
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words shadow-sm ${
                        isMe 
                          ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs' 
                          : 'bg-[#191136] border border-[#2c1e4e] text-[#ded9ec] rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {isMe && (
                      <span className="text-[9px] text-[#71678b] mt-0.5 px-1">
                        {formatTime(msg.timestamp || msg.createdAt)}
                      </span>
                    )}
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-purple-400 italic px-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...` 
                    : `${typingUsers.join(', ')} are typing...`}
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Message Input Form */}
          <form 
            onSubmit={handleChatSubmit} 
            className="p-2.5 border-t border-[#261a44] bg-[#140e29] flex flex-col gap-2 shrink-0"
          >
            <div className="flex items-center gap-1.5 bg-[#0b0816] border border-[#2e214d] focus-within:border-indigo-500 rounded-xl p-1.5 pl-3 transition">
              <textarea 
                rows={1}
                value={chatMessage}
                onChange={handleChatInputChange}
                onKeyDown={handleChatKeyDown}
                placeholder="Type a message... (Enter to send)"
                className="w-full bg-transparent text-xs text-white outline-none resize-none font-sans custom-scrollbar"
              />
              <button 
                type="submit"
                disabled={!chatMessage.trim()}
                className="p-1.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs"
                title="Send Message"
              >
                <Send size={13} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Right;
