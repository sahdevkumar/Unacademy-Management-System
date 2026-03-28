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

// Debug endpoint to check environment variable availability (keys only for security)
app.get("/api/debug-env", (req, res) => {
  const envKeys = Object.keys(process.env);
  const supabaseKeys = envKeys.filter(key => 
    key.includes('SUPABASE') || 
    key.includes('GEMINI') || 
    key.includes('API_KEY')
  );
  
  const values_check: Record<string, string> = {};
  ['VITE_SUPABASE_URL', 'SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_KEY', 'SUPABASE_ANON_KEY'].forEach(key => {
    const val = process.env[key];
    if (!val) values_check[key] = 'MISSING';
    else if (val === 'undefined') values_check[key] = 'STRING_UNDEFINED';
    else if (val === 'null') values_check[key] = 'STRING_NULL';
    else if (val.trim() === '') values_check[key] = 'EMPTY_STRING';
    else values_check[key] = `PRESENT (${val.length} chars)`;
  });

  res.json({
    node_env: process.env.NODE_ENV,
    detected_keys: supabaseKeys,
    values_check,
    timestamp: new Date().toISOString(),
    tip: "If your keys are missing, ensure they are in the 'Environment Variables' tab in Coolify (not 'Build Variables') and that you have RESTARTED the container."
  });
});

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
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite dev middleware initialized.");
      return;
    } catch (e) {
      console.warn("Vite not found or failed to load, falling back to static serving.");
    }
  }

  // Production static serving with environment injection
  const distPath = path.join(process.cwd(), 'dist');
  console.log(`Serving production build from: ${distPath}`);
  
  // Disable default index serving so we can intercept it and inject environment variables
  app.use(express.static(distPath, { index: false }));
  
  app.get('*all', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    
    // Set headers to prevent caching of index.html to ensure environment variables are always fresh
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (fs.existsSync(indexPath)) {
      try {
        let content = fs.readFileSync(indexPath, 'utf8');
        
        // Inject runtime environment variables
        const getEnvVar = (key: string, fallback?: string) => {
          const val = process.env[key];
          if (val && val !== 'undefined' && val !== 'null' && val.trim() !== '') return val;
          if (fallback) {
            const fallbackVal = process.env[fallback];
            if (fallbackVal && fallbackVal !== 'undefined' && fallbackVal !== 'null' && fallbackVal.trim() !== '') return fallbackVal;
          }
          return undefined;
        };

        const runtimeEnv = {
          VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL', 'SUPABASE_URL'),
          VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY', 'SUPABASE_KEY') || process.env.SUPABASE_ANON_KEY,
          GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY', 'API_KEY')
        };
        
        console.log(`[${new Date().toISOString()}] Injecting runtime env for request: ${req.url}`);
        console.log(`Detected URL: ${runtimeEnv.VITE_SUPABASE_URL ? 'YES' : 'NO'}`);
        console.log(`Detected KEY: ${runtimeEnv.VITE_SUPABASE_ANON_KEY ? 'YES' : 'NO'}`);
        
        const injectionScript = `
<script id="runtime-env">
  window.env = ${JSON.stringify(runtimeEnv)};
  if (window.process && window.process.env) {
    Object.assign(window.process.env, ${JSON.stringify(runtimeEnv)});
  }
  console.log("Runtime environment injected successfully.");
</script>`;
        
        // Try multiple injection points to be safe
        if (content.includes('</head>')) {
          content = content.replace('</head>', `${injectionScript}\n</head>`);
        } else if (content.includes('/* RUNTIME_ENV_INJECTION */')) {
          content = content.replace('/* RUNTIME_ENV_INJECTION */', injectionScript);
        } else {
          // Fallback: just append to the end of the file if no head tag found
          content = content + injectionScript;
        }
        
        res.status(200).set('Content-Type', 'text/html').send(content);
      } catch (err) {
        console.error("Error reading or processing index.html:", err);
        res.status(500).send("Internal Server Error");
      }
    } else {
      console.warn(`index.html not found at ${indexPath}. Ensure you have run 'npm run build'.`);
      res.status(404).send('Frontend build not found. Please run build first.');
    }
  });
}

async function startServer() {
  await setupVite(app);

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;
