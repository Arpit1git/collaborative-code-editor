import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Worker } from 'bullmq';
import { redisConnection } from './connection_queue.js';

const execPromise = promisify(exec);

const worker = new Worker('code-execution-queue', async (job) => {
    // 1. Grab customInput, defaulting to an empty string if undefined
    const { jobId, language, content, customInput = "" } = job.data;
    const normalizedLang = (language || "").toLowerCase().trim();
    
    console.log(`[Worker] Picked up Job: ${jobId}`);
    console.log(`[Worker] Language: ${normalizedLang}`);

    const fileExtension = (normalizedLang === 'cpp' || normalizedLang === 'c++') ? 'cpp' 
        : normalizedLang === 'c' ? 'c' 
        : normalizedLang === 'javascript' || normalizedLang === 'js' ? 'js' 
        : normalizedLang === 'python' || normalizedLang === 'py' ? 'py' 
        : normalizedLang === 'java' ? 'java' 
        : 'txt';

    // 2. Create a unique isolated directory for this specific job to prevent race conditions
    const jobDir = path.join(process.cwd(), 'tempJobs', jobId);
    await fs.mkdir(jobDir, { recursive: true });

    // 3. Set standard filenames inside the isolated folder
    const fileName = `code.${fileExtension}`;
    const filePath = path.join(jobDir, fileName);
    const inputFilePath = path.join(jobDir, 'input.txt');

    // 4. Write both the code and the input to the hard drive
    await fs.writeFile(filePath, content || "");
    await fs.writeFile(inputFilePath, customInput || "");

    let command = "";
    let finalOutput = "";

    try {
        // 5. Mount the entire jobDir to /app and run execution with input redirection (< input.txt)
        // Note: Using -w /app sets the working directory inside the container
        
        if (normalizedLang === 'javascript' || normalizedLang === 'js') {
            command = `docker run --rm --memory="256m" --network none -v "${jobDir}:/app" -w /app code-sandbox sh -c "node code.js < input.txt"`;
            
        } else if (normalizedLang === 'python' || normalizedLang === 'py') {
            command = `docker run --rm --memory="256m" --network none -v "${jobDir}:/app" -w /app code-sandbox sh -c "python3 -u code.py < input.txt"`;
            
        } else if (normalizedLang === 'java') {
            command = `docker run --rm --memory="256m" --network none -v "${jobDir}:/app" -w /app code-sandbox sh -c "java code.java < input.txt"`;
            
        } else if (normalizedLang === 'cpp' || normalizedLang === 'c++') {
            command = `docker run --rm --memory="256m" --network none -v "${jobDir}:/app" -w /app code-sandbox sh -c "rm -f /tmp/a.out && g++ code.cpp -o /tmp/a.out && /tmp/a.out < input.txt"`;
            
        } else if (normalizedLang === 'c') {
            command = `docker run --rm --memory="256m" --network none -v "${jobDir}:/app" -w /app code-sandbox sh -c "rm -f /tmp/a.out && gcc code.c -o /tmp/a.out && /tmp/a.out < input.txt"`;

        } else {
            throw new Error(`Language "${language}" not supported yet`);
        }

        const { stdout, stderr } = await execPromise(command, { timeout: 10000 });
        finalOutput = stdout || stderr;
        
    } catch (execError) {
        finalOutput = "Runtime Error:\n" + (execError.stderr || execError.message);
    } finally {
        // 6. Cleanup: Delete the entire unique job folder
        await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    }

    console.log(`[Worker] Finished processing Job: ${jobId}`);
    return finalOutput;
    
}, { connection: redisConnection });

worker.on('completed', (job, returnvalue) => {
    console.log(`Job ${job.id} completed! Output:\n`, returnvalue);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error:`, err.message);
});