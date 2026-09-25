import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FilePlus, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown,
  Loader2
} from 'lucide-react';
import { getRootFilesAndFolders, getFilesInsideFolder, createFileOrFolder } from '../features/Workspace/api/fileapi.js';
import { useAuth } from '../features/auth/Context/AuthContext.jsx';

// Helper to extract extension and map to Monaco language
export const parseFileInfo = (fullName) => {
  const trimmed = fullName.trim();
  const lastDot = trimmed.lastIndexOf('.');
  const ext = lastDot !== -1 ? trimmed.substring(lastDot + 1).toLowerCase() : '';

  const langMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    java: 'java',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown'
  };

  return {
    name: trimmed,
    language: langMap[ext] || 'plaintext'
  };
};

// ── FOLDER ITEM (WITH HOVER BUTTONS & INLINE CREATION) ──
export const FolderItem = ({ 
  item, 
  depth = 0, 
  childrenMap, 
  expandedFolders, 
  loadingFolders,
  onToggleFolder, 
  onCreateItem,
  onSelectFile,
  activeFileId
}) => {
  const [creationState, setCreationState] = useState(null);
  const [nameInput, setNameInput] = useState('');

  const isOpen = !!expandedFolders[item._id];
  const isLoading = !!loadingFolders[item._id];
  const children = childrenMap[item._id] || [];

  const handleStartCreate = (e, isFolder) => {
    e.stopPropagation();
    if (!isOpen) {
      onToggleFolder(item._id);
    }
    setCreationState({
      parentId: item._id,
      isFolder
    });
    setNameInput('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nameInput.trim() || !creationState) return;

    onCreateItem({
      name: nameInput.trim(),
      parentId: creationState.parentId,
      isFolder: creationState.isFolder
    });

    setCreationState(null);
    setNameInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setCreationState(null);
      setNameInput('');
    }
  };

  return (
    <div className="flex flex-col select-none">
      {/* Folder Row */}
      <div
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => onToggleFolder(item._id)}
        className="group flex items-center justify-between py-1 pr-2 hover:bg-[#1f173b] cursor-pointer rounded-sm text-xs text-[#cfc8de] transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isLoading ? (
            <Loader2 size={13} className="animate-spin text-purple-400 shrink-0" />
          ) : isOpen ? (
            <ChevronDown size={13} className="shrink-0" />
          ) : (
            <ChevronRight size={13} className="shrink-0" />
          )}

          {isOpen ? (
            <FolderOpen size={14} className="text-purple-400 shrink-0" />
          ) : (
            <Folder size={14} className="text-purple-400 shrink-0" />
          )}

          <span className="truncate font-medium">{item.name}</span>
        </div>

        {/* Hover Mini Buttons */}
        <div className="hidden group-hover:flex items-center gap-1 text-[#8f85a8]">
          <button
            type="button"
            onClick={(e) => handleStartCreate(e, false)}
            className="p-0.5 hover:text-white hover:bg-[#341b58] rounded transition"
            title="New File Inside"
          >
            <FilePlus size={13} />
          </button>
          
          <button
            type="button"
            onClick={(e) => handleStartCreate(e, true)}
            className="p-0.5 hover:text-white hover:bg-[#341b58] rounded transition"
            title="New Subfolder"
          >
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      {/* Inline Input inside this folder */}
      {creationState && (
        <div 
          style={{ paddingLeft: `${(depth + 1) * 14 + 18}px` }}
          className="py-1 pr-2"
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
            {creationState.isFolder ? (
              <Folder size={13} className="text-purple-400 shrink-0" />
            ) : (
              <FileCode size={13} className="text-yellow-400 shrink-0" />
            )}
            <input
              type="text"
              autoFocus
              placeholder={creationState.isFolder ? "folder name..." : "file.js..."}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setCreationState(null)}
              className="w-full bg-[#0a0714] border border-purple-500 rounded px-1.5 py-0.5 text-xs text-white outline-none font-mono"
            />
          </form>
        </div>
      )}

      {/* Children */}
      {isOpen && (
        <div>
          {children.length === 0 && !isLoading ? (
            <div 
              style={{ paddingLeft: `${(depth + 1) * 14 + 20}px` }}
              className="py-0.5 text-[11px] text-[#6d6387] italic"
            >
              (empty folder)
            </div>
          ) : (
            children.map((child) => (
              child.isFolder ? (
                <FolderItem
                  key={child._id}
                  item={child}
                  depth={depth + 1}
                  childrenMap={childrenMap}
                  expandedFolders={expandedFolders}
                  loadingFolders={loadingFolders}
                  onToggleFolder={onToggleFolder}
                  onCreateItem={onCreateItem}
                  onSelectFile={onSelectFile}
                  activeFileId={activeFileId}
                />
              ) : (
                <FileItem 
                  key={child._id} 
                  item={child} 
                  depth={depth + 1}
                  onSelectFile={onSelectFile}
                  isActive={activeFileId === child._id}
                />
              )
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── FILE ITEM HELPER ──
export const FileItem = ({ item, depth = 0, onSelectFile, isActive = false }) => (
  <div
    style={{ paddingLeft: `${depth * 14 + 22}px` }}
    onClick={() => onSelectFile && onSelectFile(item)}
    className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded-sm text-xs transition select-none ${
      isActive 
        ? 'bg-[#3b1c66] text-white font-medium shadow-xs' 
        : 'hover:bg-[#261b48] text-[#9f95ba] hover:text-white'
    }`}
  >
    <FileCode size={13} className="text-yellow-400 shrink-0" />
    <span className="truncate">{item.name}</span>

  </div>
);

// ── MAIN LEFT COMPONENT (REAL BACKEND INTEGRATION) ──
export const Left = ({ onSelectFile, activeFileId, triggerRootCreate, setTriggerRootCreate }) => {
  const { accessToken } = useAuth();

  // Root files & folders state (starts empty, populated from backend)
  const [rootItems, setRootItems] = useState([]);
  const [childrenMap, setChildrenMap] = useState({}); // { [folderId]: childItems }
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loadingFolders, setLoadingFolders] = useState({});
  const [isLoadingRoot, setIsLoadingRoot] = useState(true);

  // Root creation state
  const [rootCreationState, setRootCreationState] = useState(null);
  const [rootInputName, setRootInputName] = useState('');

  // 1. Initial Load & Room-change Load: Fetch Root Files & Folders from backend
  const [searchParams] = useSearchParams();
  const queryRoomId = searchParams.get('roomId');

  useEffect(() => {
    const fetchRoots = async () => {
      try {
        setIsLoadingRoot(true);
        const data = await getRootFilesAndFolders(accessToken);
        setRootItems(data);
      } catch (err) {
        console.error("Error fetching root items:", err);
      } finally {
        setIsLoadingRoot(false);
      }
    };

    if (accessToken) {
      fetchRoots();
    }
  }, [accessToken, queryRoomId]);

  // Auto-expand shared project folder when joining via invite URL
  useEffect(() => {
    if (queryRoomId && accessToken) {
      setExpandedFolders(prev => ({ ...prev, [queryRoomId]: true }));
      getFilesInsideFolder(queryRoomId, accessToken)
        .then(children => {
          setChildrenMap(prev => ({ ...prev, [queryRoomId]: children }));
        })
        .catch(err => {
          console.error("Error auto-expanding shared folder:", err);
        });
    }
  }, [queryRoomId, accessToken]);

  // Handle external trigger to create file or folder at root
  useEffect(() => {
    if (triggerRootCreate) {
      const isFolder = typeof triggerRootCreate === 'object' && triggerRootCreate !== null 
        ? !!triggerRootCreate.isFolder 
        : false;
      setRootCreationState({ isFolder });
      setTriggerRootCreate(null);
    }
  }, [triggerRootCreate, setTriggerRootCreate]);

  // 2. Expand / Collapse & Lazy-load Folder contents from backend
  const handleToggleFolder = async (folderId) => {
    const willOpen = !expandedFolders[folderId];
    setExpandedFolders(prev => ({ ...prev, [folderId]: willOpen }));

    // If opening and not cached in childrenMap, fetch from backend!
    if (willOpen && !childrenMap[folderId]) {
      try {
        setLoadingFolders(prev => ({ ...prev, [folderId]: true }));
        const children = await getFilesInsideFolder(folderId, accessToken);
        setChildrenMap(prev => ({ ...prev, [folderId]: children }));
      } catch (err) {
        console.error(`Error loading folder ${folderId}:`, err);
      } finally {
        setLoadingFolders(prev => ({ ...prev, [folderId]: false }));
      }
    }
  };

  // 3. Create File or Folder via Backend API
  const handleCreateItem = async ({ name, parentId, isFolder }) => {
    const { language } = parseFileInfo(name);

    try {
      const createdItem = await createFileOrFolder({
        name,
        isFolder,
        parentId: parentId || null,
        language: isFolder ? "" : language
      }, accessToken);

      if (createdItem) {
        // Update tree state immediately
        if (!parentId) {
          setRootItems(prev => [...prev, createdItem]);
        } else {
          setChildrenMap(prev => ({
            ...prev,
            [parentId]: [...(prev[parentId] || []), createdItem]
          }));
          setExpandedFolders(prev => ({ ...prev, [parentId]: true }));
        }

        // If it's a file, automatically open it in Monaco Editor & Tabs!
        if (!isFolder && onSelectFile) {
          onSelectFile(createdItem);
        }
      }
    } catch (err) {
      alert(err.message || "Failed to create item");
    }
  };

  // 4. Submit Root Creation
  const handleRootSubmit = (e) => {
    e.preventDefault();
    if (!rootInputName.trim() || !rootCreationState) return;

    handleCreateItem({
      name: rootInputName.trim(),
      parentId: null,
      isFolder: rootCreationState.isFolder
    });

    setRootCreationState(null);
    setRootInputName('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#120d24] text-[#cfc8de] border-r border-[#261a44] text-left select-none overflow-hidden">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#261a44] bg-[#160f2d] h-9 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9b91b8]">
          Explorer
        </span>
        <div className="flex items-center gap-1 text-[#a69cc4]">
          <button 
            type="button"
            onClick={() => setRootCreationState({ isFolder: false })}
            className="p-1 hover:text-white hover:bg-[#271b48] rounded transition"
            title="New File at Root"
          >
            <FilePlus size={15} />
          </button>
          <button 
            type="button"
            onClick={() => setRootCreationState({ isFolder: true })}
            className="p-1 hover:text-white hover:bg-[#271b48] rounded transition"
            title="New Folder at Root"
          >
            <FolderPlus size={15} />
          </button>
        </div>
      </div>

      {/* Root Inline Input */}
      {rootCreationState && (
        <div className="p-2 border-b border-[#261a44] bg-[#1a1332]">
          <form onSubmit={handleRootSubmit} className="flex items-center gap-1.5">
            {rootCreationState.isFolder ? (
              <Folder size={13} className="text-purple-400 shrink-0" />
            ) : (
              <FileCode size={13} className="text-yellow-400 shrink-0" />
            )}
            <input 
              type="text"
              autoFocus
              placeholder={rootCreationState.isFolder ? "folder name..." : "file.js..."}
              value={rootInputName}
              onChange={(e) => setRootInputName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setRootCreationState(null);
                  setRootInputName('');
                }
              }}
              onBlur={() => setRootCreationState(null)}
              className="w-full bg-[#0a0714] border border-purple-500 rounded px-1.5 py-0.5 text-xs text-white outline-none font-mono"
            />
          </form>
        </div>
      )}

      {/* Body / Tree */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {isLoadingRoot ? (
          <div className="flex items-center gap-2 p-3 text-xs text-[#7d7395] italic">
            <Loader2 size={13} className="animate-spin text-purple-400" />
            <span>Loading workspace files...</span>
          </div>
        ) : rootItems.length === 0 && !rootCreationState ? (
          <div className="p-4 text-center text-[#736891] space-y-2">
            <p className="text-xs">No files or folders yet.</p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRootCreationState({ isFolder: false })}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium"
              >
                + Create file
              </button>
              <span className="text-xs text-[#43375e]">•</span>
              <button
                type="button"
                onClick={() => setRootCreationState({ isFolder: true })}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                + Create folder
              </button>
            </div>
          </div>
        ) : (
          rootItems.map((item) => (
            item.isFolder ? (
              <FolderItem 
                key={item._id}
                item={item}
                depth={0}
                childrenMap={childrenMap}
                expandedFolders={expandedFolders}
                loadingFolders={loadingFolders}
                onToggleFolder={handleToggleFolder}
                onCreateItem={handleCreateItem}
                onSelectFile={onSelectFile}
                activeFileId={activeFileId}                     
              />
            ) : (
              <FileItem 
                key={item._id}
                item={item}
                depth={0}
                onSelectFile={onSelectFile}
                isActive={activeFileId === item._id}
              />
            )
          ))
        )}
      </div>
    </div>
  );
};

export default Left;