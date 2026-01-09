import { GoogleGenAI } from "@google/genai";

// Helper to safely get environment variables
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Check for Vite-style env vars just in case
  try {
     const meta = import.meta as any;
     if (meta && meta.env && meta.env[key]) return meta.env[key];
  } catch (e) {
      // Ignore
  }
  return '';
};

const apiKey = getEnv('API_KEY') || getEnv('VITE_API_KEY') || getEnv('NEXT_PUBLIC_API_KEY');

// Initialize AI only if we have a key or let it fail gracefully later
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });

export const generateSqlQuery = async (prompt: string): Promise<string> => {
  if (!apiKey || apiKey === 'dummy-key-to-prevent-crash') {
    console.warn("API Key is missing. Returning mock data.");
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));
    return `-- API Key missing. Please provide a valid key in .env to generate SQL.
-- Example Query based on your request: "${prompt}"
SELECT * FROM public.users WHERE created_at > NOW() - INTERVAL '7 days';`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert PostgreSQL database administrator. 
      Generate a valid SQL query based on the following natural language request. 
      Only return the SQL code, no markdown formatting or explanation.
      
      Request: ${prompt}`,
    });

    if (response.text) {
        return response.text.replace(/```sql/g, '').replace(/```/g, '').trim();
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Error generating SQL:", error);
    return `-- Error generating query: ${error instanceof Error ? error.message : String(error)}
-- Please check your API key and connection.`;
  }
};