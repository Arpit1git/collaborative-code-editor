
/**
 * terminalManager.js
 * Manages interactive Docker pseudo-terminals keyed by roomId.
 * Acts as a single-execution lock per collaborative room.
 */

import fs from 'fs/promises';
import path from 'path';
import pty from 'node-pty';
import { getLanguageConfig } from './commandBuilder.js';


const spawnPty = pty.spawn || pty.default?.spawn || pty;

class TerminalManager {

       constructor(){
           // Map: roomId -> { ptyProcess, jobDir, timeoutTimer, history }
           this.activeSession = new Map();
           // Map: roomId -> string (stores terminal output even after container exits)
           this.roomHistory = new Map();
           this.Session_TimeOut = 5*60*1000;
       }

        // Spawns an interactive Docker container for a collaborative room
     
       isRoomRunning(roomId){
              return this.activeSession.has(roomId);
       }

       clearHistory(roomId) {
           this.roomHistory.set(roomId, "");
       }

       async createSession({roomId,language,content,onData,onExit})
       {

              if(this.isRoomRunning(roomId))
              {
                     throw new Error("Code is already running in this room. Please wait or stop the current execution.")
              }

              // Reset old history for a brand new run
              this.clearHistory(roomId);

              const {fileName,command} = getLanguageConfig(language,content);

              const jobDir = path.resolve(process.cwd(), "temp_job", `roomId_${roomId}`);

              await fs.mkdir(jobDir, { recursive: true });

              const filePath = path.join(jobDir, fileName);
              await fs.writeFile(filePath, content || "", 'utf-8');

              
              console.log(`[TerminalManager] Spawning Docker for Room "${roomId}" with language "${language}"...`);
        // 5. Construct Docker interactive run arguments
             const dockerArgs = 
             [
            'run',
            '-it',                  // Allocate pseudo-TTY & keep stdin open
            '--rm',                 // Automatically clean up container on exit
            '--memory=256m',        // Memory cap (prevent crashing host)
            '--cpus=1.0',           // CPU cap
            '--pids-limit=100',     // Prevent fork bombs
            '--network', 'none',    // Security: Disallow outbound internet access
            '-v', `${jobDir}:/app`, // Mount host temp directory to container /app
            '-w', '/app',           // Set working directory inside container
            'code-sandbox',         // Your existing Docker image
            ...command
             ];


           const ptyProcess = spawnPty('docker', dockerArgs, {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: jobDir,
            env: process.env
        });

         // 7. Auto-cleanup timer (kills infinite loops / abandoned runs)

         const timeoutTimer = setTimeout(()=>{
               console.warn(`[TerminalManager] Room "${roomId}" exceeded max execution time. Terminating...`);
               if (onData) onData("\r\n\x1b[31m[Execution Timed Out (5 min limit)]\x1b[0m\r\n");
               this.killSession(roomId);
         },this.Session_TimeOut);
         

          // 8. Register Session in Map

         this.activeSession.set(roomId,{
              ptyProcess,
              jobDir,
              timeoutTimer,
              history:"",
         });

          // 9. Stream container output to callback

          ptyProcess.onData((data)=>{
               // Persist output to room history (capped at 50,000 characters)
               const prevHistory = this.roomHistory.get(roomId) || "";
               this.roomHistory.set(roomId, (prevHistory + data).slice(-50000));

               const session = this.activeSession.get(roomId);
               if(session)
               {
                      session.history = (session.history + data).slice(-20000);
               }

                if (onData) onData(data);
          });

           // 10. Handle container exit

           ptyProcess.onExit(({exitCode})=>{
              console.log(`[TerminalManager] Process in Room "${roomId}" exited with code: ${exitCode}`);
              this.cleanupDisk(jobDir);
              this.activeSession.delete(roomId);
              clearTimeout(timeoutTimer);
             if (onExit) onExit(exitCode);
           })

           return ptyProcess;
       }

       //   Forwards keystrokes from any collaborator in the room to Docker


      handleInput(roomId,data)
      {

           const session = this.activeSession.get(roomId);
           if(session?.ptyProcess)
           {
               session.ptyProcess.write(data);
           }
      }

     //   Synchronizes terminal dimensions (cols & rows) to Docker via SIGWINCH
      handleResize(roomId, { cols, rows }) {
        const session = this.activeSession.get(roomId);
        if (session?.ptyProcess && cols && rows) {
            try {
                session.ptyProcess.resize(Number(cols), Number(rows));
            } catch (err) {
                console.error(`[TerminalManager] Resize error for room ${roomId}:`, err.message);
            }
        }
    }

      //  Retrieves recent terminal output history for newly joined collaborators
       getHistory(roomId)
       {
              return this.roomHistory.get(roomId) || this.activeSession.get(roomId)?.history || "";
       }


      // Terminates the active container for a room and frees all resources

       killSession(roomId)
       {
               const session = this.activeSession.get(roomId);

               if(!session)
               {
                     return false;
               }

               console.log(`[TerminalManager] Manually killing session for Room "${roomId}"`);

               clearTimeout(session.timeoutTimer);

              // Kill the PTY process (which terminates Docker)

              try {
                     session.ptyProcess.kill();
              } catch (error) {
                      console.error(`[TerminalManager] Kill process error:`, error.message);
              }

              // Clean up directory
              
              this.cleanupDisk(session.jobDir);
              this.activeSession.delete(roomId) ;
              return true;

             
       }

        //  Deletes temporary job files from host disk


        async cleanupDisk(jobDir)
        {
            try {
                await fs.rm(jobDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
            } catch (error) {
                // Ignore if locked momentarily
            }
        }

       
}



export const terminalManager = new TerminalManager();