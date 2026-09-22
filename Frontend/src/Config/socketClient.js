import {io} from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 
  || (import.meta.env.VITE_BACKEND_API ? import.meta.env.VITE_BACKEND_API.replace(/\/api\/?$/, '') : 'http://localhost:8000');

export const socket = io(BACKEND_URL, {
  autoConnect: false, // We connect explicitly once the user is authenticated
  auth: (cb) => {
    // Dynamically pulls the newest accessToken from localStorage!
    cb({
      token: localStorage.getItem('accessToken')
    });
  },
  withCredentials: true
});
