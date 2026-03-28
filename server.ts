import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import fs from "fs";
import { biometricServerService } from "./services/biometricServerService";
import { supabase } from "./services/supabaseClient";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Create an HTTPS agent that ignores self-signed certificate errors
// This is crucial for biometric devices/APIs that often use self-signed certs
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Log Supabase connection status on startup
if (supabase) {
  console.log("Supabase client initialized successfully.");
} else {
  console.warn("Supabase client failed to initialize. Check your environment variables (SUPABASE_URL, SUPABASE_KEY or VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).");
}

app.use(cors());
app.use(express.json());

// Trust proxy to get the correct client IP when behind Cloudflare/Coolify
app.set('trust proxy', true);

// Biometric API Proxy
app.post("/api/biometric-proxy", async (req, res) => {
  const { url, method, headers, body } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    console.log(`Proxying ${method || "GET"} to ${url}`);
    
    // Sanitize headers to prevent Host/Origin mismatch issues on the target server
    const sanitizedHeaders = { ...headers };
    delete sanitizedHeaders.host;
    delete sanitizedHeaders.origin;
    delete sanitizedHeaders.referer;
    delete sanitizedHeaders.connection;
    delete sanitizedHeaders['accept-encoding'];
    
    // Remove Cloudflare specific headers before forwarding to the biometric device
    // The device doesn't need these and they might cause issues
    delete sanitizedHeaders['cf-connecting-ip'];
    delete sanitizedHeaders['cf-ipcountry'];
    delete sanitizedHeaders['cf-ray'];
    delete sanitizedHeaders['cf-visitor'];
    delete sanitizedHeaders['x-forwarded-proto'];
    delete sanitizedHeaders['x-forwarded-for'];

    const response = await axios({
      url,
      method: method || "GET",
      headers: sanitizedHeaders,
      data: method && method !== "GET" ? body : undefined,
      timeout: 15000, // 15 second timeout to prevent hanging the Coolify container
      httpsAgent, // Ignore self-signed certs
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    
    // Handle specific network errors (e.g., timeout, connection refused)
    let data = error.response?.data;
    if (!data) {
      if (error.code === 'ECONNABORTED') {
        data = { error: "Connection to biometric API timed out after 15 seconds." };
      } else if (error.code === 'ECONNREFUSED') {
        data = { error: "Connection refused by biometric API. Is the device online?" };
      } else {
        data = { error: error.message || "Unknown network error occurred." };
      }
    }
    
    // Reduce noise for 404s and 405s as they are often part of endpoint discovery
    if (status === 404 || status === 405) {
      console.log(`Proxy ${status}: ${url}`);
      res.status(status).json(data);
    } else if (status === 400 && JSON.stringify(data).includes('already in progress')) {
      // Suppress the "Command already in progress" error as it's expected when fetching logs frequently
      // Return 200 OK so the client doesn't throw an exception
      console.log(`Proxy warning (${status}) for ${url}: Command already in progress`);
      res.status(200).json({ success: true, message: "Command already in progress" });
    } else {
      console.error(`Proxy error (${status}) for ${url}:`, JSON.stringify(data));
      res.status(status).json(data);
    }
  }
});

// Manual Sync Endpoint
app.post("/api/sync-biometric", async (req, res) => {
  try {
    await biometricServerService.fetchAndSyncLogs();
    res.json({ status: "success", message: "Biometric sync triggered" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Background Task: Sync biometric logs every 5 minutes
// Note: This will only work in persistent environments (not Vercel)
if (process.env.NODE_ENV !== "production" || process.env.ENABLE_BACKGROUND_SYNC === "true") {
  setInterval(async () => {
    console.log("Running scheduled biometric sync...");
    try {
      await biometricServerService.fetchAndSyncLogs();
    } catch (error) {
      console.error("Scheduled biometric sync failed:", error);
    }
  }, 5 * 60 * 1000);

  // Initial sync on startup
  setTimeout(() => {
    console.log("Running initial biometric sync...");
    biometricServerService.fetchAndSyncLogs().catch(console.error);
  }, 5000);
}

// Vite middleware for development
async function setupVite(app: any) {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, skipping middleware setup.");
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      
      if (fs.existsSync(indexPath)) {
        let content = fs.readFileSync(indexPath, 'utf8');
        
        // Inject runtime environment variables
        const runtimeEnv = {
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.API_KEY
        };
        
        console.log("--- RUNTIME ENV INJECTION ---");
        console.log("VITE_SUPABASE_URL:", runtimeEnv.VITE_SUPABASE_URL ? `Found (${runtimeEnv.VITE_SUPABASE_URL.substring(0, 15)}...)` : "MISSING");
        console.log("VITE_SUPABASE_ANON_KEY:", runtimeEnv.VITE_SUPABASE_ANON_KEY ? "Found (HIDDEN)" : "MISSING");
        console.log("GEMINI_API_KEY:", runtimeEnv.GEMINI_API_KEY ? "Found (HIDDEN)" : "MISSING");
        console.log("-----------------------------");
        
        const injection = `
          window.env = ${JSON.stringify(runtimeEnv)};
          if (window.process && window.process.env) {
            Object.assign(window.process.env, ${JSON.stringify(runtimeEnv)});
          }
        `;
        
        content = content.replace('/* RUNTIME_ENV_INJECTION */', injection);
        res.send(content);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }
}

async function startServer() {
  await setupVite(app);

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;
