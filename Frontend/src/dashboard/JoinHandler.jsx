import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/Context/AuthContext.jsx';
import { authFetch } from '../features/Workspace/api/fileapi.js';
import { BACKEND_API } from '../Config/apiConfig.js';
import { Loader2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

export default function JoinHandler() {
  const { token } = useParams();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const isRedeemingRef = useRef(false);

  useEffect(() => {
    // Wait until AuthContext finishes checking stored tokens / cookies
    if (isLoading) return;

    // 1. If not authenticated, redirect to login while preserving the return destination
    if (!isAuthenticated) {
      navigate(`/login?redirect=/join/${token}`, { replace: true });
      return;
    }

    // 2. Prevent duplicate calls in React StrictMode
    if (isRedeemingRef.current) return;
    isRedeemingRef.current = true;

    // 3. Authenticated: Redeem the token with backend
    const redeemInvite = async () => {
      try {
        const url = `${BACKEND_API}/collab/join/${token}`;
        const res = await authFetch(url, {
          method: 'POST'
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || 'This invite link has expired or is invalid.');
          return;
        }

        // 4. Success! Redirect into the IDE with the collaborative room and active file
        const roomId = data.rootDoc?._id;
        const fileId = data.activeFile?._id || roomId;

        navigate(`/ide?roomId=${roomId}&file=${fileId}`, { replace: true });

      } catch (err) {
        console.error("Redeem invite error:", err);
        setError('Failed to connect to the server. Please check your connection.');
      }
    };

    redeemInvite();
  }, [token, isAuthenticated, isLoading, navigate]);

  // Expired or Invalid Link Error Card
  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0b0817] text-white p-4 select-none">
        <div className="bg-[#130d29] border border-red-500/30 p-7 rounded-2xl max-w-md w-full text-center flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle size={26} />
          </div>

          <div>
            <h3 className="font-bold text-base text-white">Invite Link Invalid</h3>
            <p className="text-xs text-[#8e85a6] leading-relaxed mt-1.5">
              {error}
            </p>
          </div>

          <div className="w-full border-t border-[#24173e] pt-4 mt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/ide', { replace: true })}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
            >
              <span>Go to My Workspace</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0b0817] text-white gap-4 select-none">
      <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
        <Sparkles size={22} />
      </div>

      <div className="flex items-center gap-2 text-xs text-[#8e85a6]">
        <Loader2 size={16} className="text-purple-400 animate-spin" />
        <span>Joining collaborative room...</span>
      </div>
    </div>
  );
}
