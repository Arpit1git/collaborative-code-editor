import { BACKEND_API } from '../../../Config/apiConfig.js';

// ── AUTOMATIC TOKEN REFRESH & AUTH FETCH WRAPPER ──
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};

export const authFetch = async (url, options = {}, customToken = null) => {
    
    let token = customToken || localStorage.getItem("accessToken");

    const makeRequest = async (activeToken) => {
        const headers = {
            "Content-Type": "application/json",
            ...(activeToken && { Authorization: `Bearer ${activeToken}` }),
            ...(options.headers || {})
        };

        return fetch(url, {
            ...options,
            headers,
            credentials: "include"
        });
    };

    let res = await makeRequest(token);

    // If unauthorized or forbidden (token expired), auto-refresh via refresh cookie!
    if (res.status === 401 || res.status === 403) {
        if (!isRefreshing) {
            isRefreshing = true;
            try {
                const refreshRes = await fetch(`${BACKEND_API}/auth/refresh`, {
                    method: "POST",
                    credentials: "include"
                });
                const refreshData = await refreshRes.json();

                if (refreshData.success && refreshData.accessToken) {
                    localStorage.setItem("accessToken", refreshData.accessToken);
                    isRefreshing = false;
                    onRefreshed(refreshData.accessToken);
                    return await makeRequest(refreshData.accessToken);
                } else {
                    isRefreshing = false;
                    localStorage.removeItem("accessToken");
                    window.location.href = "/login";
                    throw new Error("Session expired. Please log in again.");
                }
            } catch (err) {
                isRefreshing = false;
                throw err;
            }
        } else {
            // If another request is already refreshing, wait for it
            return new Promise((resolve, reject) => {
                subscribeTokenRefresh(async (newToken) => {
                    try {
                        const retryRes = await makeRequest(newToken);
                        resolve(retryRes);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        }
    }

    return res;
};

// ── FILE API ENDPOINTS ──

export const handleSaveFile = async (fileName, content, language, token = null) => {
    try {
        if (!fileName || !content || !language) {
            throw new Error("Missing required fields for saving.");
        }

        const payload = { fileName, content, language };
        const url = `${BACKEND_API}/file/create`;

        const res = await authFetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
        }, token);

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
        const url = `${BACKEND_API}/file/${id}`;
        const res = await authFetch(url, { method: "GET" }, token);

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

        const url = `${BACKEND_API}/file/compile`;
        const res = await authFetch(url, {
            method: "POST",
            body: JSON.stringify({ content, language, customInput }),
        }, token);

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

export const getRootFilesAndFolders = async (token = null) => {
    try {
        const url = `${BACKEND_API}/file/root`;
        const res = await authFetch(url, { method: "GET" }, token);
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || "Failed to fetch root items");
        }
        return data.data || [];
    } catch (error) {
        console.error("Error from getRootFilesAndFolders:", error);
        throw error;
    }
};

export const getFilesInsideFolder = async (parentId, token = null) => {
    try {
        const url = `${BACKEND_API}/file/folder/${parentId}`;
        const res = await authFetch(url, { method: "GET" }, token);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Failed to fetch folder items");
        }
        return data.data || [];
    } catch (error) {
        console.error("Error from getFilesInsideFolder:", error);
        throw error;
    }
};

export const createFileOrFolder = async ({ name, isFolder, parentId = null, language = "" }, token = null) => {
    try {
        const url = `${BACKEND_API}/file/create`;
        const res = await authFetch(url, {
            method: "POST",
            body: JSON.stringify({ name, isFolder, parentId, language })
        }, token);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Failed to create item");
        }
        return data.data;
    } catch (error) {
        console.error("Error from createFileOrFolder:", error);
        throw error;
    }
};

export const deleteFileOrFolder = async (id, token = null) => {
    try {
        const url = `${BACKEND_API}/file/${id}`;
        const res = await authFetch(url, {
            method: "DELETE"
        }, token);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Failed to delete item");
        }
        return data;
    } catch (error) {
        console.error("Error from deleteFileOrFolder:", error);
        throw error;
    }
};