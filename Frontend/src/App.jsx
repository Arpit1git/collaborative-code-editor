
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./features/auth/Context/AuthContext";

const LoginPage = lazy(() => import("./features/auth/Components/Login.jsx").then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("./features/auth/Components/SignUp.jsx").then(module => ({ default: module.SignupPage })));


const Editor = lazy(() => import("./features/Workspace/Editor.jsx").then(module => ({ default: module.Editor })));
const Ide = lazy(() => import("./dashboard/ide.jsx"));

export default function App() {

    const { isAuthenticated } = useAuth();

    return (
     
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading Workspace...</div>}>
            <Routes>
               
                <Route path="/" element={<Navigate to={isAuthenticated ? "/ide" : "/login"} replace />} />
                
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              
                <Route 
                    path="/workspace" 
                    element={isAuthenticated ? <Editor /> : <Navigate to="/login" replace />} 
                />

             
                <Route 
                    path="/ide" 
                    element={isAuthenticated ? <Ide /> : <Navigate to="/login" replace />} 
                />
            </Routes>
        </Suspense>
    );
}