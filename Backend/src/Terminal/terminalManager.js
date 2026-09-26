/**
 * terminalManager.js
 * Manages interactive pseudo-terminals keyed by roomId.
 * Acts as a single-execution lock per collaborative room.
 */

import fs from 'fs/promises';
import path from 'path';
import pty from 'node-pty';
import { getLanguageConfig } from './commandBuilder.js';

const spawnPty = pty.spawn || pty.default?.spawn || pty;

class TerminalManager {

    constructor() {
        // Map: roomId -> { ptyProcess, jobDir, timeoutTimer, history, totalOutputLength }
        this.activeSession = new Map();
        // Map: roomId -> string (stores terminal output even after process exits)
        this.roomHistory = new Map();
        // 20-second execution time limit (TLE protection)
        this.Session_TimeOut = 20 * 1000;
        // 50KB max output limit (prevents infinite print loop DOS)
        this.MAX_OUTPUT_LIMIT = 50 * 1024;
    }

    // Checks if a collaborative room currently has an active execution
    isRoomRunning(roomId) {
        if (!roomId) return false;
        const strId = roomId.toString();
        return this.activeSession.has(strId) || this.activeSession.has(roomId);
    }

    clearHistory(roomId) {
        if (!roomId) return;
        this.roomHistory.set(roomId.toString(), "");
    }

    async createSession({ roomId, language, content, onData, onExit }) {
        const roomKey = (roomId || 'default_room').toString();

        if (this.isRoomRunning(roomKey)) {
            throw new Error("Code is already running in this room. Please wait or stop the current execution.");
        }

        // Reset old history for a brand new run
        this.clearHistory(roomKey);

        const { fileName, command } = getLanguageConfig(language, content);

        const jobDir = path.resolve(process.cwd(), "temp_job", `roomId_${roomKey}`);

        await fs.mkdir(jobDir, { recursive: true });

        const filePath = path.join(jobDir, fileName);
        await fs.writeFile(filePath, content || "", 'utf-8');

        console.log(`[TerminalManager] Executing process for Room "${roomKey}" with language "${language}"...`);

        const isWin = process.platform === 'win32';
        const shell = isWin ? (process.env.ComSpec || 'cmd.exe') : 'bash';
        const shellArgs = isWin ? ['/c', command] : ['-c', command];

        let ptyProcess;
        try {
            // Spawn shell directly in the isolated jobDir
            ptyProcess = spawnPty(shell, shellArgs, {
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: jobDir,
                env: { ...process.env, PATH: process.env.PATH }
            });
        } catch (spawnError) {
            console.error(`[TerminalManager] Fatal error spawning node-pty for room ${roomKey}:`, spawnError);
            await this.cleanupDisk(jobDir);
            throw new Error(`Failed to start terminal process: ${spawnError.message}`);
        }

        // Auto-cleanup timer (kills infinite loops / abandoned runs after 20s)
        const timeoutTimer = setTimeout(() => {
            console.warn(`[TerminalManager] Room "${roomKey}" exceeded max execution time. Terminating...`);
            if (onData) onData("\r\n\x1b[31;1m[Time Limit Exceeded (20s limit): Process Terminated]\x1b[0m\r\n");
            this.killSession(roomKey);
        }, this.Session_TimeOut);

        // Register Session in Map
        this.activeSession.set(roomKey, {
            ptyProcess,
            jobDir,
            timeoutTimer,
            history: "",
            totalOutputLength: 0,
            isExited: false
        });

        if (ptyProcess.on) {
            ptyProcess.on('error', (err) => {
                const session = this.activeSession.get(roomKey);
                // Ignore pipe close / EOF errors that happen after process has already started/exited
                if (session?.isExited || (session && session.totalOutputLength > 0)) {
                    return;
                }
                console.error(`[PTY Error in Room ${roomKey}]:`, err);
                if (onData) onData(`\r\n\x1b[31m[System Error: Failed to start execution process]\x1b[0m\r\n`);
                this.killSession(roomKey);
            });
        }

        // Stream container output to callback
        ptyProcess.onData((data) => {
            const session = this.activeSession.get(roomKey);
            if (!session) return;

            session.totalOutputLength += (data ? data.length : 0);

            // Infinite print loop protection: kill if output exceeds 50KB
            if (session.totalOutputLength > this.MAX_OUTPUT_LIMIT) {
                console.warn(`[TerminalManager] Room "${roomKey}" exceeded max output limit (${this.MAX_OUTPUT_LIMIT} bytes). Terminating...`);
                if (onData) onData("\r\n\x1b[31;1m\r\n[Process Terminated: Output Limit Exceeded (50KB) - Infinite Loop Detected]\x1b[0m\r\n");
                this.killSession(roomKey);
                return;
            }

            const prevHistory = this.roomHistory.get(roomKey) || "";
            this.roomHistory.set(roomKey, (prevHistory + data).slice(-50000));
            session.history = (session.history + data).slice(-20000);

            if (onData) onData(data);
        });

        // Handle process exit
        ptyProcess.onExit(({ exitCode }) => {
            console.log(`[TerminalManager] Process in Room "${roomKey}" exited with code: ${exitCode}`);
            const session = this.activeSession.get(roomKey);
            if (session) {
                session.isExited = true;
            }
            if (onData) {
                onData(`\r\n\x1b[90m\r\n[Process completed with exit code ${exitCode}]\x1b[0m\r\n`);
            }
            this.cleanupDisk(jobDir);
            this.activeSession.delete(roomKey);
            clearTimeout(timeoutTimer);
            if (onExit) onExit(exitCode);
        });

        return ptyProcess;
    }

