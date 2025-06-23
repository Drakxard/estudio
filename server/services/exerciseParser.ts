import { storage } from "../storage";
import { type InsertExercise } from "@shared/schema";

interface RawExercise {
  seccion?: string;
  tema: string;
  enunciado: string;
  ejercicio?: string;
  id?: string;
}

export async function loadExercisesFromFiles(): Promise<void> {
  try {
    // Load from corrected secciones file
    const seccionesModule = await import("../../attached_assets/secciones_fixed.js");
    const seccionesData = seccionesModule.ejercicios as RawExercise[];
    
    // Load from seccion parcial
    const parcialModule = await import("../../attached_assets/seccion parcial_1750696591836.js");
    const parcialData = parcialModule.ejercicios as RawExercise[];
    
    // Combine and process exercises
    const allExercises = [...seccionesData, ...parcialData];
    
    const processedExercises: InsertExercise[] = [];
    let currentSection = 1;
    let orderCounter = 0;
    
    for (const rawExercise of allExercises) {
      // Detect section changes based on seccion field or topic patterns
      if (rawExercise.seccion) {
        const sectionMatch = rawExercise.seccion.match(/(\d+)/);
        if (sectionMatch) {
          const newSection = parseInt(sectionMatch[1]);
          if (newSection !== currentSection) {
            currentSection = newSection;
            orderCounter = 0;
          }
        }
      } else if (rawExercise.tema.includes("Seccion") || rawExercise.tema.includes("Sección")) {
        const sectionMatch = rawExercise.tema.match(/(\d+)/);
        if (sectionMatch) {
          const newSection = parseInt(sectionMatch[1]);
          if (newSection !== currentSection) {
            currentSection = newSection;
            orderCounter = 0;
          }
        }
      }
      
      // Create exercise entry
      const exercise: InsertExercise = {
        sectionId: currentSection,
        tema: rawExercise.tema,
        enunciado: rawExercise.enunciado || "",
        ejercicio: rawExercise.ejercicio || rawExercise.id || "",
        order: orderCounter++,
      };
      
      processedExercises.push(exercise);
    }
    
    // Store in memory
    await storage.createExercises(processedExercises);
    console.log(`Loaded ${processedExercises.length} exercises across ${currentSection} sections`);
  } catch (error) {
    console.error("Error loading exercises:", error);
    // Create some default exercises if loading fails
    const defaultExercises: InsertExercise[] = [
      {
        sectionId: 1,
        tema: "Preparación para el cálculo",
        enunciado: "Calcular la pendiente de la recta a partir de su gráfica.",
        ejercicio: "Gráfica que pasa por (0, 2) y (2, 0).",
        order: 0,
      },
      {
        sectionId: 1,
        tema: "Preparación para el cálculo", 
        enunciado: "Escribir la ecuación de la recta que pase por el punto y que sea paralela a la recta dada.",
        ejercicio: "Punto: (3, 2), Recta: 4x - 2y = 3",
        order: 1,
      },
      {
        sectionId: 2,
        tema: "Funciones y Gráficas",
        enunciado: "Realice un boceto de la gráfica de la función.",
        ejercicio: "y = -(2^x)",
        order: 0,
      }
    ];
    await storage.createExercises(defaultExercises);
    console.log(`Loaded ${defaultExercises.length} default exercises`);
  }
}
