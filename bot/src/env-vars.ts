import dotenv from 'dotenv';
dotenv.config()

export const envVars = process.env as Record<string, string>
