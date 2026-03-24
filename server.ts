import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { biometricServerService } from "../services/biometricServerService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Biometric API Proxy
app.post("/api/biometric-proxy", async (req, res) => {
  const { url, method, headers, body } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    console.log(`Proxying ${method || "GET"} to ${url}`);
    const response = await axios({
      url,
      method: method || "GET",
      headers: {
        ...headers,
        host: undefined,
      },
      data: method && method !== "GET" ? body : undefined,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: error.message };
    
    // Reduce noise for 404s and 405s as they are often part of endpoint discovery
    if (status === 404 || status === 405) {
      console.log(`Proxy ${status}: ${url}`);
    } else {
      console.error(`Proxy error (${status}):`, JSON.stringify(data));
    }
    
    res.status(status).json(data);
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
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
