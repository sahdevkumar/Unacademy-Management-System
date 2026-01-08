import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateSqlQuery = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing. Returning mock data.");
    return "-- API Key missing. Please provide a valid key to generate SQL.\nSELECT * FROM users WHERE active = true;";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert PostgreSQL database administrator. 
      Generate a valid SQL query based on the following natural language request. 
      Only return the SQL code, no markdown formatting or explanation.
      
      Request: ${prompt}`,
    });

    return response.text.replace(/```sql/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error("Error generating SQL:", error);
    return "-- Error generating query. Please try again.";
  }
};