// Helper to construct request headers with JWT token if available
const getHeaders = (token) => {
    const activeToken = token || localStorage.getItem("accessToken");
    return {
        "Content-Type": "application/json",
        ...(activeToken && { Authorization: `Bearer ${activeToken}` }),
    };
};

export const handleSaveFile = async (fileName, content, language, token = null) => {
    try {
        if (!fileName || !content || !language) {
            throw new Error("Missing required fields for saving.");
        }

        const payload = { fileName, content, language };
        const url = `${import.meta.env.VITE_BACKEND_API}/file/create`;

        const res = await fetch(url, {
            method: "POST",
            headers: getHeaders(token),
            credentials: "include",
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to save file");
        }

        return data;
    } catch (error) {
        console.error("Error while saving:", error);
        throw error;
    }
};

export const getFileById = async (id, token = null) => {
    try {
        const url = `${import.meta.env.VITE_BACKEND_API}/file/${id}`;

        const res = await fetch(url, {
            method: "GET",
            headers: getHeaders(token),
            credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Error while searching file");
        }

        return data;
    } catch (error) {
        console.error("Error from getFileById:", error);
        throw error;
    }
};

export const runFile = async (content, language, customInput = "", token = null) => {
    try {
        if (!content || !language) {
            throw new Error("Content and Language Required");
        }

        const url = `${import.meta.env.VITE_BACKEND_API}/file/compile`;

        const res = await fetch(url, {
            method: "POST",
            headers: getHeaders(token),
            credentials: "include",
            body: JSON.stringify({ content, language, customInput }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to execute code");
        }

        return data;
    } catch (error) {
        console.error("Error from runFile:", error);
        throw error;
    }
};