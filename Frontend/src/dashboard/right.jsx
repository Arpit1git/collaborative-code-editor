import { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { socket } from '../Config/socketClient.js';
import { 
  Terminal as TerminalIcon, 
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
  activeFile = null,
  user = null
}) => {
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

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

  // 2. Real-time Team Chat Socket Listeners
  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      if (token) socket.auth = { token };
      socket.connect();
    }

    if (currentRoomId) {
      socket.emit('room:join', { roomId: currentRoomId });
      // Fetch persisted recent room chat history
      socket.emit('chat:get_history', { roomId: currentRoomId });
    }

    // ── Chat Listeners ──
    const handleChatHistory = ({ roomId: histRoomId, requestedRoomId, messages }) => {
      if ((histRoomId === currentRoomId || requestedRoomId === currentRoomId) && Array.isArray(messages)) {
        setChatMessages(messages);
      }
    };

    const handleChatMessage = (newMsg) => {
      if (!newMsg) return;
      setChatMessages((prev) => {
        const msgId = (newMsg.id || newMsg._id)?.toString();
        if (msgId && prev.some((m) => (m.id?.toString() === msgId || m._id?.toString() === msgId))) {
          return prev;
        }
        return [...prev, newMsg];
      });
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

    socket.on('chat:history', handleChatHistory);
    socket.on('chat:message', handleChatMessage);
    socket.on('chat:typing', handleChatTyping);

    return () => {
      socket.off('chat:history', handleChatHistory);
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:typing', handleChatTyping);
    };
  }, [currentRoomId, currentUserName]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeView === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, typingUsers, activeView]);

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

  // Key Down handler
  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
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

      {/* 3. Panel Body: Real-time Team Chat */}
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
