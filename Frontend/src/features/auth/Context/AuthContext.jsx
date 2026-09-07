
import { useEffect } from "react";
import { createContext,use,useState,useCallback } from "react";


const AuthContext = createContext(null);

const API = import.meta.env.VITE_BACKEND_API

export  function  AuthProvider({children}){

   const [accessToken, setAccessToken] = useState(()=>localStorage.getItem("accessToken" ) || null);
   const [isLoading, setIsLoading] = useState(true);
   const [user, setUser] = useState(null)


   const isAuthenticated = !!accessToken && !!user;


   const saveToken = useCallback((token)=>{
        setAccessToken(token);
        localStorage.setItem("accessToken", token);
   },[]);


   const clearAuth = useCallback(() => {
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem("accessToken");
    }, []);


   const fetchMe = useCallback(async (token)=>{
             const res = await fetch(`${API}/auth/getMe`,{
                 headers:{Authorization: `Bearer ${token}` },
                 credentials: "include",
             });

              if (!res.ok) throw new Error("Failed to fetch user");

             const data = await res.json();
             return data.user;
   },[]);

   const refreshAccessToken  = useCallback(async()=>{
        try {

          const res = await fetch(`${API}/auth/refresh`,{
                 method:"POST",
                 credentials:"include"
          })

          const data = await res.json();

          if(data.success && data.accessToken){
               saveToken(data.accessToken);
               return data.accessToken;
          }

          clearAuth();
          return null;
          
        } catch (error) {
           clearAuth();
            return null;
        }
   })


   const login = useCallback(async (email,password)=>{

           const res = await fetch(`${API}/auth/login`,{
                method:'POST',
                headers: { "Content-Type": "application/json" },
                credentials:"include",
                body:JSON.stringify({email,password})
           })
            

        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        saveToken(data.accessToken);
        const userData = await fetchMe(data.accessToken);
        setUser(userData);
        return data;

   },[saveToken,fetchMe])


   const signup = useCallback(async (userName, email, password) => {
        const res = await fetch(`${API}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userName, email, password }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        saveToken(data.accessToken);
        const userData = await fetchMe(data.accessToken);
        setUser(userData);
        return data;
    }, [saveToken, fetchMe]);


      const logout = useCallback(async () => {
        try {
            await fetch(`${API}/auth/logout`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
                credentials: "include",
            });
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            clearAuth();
        }
    }, [accessToken, clearAuth]);



    useEffect(() => {

     const init = async ()=>{
             
                 const storedToken = localStorage.getItem("accessToken");

                 if(!storedToken){
                     setIsLoading(false);
                     return ;
                 }

                 try {

                    const userData = await fetchMe(storedToken);

                    setUser(userData);
                    setAccessToken(storedToken);
                    
                 } catch  {
                     
                         const newToken = await refreshAccessToken();
                          
                         if(newToken){
                               try {
                                   const userData = await fetchMe(newToken);
                                   setUser(userData);
                               } catch  {
                                   clearAuth();
                               }
                         }
                 } finally {
                         setIsLoading(false);
                 }
     };
     init();
    }, [])
    

    const value = {
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        login,
        signup,
        logout,
        refreshAccessToken,
    };

     if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
                Checking authentication...
            </div>
        );
    }

   

   return (
        <AuthContext value={value}>
              {children}
        </AuthContext>
   )
      
} 

export function useAuth(){
     return   use(AuthContext);
}
