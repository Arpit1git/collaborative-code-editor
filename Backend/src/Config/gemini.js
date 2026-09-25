import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn(" [Gemini Config] GEMINI_API_KEY is not set in environment variables.");
}

export const ai = new GoogleGenAI({
    apiKey: apiKey || ""
});
