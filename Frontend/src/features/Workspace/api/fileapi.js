
export const handleSaveFile = async (fileName,content,language)=>{
         
        try {

            if(!fileName || !content || !language){
                throw new Error("Missing required fields for saving.");   
            }

            const payload ={fileName:fileName,content:content,language:language};

            console.log("Payload :",payload);
            
            const url = `${import.meta.env.VITE_BACKEND_API}/file/create`;
            console.log("URL :",url);
            
            const res = await fetch(url,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify(payload)
            })
            
            console.log("res :",res);
        
            const data = await res.json();
            console.log("data :",data);
            
            return data;
            
        } catch (error) {
            console.error("Error while saving....");
            throw error
        }
}

export const getFileById = async(id)=>{
    try {
        
        const url = `${import.meta.env.VITE_BACKEND_API}/file/${id}`

        const res = await fetch(url,{
            method:"GET",
            headers:{"Content-Type":"application/json"}
        })

        if(!res.ok){
            throw new Error("Erro while searching file...")
        }

        const data = await res.json();
        return data;
        
    } catch (error) {

        console.error("Error from getFileById",error);
        throw error;

    }
} 

