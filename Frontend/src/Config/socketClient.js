import {io} from 'socket.io-client';
import { BACKEND_URL } from './apiConfig.js';

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
