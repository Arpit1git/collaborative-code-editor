import { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { 
  PanelLeft, 
  Terminal as TerminalIcon, 
  MessageSquare, 
  Code2,
  Play,
  Square,
  UserPlus,
  Users,
  Copy,
  Check,
  X,
  Loader2,
  LogOut,
  Trash2,
  Crown,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

import Left from './left.jsx';
import Central from './central.jsx';
import Right from './right.jsx';
import { socket } from '../Config/socketClient.js';
import { authFetch, getFileById } from '../features/Workspace/api/fileapi.js';
import { useAuth } from '../features/auth/Context/AuthContext.jsx';
import { BACKEND_API } from '../Config/apiConfig.js';

export const Ide = () => {
  const editorRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const queryFileId = searchParams.get('file');
  const queryProjectId = searchParams.get('project') || searchParams.get('roomId');
  
  // Left div open/close state
  const [isLeftOpen, setIsLeftOpen] = useState(true);

  // Right div view state ('terminal' | 'chat' | null)
  const [rightView, setRightView] = useState(null);

  // Tab and active file state (starts completely empty)
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState(null);

  // Trigger file creation from the central empty state
  const [triggerRootCreate, setTriggerRootCreate] = useState(false);

  // Execution state synchronized with backend Docker container across the room
  const [isRunning, setIsRunning] = useState(false);

  // Invite & Access Modal States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Collaborators & Presence State
  const [collaborators, setCollaborators] = useState([]);
  const [roomOwner, setRoomOwner] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
 
  const currentRoomId = activeFile?._id;
  const targetRoomId = activeFile?.rootId || queryProjectId || activeFile?._id;
  const executionRoomId = targetRoomId || currentRoomId;

  // Check if the current logged-in user is the owner of the active file/project
  const activeOwnerId = typeof activeFile?.owner === 'object' ? activeFile?.owner?._id : activeFile?.owner;
  const currentUserId = user?._id || user?.userId || user?.id;
  const isOwner = Boolean(
    activeFile && currentUserId && activeOwnerId && (
      activeOwnerId.toString() === currentUserId.toString()
    )
  );

  // Fetch Collaborators and Owner for the current room
  const fetchCollaborators = useCallback(async () => {
    if (!targetRoomId) return;
    try {
      const url = `${BACKEND_API}/collab/${targetRoomId}/collaborators`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setCollaborators((prev) => {
          const incoming = data.collaborators || [];
          // Preserve any previously left collaborators in the UI list so they show in gray
          const leftOnes = prev.filter(
            (p) => p.isLeft && !incoming.some((inc) => inc._id?.toString() === p._id?.toString())
          );
          return [...incoming, ...leftOnes];
        });
        setRoomOwner(data.owner || null);
      }
    } catch (err) {
      console.error("Failed to fetch room collaborators:", err);
    }
  }, [targetRoomId]);

  // Load collaborators whenever the active room changes
  useEffect(() => {
    if (targetRoomId) {
      fetchCollaborators();
    } else {
      setCollaborators([]);
      setRoomOwner(null);
    }
  }, [targetRoomId, fetchCollaborators]);

  // Automatically open file when joining via invite URL or navigating from Dashboard
  useEffect(() => {
    const fileToOpenId = queryFileId || queryProjectId;
    if (fileToOpenId && !activeFile) {
      getFileById(fileToOpenId)
        .then((res) => {
          if (res?.file && !res.file.isFolder) {
            handleOpenFile(res.file);
          }
        })
        .catch((err) => {
          console.error("Could not auto-open file from URL query:", err);
        });
    }
  }, [queryFileId, queryProjectId]);

  // Listen to Docker container lifecycle & Collaboration Room events
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const myId = user?._id || user?.userId || user?.id;

    const joinCurrentRooms = () => {
      if (myId) {
        socket.emit('room:join', { roomId: myId.toString() });
        socket.emit('room:join', { roomId: `user:${myId}` });
      }
      if (currentRoomId) socket.emit('room:join', { roomId: currentRoomId });
      if (targetRoomId && targetRoomId !== currentRoomId) socket.emit('room:join', { roomId: targetRoomId });
    };

    // Join rooms when connected
    if (socket.connected) {
      joinCurrentRooms();
    }

    const handleConnect = () => {
      console.log(`[Socket] Connected to backend: ${socket.id}`);
      joinCurrentRooms();
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

    // ── Collaboration Lifecycle Events ──
    const handleCollaboratorKicked = ({ roomId, targetUserId, message }) => {
      const myId = user?._id || user?.userId || user?.id;
      if (myId && targetUserId && myId.toString() === targetUserId.toString()) {
        alert("⚠️ You have been removed from this project by the owner.");
        setActiveFile(null);
        setOpenTabs([]);
        setCollaborators([]);
        setRoomOwner(null);
        setIsAccessModalOpen(false);
        setIsInviteOpen(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
      } else if (targetUserId) {
        // Mark kicked user as left/removed with gray styling on other screens
        setCollaborators((prev) =>
          prev.map((collab) => {
            const cId = collab._id?.toString() || collab.id?.toString();
            if (cId === targetUserId.toString()) {
              return { ...collab, isLeft: true, isKicked: true };
            }
            return collab;
          })
        );
      }
    };

    const handleCollaboratorLeft = ({ userId }) => {
      if (!userId) return;
      // Real-time update: change left user's div to gray without re-rendering or wiping
      setCollaborators((prev) =>
        prev.map((collab) => {
          const cId = collab._id?.toString() || collab.id?.toString();
          if (cId === userId.toString()) {
            return { ...collab, isLeft: true };
          }
          return collab;
        })
      );
    };

    const handleRoomDestroyed = ({ roomId: destroyedRoomId, ownerId }) => {
      const myId = user?._id || user?.userId || user?.id;
      const isMeOwner = (ownerId && myId && ownerId.toString() === myId.toString()) ||
                        (activeOwnerId && myId && activeOwnerId.toString() === myId.toString());

      if (!isMeOwner) {
        alert("⚠️ This collaborative session was ended by the project owner. The project is now private.");
        setActiveFile(null);
        setOpenTabs([]);
        setCollaborators([]);
        setRoomOwner(null);
        setIsAccessModalOpen(false);
        setIsInviteOpen(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
      } else {
        fetchCollaborators();
      }
    };

    const handleCollaboratorsUpdated = () => {
      fetchCollaborators();
    };

    const handleChatMessage = (msg) => {
      const myId = user?._id || user?.userId || user?.id;
      if (rightView !== 'chat' && msg && msg.senderId && myId && msg.senderId.toString() !== myId.toString()) {
        setHasUnreadChat(true);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('terminal:status', handleStatus);
    socket.on('terminal:error', handleError);
    socket.on('collaborator:kicked', handleCollaboratorKicked);
    socket.on('collaborator:left', handleCollaboratorLeft);
    socket.on('room:destroyed', handleRoomDestroyed);
    socket.on('room:collaborators-updated', handleCollaboratorsUpdated);
    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('terminal:status', handleStatus);
      socket.off('terminal:error', handleError);
      socket.off('collaborator:kicked', handleCollaboratorKicked);
      socket.off('collaborator:left', handleCollaboratorLeft);
      socket.off('room:destroyed', handleRoomDestroyed);
      socket.off('room:collaborators-updated', handleCollaboratorsUpdated);
      socket.off('chat:message', handleChatMessage);
    };
  }, [currentRoomId, user, activeOwnerId, fetchCollaborators, navigate, rightView]);

  // Synchronized Run / Stop Button handler
  const handleRunOrStop = () => {
    if (!activeFile) return;

    if (isRunning) {
      socket.emit('terminal:stop', { roomId: executionRoomId });
      setIsRunning(false);
      return;
    }

    const content = editorRef.current ? editorRef.current.getValue() : '';
    const language = activeFile.language || 'javascript';

    if (!content.trim()) {
      setRightView('terminal');
      return;
    }

    setRightView('terminal');

    const token = localStorage.getItem('accessToken');
    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('terminal:run', {
      roomId: executionRoomId,
      language,
      content
    });
  };

  // Open Invite Modal & Generate Expiring Redis Link
  const handleOpenInviteModal = async () => {
    if (!activeFile) return;
    setIsInviteOpen(true);
    setIsCopied(false);
    setIsGeneratingInvite(true);

    try {
      const url = `${BACKEND_API}/collab/invite`;
      const res = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          roomId: targetRoomId,
          childId: activeFile._id
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.inviteToken) {
          setInviteUrl(`${window.location.origin}/join/${data.inviteToken}`);
        } else if (data.inviteUrl) {
          try {
            const parsed = new URL(data.inviteUrl);
            setInviteUrl(`${window.location.origin}${parsed.pathname}`);
          } catch {
            setInviteUrl(data.inviteUrl);
          }
        }
      } else {
        setInviteUrl(`${window.location.origin}/ide?roomId=${targetRoomId}&file=${activeFile._id}`);
      }
    } catch (err) {
      console.error("Failed to generate invite link:", err);
      setInviteUrl(`${window.location.origin}/ide?roomId=${targetRoomId}&file=${activeFile._id}`);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  // Copy link to clipboard with tick mark feedback
  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Owner Kicks / Removes a Collaborator
  const handleKickCollaborator = async (targetUserId) => {
    if (!targetRoomId || !targetUserId) return;
    setActionLoadingId(targetUserId);
    try {
      const url = `${BACKEND_API}/collab/${targetRoomId}/collaborators/${targetUserId}`;
      const res = await authFetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCollaborators(prev => prev.filter(c => c._id !== targetUserId));
      } else {
        alert(data.message || "Failed to remove collaborator.");
      }
    } catch (err) {
      alert("Error removing collaborator.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Collaborator Leaves Room Voluntarily
  const handleLeaveRoom = async () => {
    if (!targetRoomId) return;
    if (!window.confirm("Are you sure you want to leave this shared project?")) return;

    setActionLoadingId('leave');
    try {
      const url = `${BACKEND_API}/collab/${targetRoomId}/leave`;
      const res = await authFetch(url, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsAccessModalOpen(false);
        setActiveFile(null);
        setOpenTabs([]);
        if (logout) {
          await logout();
        }
        navigate('/login', { replace: true });
      } else {
        alert(data.message || "Failed to leave project.");
      }
    } catch (err) {
      alert("Error leaving project.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Owner Ends Collaboration / Destroys Room
  const handleDestroyRoom = async () => {
    if (!targetRoomId) return;
    if (!window.confirm("Are you sure you want to end this collaboration? All collaborators will be removed and invite links will be revoked.")) return;

    setActionLoadingId('destroy');
    try {
      const url = `${BACKEND_API}/collab/${targetRoomId}/destroy`;
      const res = await authFetch(url, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCollaborators([]);
        setIsAccessModalOpen(false);
        alert("Collaborative session ended. Your project is now private.");
      } else {
        alert(data.message || "Failed to end collaboration.");
      }
    } catch (err) {
      alert("Error ending collaboration.");
    } finally {
      setActionLoadingId(null);
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
      if (viewName === 'chat') {
        setHasUnreadChat(false);
      }
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
    <div className="h-screen w-screen flex flex-col bg-[#0b0817] text-white overflow-hidden text-left font-sans select-none relative">
      {/* 1. Main Top Navbar */}
      <header className="h-11 w-full bg-[#130d29] border-b border-[#261a44] flex items-center justify-between px-3 shrink-0 z-10">
        {/* Left corner: IDE Name + Toggle Left Div Button + Back to Dashboard */}
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#9e94bf] hover:text-white bg-[#191136] hover:bg-[#25184c] border border-[#2b1f4c] transition active:scale-95 cursor-pointer shadow-xs"
            title="Back to Workspaces Dashboard"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <button 
            type="button"
            onClick={toggleLeftDiv}
            className={`p-1.5 rounded transition cursor-pointer ${
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

        {/* Right corner: Invite + Collaborators + Leave + Run Button + Two options (Terminal, Chat) */}
        <div className="flex items-center gap-2">
          {/* 1. Invite Button (Only visible to the project owner User A) */}
          {isOwner && (
            <button
              type="button"
              onClick={handleOpenInviteModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Invite Collaborators (Owner Only)"
            >
              <UserPlus size={13} />
              <span>Invite</span>
            </button>
          )}

          {/* 2. Room Collaborators Presence Button */}
          {activeFile && (
            <button
              type="button"
              onClick={() => setIsAccessModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#1a1236] text-[#b8aee0] hover:bg-[#261b4a] hover:text-white border border-[#2b1f4c] shadow-xs transition active:scale-95 cursor-pointer"
              title="View Room Collaborators & Access"
            >
              <Users size={13} className="text-purple-400" />
              <span>{collaborators.filter((c) => !c.isLeft).length + (roomOwner ? 1 : 0)} Active</span>
            </button>
          )}

          {/* 3. Leave Project Button (For Collaborators User B) */}
          {!isOwner && activeFile && (
            <button
              type="button"
              onClick={handleLeaveRoom}
              disabled={actionLoadingId === 'leave'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60 hover:text-rose-100 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Leave Shared Project"
            >
              {actionLoadingId === 'leave' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <LogOut size={12} />
              )}
              <span>Leave</span>
            </button>
          )}

          {/* 4. Run / Stop Button (when a file is open) */}
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
              rightView === 'terminal'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-[#1a1236] text-[#9f94bf] hover:bg-[#261b4a] hover:text-white border border-[#2b1f4c]'
            }`}
            title="Toggle Terminal"
          >
            <TerminalIcon size={14} className="text-purple-400" />
            <span>Open Terminal</span>
          </button>

          {/* Option 2: Chat */}
          <button
            type="button"
            onClick={() => handleToggleRightView('chat')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer relative ${
              rightView === 'chat'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-[#1a1236] text-[#9f94bf] hover:bg-[#261b4a] hover:text-white border border-[#2b1f4c]'
            }`}
            title="Toggle Team Chat"
          >
            <MessageSquare size={14} className="text-indigo-400" />
            <span>Chat</span>
            {hasUnreadChat && rightView !== 'chat' && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-[#130d29] animate-pulse absolute -top-0.5 -right-0.5" />
            )}
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
                roomId={executionRoomId}
                activeView={rightView} 
                onClose={() => setRightView(null)} 
                onRunCode={handleRunOrStop}
                isRunning={isRunning}
                activeFile={activeFile}
                user={user}
              />
            </Panel>
          )}
        </Group>
      </div>

      {/* 3. Centered Invite Modal with Backdrop Blur */}
      {isInviteOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 transition-all select-none"
          onClick={() => setIsInviteOpen(false)}
        >
          <div 
            className="bg-[#130d29] border border-[#2e1f54] rounded-2xl p-6 shadow-2xl w-full max-w-md flex flex-col gap-4 text-white relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Invite Collaborators</h3>
                  <p className="text-xs text-[#8e85a6] mt-0.5">
                    Share this link to code and run together in real-time.
                  </p>
                </div>
              </div>

              {/* Close Cross Mark Button at top-right */}
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="p-1.5 rounded-lg text-[#8f85a8] hover:text-white hover:bg-[#231542] transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Invite Link Input & Copy Button */}
            <div className="flex items-center gap-2 bg-[#0b0817] border border-[#261845] rounded-xl p-1.5 pl-3 mt-1">
              <input 
                type="text" 
                readOnly 
                value={isGeneratingInvite ? "Generating secure invite link..." : inviteUrl} 
                className="text-xs text-[#cfc8de] bg-transparent outline-none flex-1 truncate font-mono select-all"
              />

              <button
                type="button"
                onClick={handleCopyLink}
                disabled={isGeneratingInvite || !inviteUrl}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer shrink-0 disabled:opacity-50 ${
                  isCopied
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                }`}
              >
                {isGeneratingInvite ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : isCopied ? (
                  <>
                    <Check size={13} className="stroke-[3]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Modal Footer Info */}
            <div className="flex items-center justify-between text-[11px] text-[#7d7398] border-t border-[#22163f] pt-3 mt-1">
              <span>⏳ Expires in 24 hours</span>
              <span>🔒 Room-level collaborative access</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Room Collaborators & Access Management Modal */}
      {isAccessModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 transition-all select-none"
          onClick={() => setIsAccessModalOpen(false)}
        >
          <div 
            className="bg-[#130d29] border border-[#2e1f54] rounded-2xl p-6 shadow-2xl w-full max-w-lg flex flex-col gap-4 text-white relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Room Collaborators & Access</h3>
                  <p className="text-xs text-[#8e85a6] mt-0.5">
                    {isOwner 
                      ? "Manage active collaborators and room permissions." 
                      : "View project owner and collaborating peers."}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAccessModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8f85a8] hover:text-white hover:bg-[#231542] transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Project Owner Section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-[#8e85a6] uppercase tracking-wider">
                Project Owner
              </span>
              <div className="flex items-center justify-between bg-[#191136] border border-[#2c1e4e] rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                    {(roomOwner?.userName || user?.userName || "O").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        {roomOwner?.userName || user?.userName || "Project Owner"}
                      </span>
                      {roomOwner?._id === currentUserId && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-purple-600/40 text-purple-300 rounded font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#8e85a6]">
                      {roomOwner?.email || user?.email || ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.8 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold">
                  <Crown size={12} className="text-amber-400" />
                  <span>Owner</span>
                </div>
              </div>
            </div>

            {/* Collaborators List Section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8e85a6] uppercase tracking-wider">
                  Active Collaborators ({collaborators.length})
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccessModalOpen(false);
                      handleOpenInviteModal();
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus size={11} />
                    <span>+ Invite More</span>
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {collaborators.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#7d7398] bg-[#0f0a21] border border-[#231742] rounded-xl">
                    <Users size={24} className="mx-auto mb-1.5 opacity-40 text-purple-400" />
                    <p>No active collaborators in this room yet.</p>
                    {isOwner && (
                      <p className="text-[11px] text-[#6b6284] mt-1">
                        Use the "Invite" button to share access with your team.
                      </p>
                    )}
                  </div>
                ) : (
                  collaborators.map((collab) => {
                    const isCollabMe = collab._id === currentUserId || collab.id === currentUserId;
                    const isActionLoading = actionLoadingId === collab._id;
                    const isCollabLeft = Boolean(collab.isLeft);

                    return (
                      <div 
                        key={collab._id || collab.id}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-all duration-300 ${
                          isCollabLeft
                            ? 'bg-[#120e20] border border-[#261f36] opacity-60'
                            : 'bg-[#191136] border border-[#2c1e4e] hover:border-[#3d2c6b]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                            isCollabLeft
                              ? 'bg-gray-800 border border-gray-700 text-gray-400'
                              : 'bg-purple-600/30 border border-purple-500/40 text-purple-300'
                          }`}>
                            {(collab.userName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold ${isCollabLeft ? 'text-gray-400' : 'text-white'}`}>
                                {collab.userName || "Collaborator"}
                              </span>
                              {isCollabMe && !isCollabLeft && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-purple-600/40 text-purple-300 rounded font-medium">
                                  You
                                </span>
                              )}
                              {isCollabLeft && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-gray-800/80 text-gray-400 border border-gray-700 rounded font-medium">
                                  {collab.isKicked ? "Removed" : "Left Room"}
                                </span>
                              )}
                            </div>
                            <span className={`text-[11px] ${isCollabLeft ? 'text-gray-500' : 'text-[#8e85a6]'}`}>
                              {collab.email || ""}
                            </span>
                          </div>
                        </div>

                        {/* Owner action: Remove / Kick collaborator (only active members) */}
                        {isOwner && !isCollabMe && !isCollabLeft && (
                          <button
                            type="button"
                            onClick={() => handleKickCollaborator(collab._id)}
                            disabled={isActionLoading}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-400 bg-red-950/40 border border-red-800/50 hover:bg-red-900/60 hover:text-red-200 transition active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Remove collaborator from project"
                          >
                            {isActionLoading ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Bottom Danger Zone Actions */}
            <div className="border-t border-[#22163f] pt-3 mt-1 flex items-center justify-between">
              {isOwner ? (
                <button
                  type="button"
                  onClick={handleDestroyRoom}
                  disabled={actionLoadingId === 'destroy'}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 hover:text-white transition active:scale-98 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {actionLoadingId === 'destroy' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ShieldAlert size={14} />
                  )}
                  <span>End Collaboration Session & Make Private</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  disabled={actionLoadingId === 'leave'}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 hover:text-white transition active:scale-98 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {actionLoadingId === 'leave' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <LogOut size={14} />
                  )}
                  <span>Leave this Collaborative Project</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ide;