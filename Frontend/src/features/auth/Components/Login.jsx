import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState(null);
    const [pending, setPending] = useState(false);

    const redirectUrl = searchParams.get("redirect") || "/ide";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);

        const formData = new FormData(e.target);
        const email = formData.get("email");
        const password = formData.get("password");

        try {
            await login(email, password);
            navigate(redirectUrl, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setPending(false);
        }
    };

    const signupLink = redirectUrl !== "/ide" 
        ? `/signup?redirect=${encodeURIComponent(redirectUrl)}` 
        : "/signup";

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96 flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-center">Welcome Back</h2>
                <input type="email" name="email" placeholder="Email" required className="border p-2 rounded" />
                <input type="password" name="password" placeholder="Password" required className="border p-2 rounded" />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={pending}
                    className="w-full bg-blue-600 text-white p-2 rounded mt-4 disabled:bg-gray-400 hover:bg-blue-700 transition">
                    {pending ? "Processing..." : "Login"}
                </button>
                <p className="text-sm text-center mt-2">
                    Don't have an account? <Link to={signupLink} className="text-blue-500 hover:underline">Sign up.</Link>
                </p>
            </form>
        </div>
    );
}