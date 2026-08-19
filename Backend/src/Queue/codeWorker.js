import { Worker } from "bullmq";
import { redisConnection } from "./connection_queue";

const worker = new worker('code-execution-queue',async(job)=>{
    const {jobId,language,content} = job.data;

    console.log(`[Worker] Picked up Job: ${jobId}`);
    console.log(`[Worker] Language: ${language}`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`[Worker] Finished processing Job: ${jobId}`);
    return `Simulated successful output for ${language}`;


},{connection:redisConnection});


worker.on('completed', (job, returnvalue) => {
    console.log(`Job ${job.id} completed! Output:`, returnvalue);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error:`, err.message);
});