    // Forwards keystrokes from any collaborator in the room to the running process
    handleInput(roomId, data) {
        const roomKey = (roomId || '').toString();
        let session = this.activeSession.get(roomKey);
        
        // Fallback: if room IDs had a slight mismatch (e.g. child fileId vs parent projectId), route to active session
        if (!session && this.activeSession.size === 1) {
            session = this.activeSession.values().next().value;
        }

        if (session?.ptyProcess) {
            session.ptyProcess.write(data);
        }
    }

    // Synchronizes terminal dimensions (cols & rows) via SIGWINCH
    handleResize(roomId, { cols, rows }) {
        const roomKey = (roomId || '').toString();
        let session = this.activeSession.get(roomKey);
        
        if (!session && this.activeSession.size === 1) {
            session = this.activeSession.values().next().value;
        }

        if (session?.ptyProcess && cols && rows) {
            try {
                session.ptyProcess.resize(Number(cols), Number(rows));
            } catch (err) {
                console.error(`[TerminalManager] Resize error for room ${roomId}:`, err.message);
            }
        }
    }

    // Retrieves recent terminal output history for newly joined collaborators
    getHistory(roomId) {
        const roomKey = (roomId || '').toString();
        return this.roomHistory.get(roomKey) || this.activeSession.get(roomKey)?.history || "";
    }

    // Terminates the active process for a room and frees all resources
    killSession(roomId) {
        const roomKey = (roomId || '').toString();
        let session = this.activeSession.get(roomKey);
        let actualKey = roomKey;

        if (!session && this.activeSession.size === 1) {
            const [key, value] = this.activeSession.entries().next().value;
            session = value;
            actualKey = key;
        }

        if (!session) {
            return false;
        }

        console.log(`[TerminalManager] Manually killing session for Room "${actualKey}"`);

        clearTimeout(session.timeoutTimer);

        try {
            session.ptyProcess.kill();
        } catch (error) {
            console.error(`[TerminalManager] Kill process error:`, error.message);
        }

        this.cleanupDisk(session.jobDir);
        this.activeSession.delete(actualKey);
        return true;
    }

    // Deletes temporary job files from host disk
    async cleanupDisk(jobDir) {
        try {
            await fs.rm(jobDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
        } catch (error) {
            // Ignore if locked momentarily
        }
    }
}

export const terminalManager = new TerminalManager();