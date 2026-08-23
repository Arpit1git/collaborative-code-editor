import {io} from 'socket.io-client'

const URL = import.meta.env.VITE_BACKEND_API 

export const socket = io(URL, {
    autoConnect: false, 
});

