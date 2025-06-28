// server/index.ts
import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging de rendimiento para rutas /api
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJson: any;

  const originalJson = res.json;
  res.json = (body) => {
    capturedJson = body;
    return originalJson.call(res, body);
  };

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      let line = `${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`;
      if (capturedJson) {
        line += ` :: ${JSON.stringify(capturedJson)}`.slice(0, 80) + "…";
      }
      log(line);
    }
  });

  next();
});

(async () => {
  const isDev = process.env.NODE_ENV === "development";

  // Registrar rutas de tu API (devuelve el servidor HTTP interno de Vite en dev)
  const server = await registerRoutes(app);

  // Middleware global de errores
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
    throw err;
  });

  if (isDev) {
    // En desarrollo, arranca Vite + HTTP server
    await setupVite(app, server);
    server.listen(5000, () => log("Dev server listening on http://localhost:5000"));
  } else {
    // En producción (Vercel), no arrancamos listen(), solo servimos estáticos
    serveStatic(app);
  }
})();

// Exporta la app para Vercel
export default app;
