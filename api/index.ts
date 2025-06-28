// api/index.ts
import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";  // import ESTÁTICO

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// logging opcional de cada request
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// montar todas las rutas definidas en server/routes.ts
registerRoutes(app);

// middleware global de captura de errores
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API] Error capturado en middleware:", err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

export default app;
