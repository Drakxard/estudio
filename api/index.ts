// api/index.ts
import express, { Request, Response, NextFunction } from "express";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// middleware de logging (opcional)
app.use((req: Request, _res, next: NextFunction) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

let registerRoutes: (app: typeof express) => Promise<void>;
try {
  console.log("[API] Importando rutas desde ../server/routes.ts");
  // Asegúrate de la ruta: si tu carpeta server/routes tiene index.ts, esto carga index
  registerRoutes = (await import("../server/routes.ts")).registerRoutes;
} catch (err: any) {
  console.error("[API] Falló al importar ../server/routes.ts:", err);
  throw err;  // aborta el despliegue mostrando la traza completa
}

try {
  console.log("[API] Registrando rutas");
  await registerRoutes(app);
  console.log("[API] Rutas registradas exitosamente");
} catch (err: any) {
  console.error("[API] Error al ejecutar registerRoutes():", err);
  // deja que el handler de errores capture y responda 500
  throw err;
}

// manejo de errores simple
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API] Error capturado en middleware:", err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

export default app;
