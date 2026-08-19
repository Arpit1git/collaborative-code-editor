import {Queue} from "bullmq"
import { redisConnection } from "./connection_queue.js"

export const codeQueue = new Queue('code-execution-queue',{
    connection:redisConnection
})

// export const addCodeToQueue = async(jobId,language,content)=>{
//       await codeQueue.add('compile-job',{jobId,language,content});
//       console.log(`Job ${jobId} added to the queue!`);
// }

