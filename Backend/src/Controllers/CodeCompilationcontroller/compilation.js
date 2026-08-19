import { codeQueue } from '../../Queue/codeQueue.js'; 
import { QueueEvents } from 'bullmq';
import { redisConnection } from '../../Queue/connection_queue.js';

// This listens to Redis to know exactly when the background Worker finishes cooking
const queueEvents = new QueueEvents('code-execution-queue', { connection: redisConnection });

export const compileFile = async (req, res) => {
    try {
        const { content, language } = req.body;

        if (!content || !language) {
            return res.status(400).json({
                success: false,
                message: "Content and language Required."
            });
        }

        // Generate a unique ID for the ticket
        const jobId = `job_${Date.now()}`;

        // 1. Drop the code into the Redis Queue (Hand the ticket to BullMQ)
        const job = await codeQueue.add('compile-job', {
            jobId,
            language,
            content
        });

        console.log(`[API] Job ${job.id} added to queue. Waiting for worker...`);

        // 2. Wait patiently for the background Worker to finish processing
        const result = await job.waitUntilFinished(queueEvents);

        // 3. Send the final result back to the React frontend
        return res.status(200).json({ 
            success: true, 
            output: result 
        });

    } catch (error) {
        console.error("Error while queuing file:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error" 
        });
    }
}