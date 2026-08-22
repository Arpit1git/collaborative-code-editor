
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Worker } from 'bullmq';
import { redisConnection } from './connection_queue.js';

const execPromise = promisify(exec);

const worker = new Worker('code-execution-queue', async (job) => {
    const { jobId, language, content } = job.data;
    
    console.log(`[Worker] Picked up Job: ${jobId}`);
    console.log(`[Worker] Language: ${language}`);


    const fileExtension = language === 'cpp'?'cpp':language === 'javaScript'?'js':language=='python'?'py':language==='java'?'java':'txt'

    const fileName = `${jobId}.${fileExtension}`;
    const filePath = path.join(process.cwd(),fileName);
  

    await fs.writeFile(filePath,content);

    let command = "";
    let finalOutput = "";

    try {

        if(language==='javaScript'){

            command = `docker run --rm --memory="256m" --network none -v "${filePath}:/app/code.js" code-sandbox node /app/code.js`;

        }else if(language === 'python'){

            command = `docker run --rm --memory="256m" --network none -v "${filePath}:/app/code.py" code-sandbox python3 /app/code.py`;

        }else if(language === 'java'){

             command = `docker run --rm --memory="256m" --network none -v "${filePath}:/app/code.java" code-sandbox java /app/code.java`;

        }else if(language == 'cpp'){
             
                command = `docker run --rm --memory="256m" --network none -v "${filePath}:/app/code.cpp" code-sandbox sh -c "g++ /app/code.cpp -o /app/a.out && /app/a.out"`

        }else{
            return "Language not supported yet";
        }

        const {stdout,stderr} = await execPromise(command,{timeout:10000});

        finalOutput = stdout || stderr
        
    } catch (execError) {
        finalOutput = "Runtime Error:\n" + (execError.stderr || execError.message);
    }finally{
         await fs.unlink(filePath).catch(() => {});
       
    }

    console.log(`[Worker] Finished processing Job: ${jobId}`);
    
   
    return finalOutput;

    
}, { connection: redisConnection });

worker.on('completed', (job, returnvalue) => {
    console.log(`Job ${job.id} completed! Output:`, returnvalue);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error:`, err.message);
});