import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Code2, 
  Folder, 
  FolderPlus, 
  FilePlus, 
  FileCode, 
  LogOut, 
  Search, 
  Users, 
  Crown, 
  ArrowRight, 
  Plus, 
  X, 
  Loader2,
  Calendar,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useAuth } from '../features/auth/Context/AuthContext.jsx';
import { getRootFilesAndFolders, createFileOrFolder, deleteFileOrFolder } from '../features/Workspace/api/fileapi.js';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';

// Helper to determine language tag
const getLanguageTag = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase();
  const map = {
    js: 'JavaScript',
    jsx: 'React JSX',
    ts: 'TypeScript',
    tsx: 'React TSX',
    py: 'Python',
    cpp: 'C++',
    c: 'C',
    java: 'Java',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    md: 'Markdown'
  };
  return map[ext] || 'Code';
};

export default function Dashboard() {
  const { user, logout, accessToken } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'mine' | 'shared'
  
  // Debounce search query changes with a 300ms delay
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Delete Modal State
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async (item) => {
    if (!item) return;
    try {
      setIsDeleting(true);
      await deleteFileOrFolder(item._id, accessToken);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      setDeletingItem(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert(err.message || "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  const currentUserId = user?._id || user?.userId || user?.id;
  const currentUserName = user?.userName || user?.name || user?.email?.split('@')[0] || 'Developer';
  const currentUserEmail = user?.email || '';

  // 1. Fetch Root Projects & Files from backend
  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true);
      const data = await getRootFilesAndFolders(accessToken);
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchWorkspaces();
    }
  }, [accessToken]);

  // 2. Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      navigate('/login', { replace: true });
    }
  };

  // 3. Handle Item Creation (Folder or File at root level)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setCreateError(null);

    const name = newItemName.trim();
    const isFolder = isCreatingFolder;
    const ext = name.split('.').pop()?.toLowerCase();
    const language = isFolder ? "" : (ext || "javascript");

    try {
      const createdDoc = await createFileOrFolder({
        name,
        isFolder,
        parentId: null,
        language
      }, accessToken);

      if (createdDoc) {
        setIsCreateModalOpen(false);
        setNewItemName('');
        
        // Navigate straight into the newly created workspace
        if (createdDoc.isFolder) {
          navigate(`/ide?project=${createdDoc._id}`);
        } else {
          navigate(`/ide?project=${createdDoc._id}&file=${createdDoc._id}`);
        }
      }
    } catch (err) {
      setCreateError(err.message || "Failed to create item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Filter & Search Logic with Debouncing
  const filteredItems = items.filter((item) => {
    const matchesSearch = !debouncedSearchQuery || item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const ownerId = typeof item.owner === 'object' ? item.owner?._id : item.owner;
    const isMine = currentUserId && ownerId && ownerId.toString() === currentUserId.toString();

    if (filterTab === 'mine') return isMine;
    if (filterTab === 'shared') return !isMine;
    return true;
  });

  const myProjectsCount = items.filter((item) => {
    const ownerId = typeof item.owner === 'object' ? item.owner?._id : item.owner;
    return currentUserId && ownerId && ownerId.toString() === currentUserId.toString();
  }).length;

  const sharedProjectsCount = items.length - myProjectsCount;

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0d091a] text-[#ded9ec] flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. TOP NAVBAR */}
      <header className="h-16 px-6 border-b border-[#23173f] bg-[#120a26]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
            <Code2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">Got Collab</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50 font-medium">
                Workspaces
              </span>
            </div>
            <p className="text-[11px] text-[#8e85a6] hidden sm:block">Multiplayer Collaborative IDE</p>
          </div>
        </div>

        {/* Center: Search Input */}
        <div className="hidden md:flex items-center gap-2 bg-[#090614] border border-[#261845] focus-within:border-purple-500 rounded-xl px-3 py-1.5 w-80 transition">
          <Search size={14} className="text-[#7d7398]" />
          <input 
            type="text"
            placeholder="Search projects & files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white outline-none w-full placeholder:text-[#6a6085]"
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setDebouncedSearchQuery('');
              }}
              className="text-[#7d7398] hover:text-white transition cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Right: User Profile & Logout */}
        <div className="flex items-center gap-3">
          {/* User Profile Pill (Read-only) */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#170e30] border border-[#2a1b4d]">
            <div className="w-6 h-6 rounded-full bg-linear-to-tr from-purple-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">{currentUserName}</span>
              {currentUserEmail && (
                <span className="text-[10px] text-[#8b81a8] leading-none truncate max-w-[120px]">
                  {currentUserEmail}
                </span>
              )}
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-white bg-rose-950/30 hover:bg-rose-900/60 border border-rose-800/40 transition active:scale-95 cursor-pointer shadow-xs"
            title="Log Out of your account"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Header Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-[#170e33] to-[#120a28] border border-[#2b1c4e] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-1 relative z-10 text-left">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Your Workspaces</span>
              <Sparkles size={18} className="text-purple-400" />
            </h1>
            <p className="text-xs md:text-sm text-[#958ba8] max-w-xl">
              Select a project folder to open the collaborative IDE, or start a brand new project.
            </p>
          </div>

          {/* Create Buttons */}
          <div className="flex items-center gap-2.5 relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(true);
                setNewItemName('');
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition active:scale-95 cursor-pointer"
            >
              <FolderPlus size={15} />
              <span>New Project</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewItemName('');
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#1a1138] hover:bg-[#27194f] text-purple-300 hover:text-white border border-[#312059] transition active:scale-95 cursor-pointer"
            >
              <FilePlus size={15} />
              <span>New File</span>
            </button>
          </div>
        </div>

        {/* 3. TABS & FILTER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#23173f] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-purple-700/70 text-white shadow-xs'
                  : 'text-[#8e85a6] hover:text-white hover:bg-[#1a1138]'
              }`}
            >
              All Projects ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('mine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterTab === 'mine'
                  ? 'bg-purple-700/70 text-white shadow-xs'
                  : 'text-[#8e85a6] hover:text-white hover:bg-[#1a1138]'
              }`}
            >
              My Projects ({myProjectsCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('shared')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterTab === 'shared'
                  ? 'bg-purple-700/70 text-white shadow-xs'
                  : 'text-[#8e85a6] hover:text-white hover:bg-[#1a1138]'
              }`}
            >
              Shared Collaborations ({sharedProjectsCount})
            </button>
          </div>

          {/* Mobile search bar */}
          <div className="md:hidden flex items-center gap-2 bg-[#090614] border border-[#261845] rounded-xl px-3 py-1.5">
            <Search size={13} className="text-[#7d7398]" />
            <input 
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white outline-none w-full placeholder:text-[#6a6085]"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearchQuery('');
                }}
                className="text-[#7d7398] hover:text-white transition cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 4. WORKSPACES & PROJECTS GRID */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#8e85a6]">
            <Loader2 size={28} className="animate-spin text-purple-400" />
            <p className="text-xs">Loading your workspaces...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-6 flex flex-col items-center justify-center text-center bg-[#130b29]/40 border border-[#241744] border-dashed rounded-3xl">
            <div className="w-14 h-14 rounded-2xl bg-purple-900/30 border border-purple-700/40 flex items-center justify-center text-purple-400 mb-3 shadow-md">
              <FolderPlus size={28} />
            </div>
            <h3 className="text-base font-bold text-white">No projects found</h3>
            <p className="text-xs text-[#8e85a6] max-w-sm mt-1 mb-4 leading-relaxed">
              {debouncedSearchQuery 
                ? `No results matching "${debouncedSearchQuery}". Try a different search term.` 
                : "You don't have any root projects yet. Create a new folder or file to launch your IDE."}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(true);
                setNewItemName('');
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isFolder = item.isFolder;
              const ownerId = typeof item.owner === 'object' ? item.owner?._id : item.owner;
              const isOwner = currentUserId && ownerId && ownerId.toString() === currentUserId.toString();
              const collabCount = (item.collaborators?.length || 0) + (isOwner ? 1 : 0);

              const handleOpenWorkspace = () => {
                if (isFolder) {
                  navigate(`/ide?project=${item._id}`);
                } else {
                  navigate(`/ide?project=${item._id}&file=${item._id}`);
                }
              };

              return (
                <div
                  key={item._id}
                  onClick={handleOpenWorkspace}
                  className="group bg-[#130d29] hover:bg-[#1a1236] border border-[#261947] hover:border-purple-500/50 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-150 hover:shadow-xl hover:shadow-purple-900/10 cursor-pointer text-left relative overflow-hidden"
                >
                  {/* Top: Icon + Name + Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        isFolder
                          ? 'bg-purple-900/40 border border-purple-700/50 text-purple-300'
                          : 'bg-amber-950/40 border border-amber-700/50 text-amber-300'
                      }`}>
                        {isFolder ? <Folder size={20} /> : <FileCode size={20} />}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-white group-hover:text-purple-200 transition truncate">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[#8e85a6]">
                            {isFolder ? 'Workspace Folder' : getLanguageTag(item.name)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Owner / Collaborator Badge */}
                    {isOwner ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/60 shrink-0">
                        <Crown size={10} className="text-amber-400" />
                        <span>Owner</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 shrink-0">
                        <Users size={10} className="text-indigo-400" />
                        <span>Collaborator</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom: Date & Launch Action & Delete */}
                  <div className="flex items-center justify-between border-t border-[#22163f] pt-3 text-[11px] text-[#7d7398]">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingItem(item);
                          }}
                          className="p-1 rounded-lg text-[#74698f] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition cursor-pointer"
                          title={`Delete ${isFolder ? 'Folder' : 'File'}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <div className="flex items-center gap-1 text-purple-400 group-hover:text-purple-300 font-medium transition group-hover:translate-x-0.5 duration-150">
                        <span>Launch IDE</span>
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. CREATE MODAL (POPUP) */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 select-none animate-in fade-in duration-150"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="bg-[#140c2b] border border-[#2e1f54] rounded-2xl p-6 shadow-2xl w-full max-w-md flex flex-col gap-4 text-white relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  {isCreatingFolder ? <FolderPlus size={20} /> : <FilePlus size={20} />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">
                    {isCreatingFolder ? "Create New Project Folder" : "Create New Standalone File"}
                  </h3>
                  <p className="text-xs text-[#8e85a6] mt-0.5">
                    {isCreatingFolder 
                      ? "A root workspace folder to organize your collaborative files."
                      : "A standalone file with instant Monaco editor support."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8f85a8] hover:text-white hover:bg-[#231542] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5 mt-1">
              <div>
                <label className="text-[11px] font-medium text-[#a59cb8] mb-1.5 block">
                  {isCreatingFolder ? "Project Folder Name" : "File Name (e.g. main.js, index.html)"}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder={isCreatingFolder ? "my-awesome-project" : "app.js"}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-[#0b0817] border border-[#2b1b4d] focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono placeholder:text-[#675d82] transition"
                />
              </div>

              {createError && (
                <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 p-2 rounded-lg">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#22163f]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8e85a6] hover:text-white hover:bg-[#20143d] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newItemName.trim() || isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create & Launch IDE</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal 
        isOpen={Boolean(deletingItem)}
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
