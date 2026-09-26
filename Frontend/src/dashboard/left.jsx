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
  Loader2,
  Trash2
} from 'lucide-react';
import { 
  getRootFilesAndFolders, 
  getFilesInsideFolder, 
  createFileOrFolder,
  deleteFileOrFolder,
  getFileById 
} from '../features/Workspace/api/fileapi.js';
import { useAuth } from '../features/auth/Context/AuthContext.jsx';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';

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
  onDeleteItem,
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
            className="p-0.5 hover:text-white hover:bg-[#341b58] rounded transition cursor-pointer"
            title="New File Inside"
          >
            <FilePlus size={13} />
          </button>
          
          <button
            type="button"
            onClick={(e) => handleStartCreate(e, true)}
            className="p-0.5 hover:text-white hover:bg-[#341b58] rounded transition cursor-pointer"
            title="New Subfolder"
          >
            <FolderPlus size={13} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem && onDeleteItem(item);
            }}
            className="p-0.5 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
            title="Delete Folder"
          >
            <Trash2 size={13} />
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
                  onDeleteItem={onDeleteItem}
                  activeFileId={activeFileId}
                />
              ) : (
                <FileItem 
                  key={child._id} 
                  item={child} 
                  depth={depth + 1}
                  onSelectFile={onSelectFile}
                  onDeleteItem={onDeleteItem}
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

// ── FILE ITEM HELPER (WITH HOVER DELETE BUTTON) ──
export const FileItem = ({ item, depth = 0, onSelectFile, onDeleteItem, isActive = false }) => (
  <div
    style={{ paddingLeft: `${depth * 14 + 22}px` }}
    onClick={() => onSelectFile && onSelectFile(item)}
    className={`group flex items-center justify-between py-1 pr-2 pl-2 cursor-pointer rounded-sm text-xs transition select-none ${
      isActive 
        ? 'bg-[#3b1c66] text-white font-medium shadow-xs' 
        : 'hover:bg-[#261b48] text-[#9f95ba] hover:text-white'
    }`}
  >
    <div className="flex items-center gap-1.5 min-w-0 flex-1">
      <FileCode size={13} className="text-yellow-400 shrink-0" />
      <span className="truncate">{item.name}</span>
    </div>

    <div className="hidden group-hover:flex items-center gap-1 text-[#8f85a8]">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteItem && onDeleteItem(item);
        }}
        className="p-0.5 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
        title="Delete File"
      >
        <Trash2 size={12} />
      </button>
    </div>
  </div>
);

