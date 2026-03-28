import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import fs from "fs";
import { supabase } from "./services/supabaseClient";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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

// Server-side Supabase health check
app.get("/api/supabase-health", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ 
      status: "error", 
      message: "Supabase client not initialized on server." 
    });
  }

  try {
    const start = Date.now();
    const hasUrl = !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
    const hasKey = !!(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY);

    // Try a simple query with a timeout
    const { data, error } = await Promise.race([
      supabase.from('system_config').select('key').limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Server-side timeout after 10s")), 10000))
    ]) as any;

    const duration = Date.now() - start;

    if (error) {
      console.error("Supabase health check query error:", error);
      return res.status(500).json({ 
        status: "error", 
        message: error.message, 
        code: error.code,
        duration_ms: duration,
        env: { hasUrl, hasKey }
      });
    }

    res.json({ 
      status: "success", 
      message: "Server can reach Supabase", 
      duration_ms: duration,
      url: supabase.supabaseUrl,
      env: { hasUrl, hasKey }
    });
  } catch (error: any) {
    const duration = Date.now() - (typeof start !== 'undefined' ? start : Date.now());
    console.error("Supabase health check exception:", error);
    res.status(500).json({ 
      status: "error", 
      message: error.message || "Unknown server-side error",
      duration_ms: duration
    });
  }
});

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
