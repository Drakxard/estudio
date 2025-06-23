import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loadExercisesFromFiles } from "./services/exerciseParser";
import { callGroqAPI } from "./services/groqApi";
import { insertResponseSchema, insertSettingsSchema } from "@shared/schema";
import { logger } from "./logger";

// BKT helper functions
function determineSectionDomain(topics: string[], exercises: any[]): string {
  const keywords = {
    'Álgebra': ['ecuación', 'variable', 'polinomio', 'factorización', 'raíz'],
    'Cálculo Diferencial': ['derivada', 'límite', 'continuidad', 'tangente', 'razón de cambio'],
    'Cálculo Integral': ['integral', 'área', 'volumen', 'antiderivada'],
    'Geometría': ['recta', 'círculo', 'triángulo', 'área', 'perímetro', 'coordenadas'],
    'Trigonometría': ['seno', 'coseno', 'tangente', 'ángulo', 'radianes'],
    'Funciones': ['función', 'dominio', 'rango', 'gráfica', 'transformación'],
    'Preparación': ['preparación', 'repaso', 'básico', 'fundamentos']
  };
  
  const allText = [...topics, ...exercises.map(ex => ex.enunciado + ' ' + ex.ejercicio)].join(' ').toLowerCase();
  const scores = new Map<string, number>();
  
  Object.entries(keywords).forEach(([domain, domainKeywords]) => {
    let score = 0;
    domainKeywords.forEach(keyword => {
      const matches = (allText.match(new RegExp(keyword, 'gi')) || []).length;
      score += matches;
    });
    scores.set(domain, score);
  });
  
  const scoresArray = Array.from(scores.values());
  const maxScore = Math.max(...scoresArray);
  const entriesArray = Array.from(scores.entries());
  const bestDomain = entriesArray.find(([_, score]) => score === maxScore);
  
  return bestDomain?.[0] || 'Matemáticas Generales';
}

function determineSectionDifficulty(exercises: any[]): 'basico' | 'intermedio' | 'avanzado' {
  const complexityIndicators = {
    basico: ['calcular', 'encontrar', 'graficar', 'evaluar'],
    intermedio: ['demostrar', 'aplicar', 'resolver', 'analizar'],
    avanzado: ['optimizar', 'integrar', 'derivar', 'modelar']
  };
  
  const allText = exercises.map(ex => ex.enunciado).join(' ').toLowerCase();
  let basicScore = 0, interScore = 0, advScore = 0;
  
  complexityIndicators.basico.forEach(word => {
    basicScore += (allText.match(new RegExp(word, 'gi')) || []).length;
  });
  
  complexityIndicators.intermedio.forEach(word => {
    interScore += (allText.match(new RegExp(word, 'gi')) || []).length;
  });
  
  complexityIndicators.avanzado.forEach(word => {
    advScore += (allText.match(new RegExp(word, 'gi')) || []).length;
  });
  
  if (advScore > interScore && advScore > basicScore) return 'avanzado';
  if (interScore > basicScore) return 'intermedio';
  return 'basico';
}

function calculateBKTProgress(sectionId: number, exercises: any[]): number {
  // Simplified BKT calculation based on exercise complexity and domain
  const baseProgress = 60;
  const domainBonus = exercises.length * 2;
  const difficultyMultiplier = exercises.some(ex => 
    ex.enunciado.toLowerCase().includes('derivar') || 
    ex.enunciado.toLowerCase().includes('integral')
  ) ? 1.2 : 1.0;
  
  return Math.min(95, Math.round((baseProgress + domainBonus) * difficultyMultiplier));
}

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
      await logger.info("Saving response", { 
        exerciseId: validatedData.exerciseId, 
        responseLength: validatedData.content?.length || 0 
      });
      
      const response = await storage.createOrUpdateResponse(validatedData);
      
      await logger.info("Response saved successfully", { 
        exerciseId: validatedData.exerciseId, 
        id: response.id 
      });
      
      res.json(response);
    } catch (error) {
      await logger.error("Failed to save response", { 
        body: req.body, 
        error: error instanceof Error ? error.message : String(error)
      });
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

  // Get BKT domain information
  app.get("/api/bkt/domains", async (req, res) => {
    try {
      const exercises = await storage.getExercises();
      const sectionGroups = new Map<number, any[]>();
      
      // Group exercises by section
      exercises.forEach(ex => {
        if (!sectionGroups.has(ex.sectionId)) {
          sectionGroups.set(ex.sectionId, []);
        }
        sectionGroups.get(ex.sectionId)!.push(ex);
      });
      
      const domains: any[] = [];
      
      sectionGroups.forEach((sectionExercises, sectionId) => {
        const topics = Array.from(new Set(sectionExercises.map(ex => ex.tema)));
        const domain = determineSectionDomain(topics, sectionExercises);
        const difficulty = determineSectionDifficulty(sectionExercises);
        const progress = calculateBKTProgress(sectionId, sectionExercises);
        
        domains.push({
          sectionId,
          domain,
          topics,
          difficulty,
          progress,
          exerciseCount: sectionExercises.length
        });
      });
      
      res.json(domains);
    } catch (error) {
      console.error('Error fetching BKT domains:', error);
      res.status(500).json({ error: 'Failed to fetch BKT data' });
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

  // Get AI feedback for section completion
  app.post("/api/ai/feedback", async (req, res) => {
    try {
      const { exercises, responses, apiKey } = req.body;
      
      if (!exercises || !Array.isArray(exercises)) {
        return res.status(400).json({ error: "Exercises array is required" });
      }
      
      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      // Create feedback prompt
      let prompt = "He completado una sección de ejercicios de matemáticas. Por favor, proporciona retroalimentación sobre mi progreso:\n\n";
      
      exercises.forEach((exercise, index) => {
        const response = responses && responses[index] ? responses[index] : "Sin respuesta";
        prompt += `Ejercicio ${index + 1}: ${exercise.tema}\n`;
        prompt += `Enunciado: ${exercise.enunciado}\n`;
        if (exercise.ejercicio) {
          prompt += `Ejercicio: ${exercise.ejercicio}\n`;
        }
        prompt += `Mi respuesta: ${response}\n\n`;
      });

      prompt += "Por favor, proporciona:\n";
      prompt += "1. Retroalimentación general sobre mi comprensión\n";
      prompt += "2. Áreas que debo mejorar\n";
      prompt += "3. Sugerencias para seguir estudiando\n";

      const feedback = await callGroqAPI(prompt, apiKey);
      
      res.json({ feedback });
    } catch (error) {
      console.error("AI feedback error:", error);
      res.status(500).json({ error: "Failed to get AI feedback" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
