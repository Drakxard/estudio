// api/index.ts
import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// no incluyas setupVite ni serveStatic: Vercel se encarga de lo estático
app.use((req: Request, res: Response, next: NextFunction) => {
  /* tu middleware de logging aquí si quieres */
  next();
});

// registra solo las rutas de API
await registerRoutes(app);

// manejo de errores simple
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

// Exportamos el `app` para Vercel
export default app;
