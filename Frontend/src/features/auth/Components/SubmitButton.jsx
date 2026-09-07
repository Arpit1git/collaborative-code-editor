
import { useFormStatus } from "react-dom";

export function SubmitButton({ label }) {
    const { pending } = useFormStatus();

    return (
        <button 
            type="submit" 
            disabled={pending}
            className="w-full bg-blue-600 text-white p-2 rounded mt-4 disabled:bg-gray-400 hover:bg-blue-700 transition"
        >
            {pending ? "Processing..." : label}
        </button>
    );
}