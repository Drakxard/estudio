import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loadExercisesFromFiles } from "./services/exerciseParser";
import { callGroqAPI } from "./services/groqApi";
import { insertResponseSchema, insertSettingsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize exercises on startup
  try {
    await loadExercisesFromFiles();
  } catch (error) {
    console.error("Failed to load exercises:", error);
  }

  // Get all exercises
  app.get("/api/exercises", async (req, res) => {
    try {
      const exercises = await storage.getExercises();
      res.json(exercises);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  // Get exercises by section
  app.get("/api/exercises/section/:sectionId", async (req, res) => {
    try {
      const sectionId = parseInt(req.params.sectionId);
      const exercises = await storage.getExercisesBySection(sectionId);
      res.json(exercises);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exercises for section" });
    }
  });

  // Get specific exercise
  app.get("/api/exercises/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const exercise = await storage.getExercise(id);
      if (!exercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      res.json(exercise);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exercise" });
    }
  });

  // Save response
  app.post("/api/responses", async (req, res) => {
    try {
      const validatedData = insertResponseSchema.parse(req.body);
      const response = await storage.createOrUpdateResponse(validatedData);
      res.json(response);
    } catch (error) {
      res.status(400).json({ error: "Invalid response data" });
    }
  });

  // Get response for exercise
  app.get("/api/responses/:exerciseId", async (req, res) => {
    try {
      const exerciseId = parseInt(req.params.exerciseId);
      const response = await storage.getResponse(exerciseId);
      res.json(response || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch response" });
    }
  });

  // Get settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update settings
  app.patch("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: "Invalid settings data" });
    }
  });

  // Get AI response for exercise
  app.post("/api/ai/response", async (req, res) => {
    try {
      const { exerciseText, apiKey } = req.body;
      
      if (!exerciseText) {
        return res.status(400).json({ error: "Exercise text is required" });
      }
      
      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      const response = await callGroqAPI(
        `Por favor, resuelve el siguiente ejercicio de matemáticas paso a paso:\n\n${exerciseText}`,
        apiKey
      );
      
      res.json({ response });
    } catch (error) {
      console.error("AI response error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