// ── MAIN LEFT COMPONENT (SCOPED PROJECT & WORKSPACE EXPLORER) ──
export const Left = ({ onSelectFile, activeFileId, triggerRootCreate, setTriggerRootCreate }) => {
  const { accessToken } = useAuth();

  // Project context state (when opened with ?project=<id> or ?roomId=<id>)
  const [currentProject, setCurrentProject] = useState(null);

  // Root files & folders state (direct children of the workspace/project)
  const [rootItems, setRootItems] = useState([]);
  const [childrenMap, setChildrenMap] = useState({}); // { [folderId]: childItems }
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loadingFolders, setLoadingFolders] = useState({});
  const [isLoadingRoot, setIsLoadingRoot] = useState(true);

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Root creation state
  const [rootCreationState, setRootCreationState] = useState(null);
  const [rootInputName, setRootInputName] = useState('');

  // Delete Handler
  const handleDeleteConfirm = async (item) => {
    if (!item || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteFileOrFolder(item._id, accessToken);

      // 1. Remove from rootItems if present
      setRootItems((prev) => prev.filter((i) => i._id !== item._id));

      // 2. Remove from all childrenMap arrays and delete its key if it was a folder
      setChildrenMap((prev) => {
        const next = { ...prev };
        delete next[item._id];
        for (const parentId in next) {
          next[parentId] = next[parentId].filter((i) => i._id !== item._id);
        }
        return next;
      });

      // 3. Clear active selection if the deleted file was currently open
      if (activeFileId === item._id) {
        if (onSelectFile) onSelectFile(null);
      }

      setDeletingItem(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert(err.message || "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. Initial Load & Scoped Project Load
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('project') || searchParams.get('roomId');
  const queryFileId = searchParams.get('file');

  useEffect(() => {
    const fetchRoots = async () => {
      try {
        setIsLoadingRoot(true);

        if (queryProjectId) {
          // Scoped IDE mode: Fetch only this specific project folder / file
          const projectRes = await getFileById(queryProjectId, accessToken);
          if (projectRes?.file) {
            const doc = projectRes.file;
            setCurrentProject(doc);

            if (doc.isFolder) {
              // Fetch all direct child files and subfolders inside this project folder
              const children = await getFilesInsideFolder(doc._id, accessToken);
              setRootItems(children || []);

              // Auto-open file if no file is currently open
              if (onSelectFile && !activeFileId) {
                if (queryFileId) {
                  const matchingFile = (children || []).find(c => c._id === queryFileId);
                  if (matchingFile && !matchingFile.isFolder) {
                    onSelectFile(matchingFile);
                  }
                } else {
                  // Open the first file inside this project folder
                  const firstFile = (children || []).find(c => !c.isFolder);
                  if (firstFile) {
                    onSelectFile(firstFile);
                  }
                }
              }
            } else {
              // Single file workspace mode
              setRootItems([doc]);
              if (onSelectFile && !activeFileId) {
                onSelectFile(doc);
              }
            }
          } else {
            setCurrentProject(null);
            const data = await getRootFilesAndFolders(accessToken);
            setRootItems(data || []);
          }
        } else {
          // Standard / Full workspace mode
          setCurrentProject(null);
          const data = await getRootFilesAndFolders(accessToken);
          setRootItems(data || []);
        }
      } catch (err) {
        console.error("Error fetching items in Left explorer:", err);
      } finally {
        setIsLoadingRoot(false);
      }
    };

    if (accessToken) {
      fetchRoots();
    }
  }, [accessToken, queryProjectId, queryFileId]);

  // Handle external trigger to create file or folder from Central empty state
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
        setChildrenMap(prev => ({ ...prev, [folderId]: children || [] }));
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

    // If parentId is not specified, default to the scoped project's ID (if in a folder project)
    const effectiveParentId = (parentId !== undefined && parentId !== null)
      ? parentId
      : (currentProject?.isFolder ? currentProject._id : null);

    try {
      const createdItem = await createFileOrFolder({
        name,
        isFolder,
        parentId: effectiveParentId,
        language: isFolder ? "" : language
      }, accessToken);

      if (createdItem) {
        // Determine whether this item belongs to the root Explorer view
        const isCurrentRoot = !effectiveParentId || (currentProject?.isFolder && effectiveParentId === currentProject._id);

        if (isCurrentRoot) {
          setRootItems(prev => [...prev, createdItem]);
        } else {
          setChildrenMap(prev => ({
            ...prev,
            [effectiveParentId]: [...(prev[effectiveParentId] || []), createdItem]
          }));
          setExpandedFolders(prev => ({ ...prev, [effectiveParentId]: true }));
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
      // effectiveParentId will automatically use currentProject._id or null
      isFolder: rootCreationState.isFolder
    });

    setRootCreationState(null);
    setRootInputName('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#120d24] text-[#cfc8de] border-r border-[#261a44] text-left select-none overflow-hidden">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#261a44] bg-[#160f2d] h-9 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          {currentProject ? (
            <>
              {currentProject.isFolder ? (
                <Folder size={13} className="text-purple-400 shrink-0" />
              ) : (
                <FileCode size={13} className="text-yellow-400 shrink-0" />
              )}
              <span 
                className="text-[11px] font-bold uppercase tracking-wider text-purple-200 truncate"
                title={`Project Root: ${currentProject.name}`}
              >
                {currentProject.name}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9b91b8]">
              Explorer
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[#a69cc4] shrink-0">
          <button 
            type="button"
            onClick={() => setRootCreationState({ isFolder: false })}
            className="p-1 hover:text-white hover:bg-[#271b48] rounded transition cursor-pointer"
            title={currentProject?.isFolder ? `New File in ${currentProject.name}` : "New File at Root"}
          >
            <FilePlus size={15} />
          </button>
          <button 
            type="button"
            onClick={() => setRootCreationState({ isFolder: true })}
            className="p-1 hover:text-white hover:bg-[#271b48] rounded transition cursor-pointer"
            title={currentProject?.isFolder ? `New Folder in ${currentProject.name}` : "New Folder at Root"}
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
            <p className="text-xs">
              {currentProject ? `"${currentProject.name}" is empty.` : "No files or folders yet."}
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRootCreationState({ isFolder: false })}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer"
              >
                + Create file
              </button>
              <span className="text-xs text-[#43375e]">•</span>
              <button
                type="button"
                onClick={() => setRootCreationState({ isFolder: true })}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
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
                onDeleteItem={setDeletingItem}
                activeFileId={activeFileId}                     
              />
            ) : (
              <FileItem 
                key={item._id} 
                item={item} 
                depth={0}
                onSelectFile={onSelectFile}
                onDeleteItem={setDeletingItem}
                isActive={activeFileId === item._id}
              />
            )
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingItem)}
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Left;