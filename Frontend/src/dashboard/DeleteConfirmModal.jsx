import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  item,
  onClose,
  onConfirm,
  isDeleting = false
}) {
  const [typedName, setTypedName] = useState('');

  // Reset input whenever modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      setTypedName('');
    }
  }, [isOpen, item]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !item) return null;

  const itemName = item.name || '';
  const isMatch = typedName.trim() === itemName.trim();
  const isFolder = Boolean(item.isFolder);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isMatch && !isDeleting) {
      onConfirm(item);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 select-none animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div 
        className="bg-[#140c2b] border border-red-500/30 rounded-2xl p-6 shadow-2xl w-full max-w-md flex flex-col gap-4 text-white relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">
                Delete {isFolder ? 'Folder' : 'File'}
              </h3>
              <p className="text-xs text-[#8e85a6] mt-0.5">
                This action is permanent and cannot be undone.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="text-[#7d7398] hover:text-white p-1 rounded-lg hover:bg-[#20153d] transition cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning & Instructions */}
        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-xs text-red-200/90 leading-relaxed">
          {isFolder ? (
            <p>
              Deleting <span className="font-semibold text-white">"{itemName}"</span> will permanently delete this workspace folder and all files/subfolders inside it.
            </p>
          ) : (
            <p>
              Deleting <span className="font-semibold text-white">"{itemName}"</span> will permanently delete this file.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#9f94bf] mb-1.5 block">
              To confirm, type <span className="font-mono text-white bg-[#221544] px-1.5 py-0.5 rounded border border-[#3b276e] select-text">{itemName}</span> below:
            </label>
            <input
              type="text"
              autoFocus
              disabled={isDeleting}
              placeholder={`Type "${itemName}" to confirm`}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="w-full bg-[#0a0614] border border-[#2c1d4e] focus:border-red-500/70 focus:ring-1 focus:ring-red-500/40 rounded-xl px-3.5 py-2 text-xs text-white outline-none transition placeholder:text-[#5a5075] font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8e85a6] hover:text-white hover:bg-[#1f153a] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isMatch || isDeleting}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition active:scale-95 ${
                isMatch && !isDeleting
                  ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-red-600/20'
                  : 'bg-[#221638] text-[#695d82] cursor-not-allowed border border-[#2e1f4a]'
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={13} />
                  <span>Delete {isFolder ? 'Folder' : 'File'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
