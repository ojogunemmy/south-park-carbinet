import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import employeeRoutes from "./routes/employees";
import contractRoutes from "./routes/contracts";
import billRoutes from "./routes/bills";
import paymentRoutes from "./routes/payments";
import profileRoutes from "./routes/profiles";
import materialRoutes from "./routes/materials";
import settingsRoutes from "./routes/settings";
import absenceRoutes from "./routes/absences";
import { authMiddleware } from "./middleware/auth";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use("/api/employees", authMiddleware, employeeRoutes);
  app.use("/api/contracts", authMiddleware, contractRoutes);
  app.use("/api/bills", authMiddleware, billRoutes);
  app.use("/api/payments", authMiddleware, paymentRoutes);
  app.use("/api/profiles", authMiddleware, profileRoutes);
  app.use("/api/materials", authMiddleware, materialRoutes);
  app.use("/api/settings", authMiddleware, settingsRoutes);
  app.use("/api/absences", authMiddleware, absenceRoutes);

  // Ping route
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("EXPRESS ERROR:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  return app;
}
