import { terminalManager } from '../Terminal/terminalManager.js'; 

export  function registerTerminalSocket(io){
       
      io.on("connection",(socket)=>{
             
           
         
              // 1. Join collaborative room and synchronize terminal state
              socket.on("room:join", ({ roomId }) => {
                    if (!roomId) return;
                    socket.join(roomId);
                    console.log(`[TerminalSocket] Socket ${socket.id} joined room: "${roomId}"`);

                    const isRunning = terminalManager.isRoomRunning(roomId);
                    socket.emit("terminal:status", { isRunning });

                    // Deliver output history (even if code just finished executing)
                    const history = terminalManager.getHistory(roomId);
                    if (history) {
                         socket.emit("terminal:data", history);
                    }
              });

              // 2. User clicks "Run"
              socket.on("terminal:run", async ({ roomId, language, content }) => {
                      console.log(`[TerminalSocket] Received terminal:run for room "${roomId}", language "${language}", bytes: ${content?.length || 0}`);
                      try {
                             // Notify all users in the room that execution started
                             // NOTE: sender is already in the room (via room:join), so io.to() reaches them too
                             io.to(roomId).emit("terminal:status", { isRunning: true });
                              
                             await terminalManager.createSession({
                                  roomId,
                                  language,
                                  content,
                                  onData: (data) => {
                                      // Stream output live to everyone in the room (sender included)
                                      io.to(roomId).emit("terminal:data", data);
                                  },
                                  onExit: (exitCode) => {
                                       // Execution finished, reset button to "Run" for all room members
                                      console.log(`[TerminalSocket] Execution ended for room "${roomId}" with exitCode ${exitCode}`);
                                      io.to(roomId).emit("terminal:status", { isRunning: false, exitCode });
                                  }
                              });

                       } catch (error) {
                           console.error(`[TerminalSocket] Execution error for room "${roomId}":`, error.message);
                           socket.emit("terminal:error", error.message);
                           io.to(roomId).emit("terminal:status", { isRunning: false });
                       }
              });

             // 3. ANY collaborator in the room types in xterm.js
             socket.on("terminal:input", ({ roomId, data }) => {
                      // Passes keystrokes to the room's running Docker container
                      terminalManager.handleInput(roomId, data);
             });

             // 4. User resizes panel
             socket.on('terminal:resize', ({ roomId, cols, rows }) => {
                 terminalManager.handleResize(roomId, { cols, rows });
             });

             // 5. User clicks "Stop" button (Kills infinite loops)
             socket.on('terminal:stop', ({ roomId }) => {
                 terminalManager.killSession(roomId);
                 io.to(roomId).emit('terminal:status', { isRunning: false });
             });

             // 6. User disconnects / closes tab
             socket.on("disconnecting", () => {
                    for (const roomId of socket.rooms) {
                            if (roomId === socket.id) continue;
                            const roomSockets = io.sockets.adapter.rooms.get(roomId);
                            if (roomSockets && roomSockets.size <= 1) {
                                  console.log(`Room "${roomId}" is now empty. Killing container...`);
                                  terminalManager.killSession(roomId);
                            }
                    }
             });

      })
}