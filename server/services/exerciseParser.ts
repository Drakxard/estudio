import { storage } from "../storage";
import { type InsertExercise } from "@shared/schema";
import { promises as fs } from 'fs';
import { join } from 'path';

interface RawExercise {
  seccion?: string;
  tema: string;
  enunciado: string;
  ejercicio?: string;
  id?: string;
}

export async function loadExercisesFromFiles(): Promise<void> {
  try {
    const allRawExercises: RawExercise[] = [];
    
    // Load from existing attached assets
    await loadFromAttachedAssets(allRawExercises);
    
    // Load from sube-seccion folder (dynamic uploads)
    await loadFromSubeSeccion(allRawExercises);
    
    // Process and organize exercises
    const processedExercises = processExercises(allRawExercises);
    
    // Store in memory
    await storage.createExercises(processedExercises);
    
    const maxSection = Math.max(...processedExercises.map(ex => ex.sectionId));
    console.log(`Loaded ${processedExercises.length} exercises across ${maxSection} sections`);
  } catch (error) {
    console.error("Error loading exercises:", error);
    // Create default exercises if loading fails
    await createDefaultExercises();
  }
}

async function loadFromAttachedAssets(allRawExercises: RawExercise[]): Promise<void> {
  try {
    // Load from corrected secciones file
    const seccionesModule = await import("../../attached_assets/secciones_fixed.js");
    const seccionesData = seccionesModule.ejercicios as RawExercise[];
    allRawExercises.push(...seccionesData);
    
    // Load from seccion parcial
    const parcialModule = await import("../../attached_assets/seccion parcial_1750696591836.js");
    const parcialData = parcialModule.ejercicios as RawExercise[];
    allRawExercises.push(...parcialData);
    
    console.log(`Loaded ${seccionesData.length + parcialData.length} exercises from attached assets`);
  } catch (error) {
    console.error("Error loading from attached assets:", error);
  }
}

async function loadFromSubeSeccion(allRawExercises: RawExercise[]): Promise<void> {
  try {
    const subeSeccionPath = join(process.cwd(), 'sube-seccion');
    
    // Check if sube-seccion directory exists
    try {
      await fs.access(subeSeccionPath);
    } catch {
      console.log("sube-seccion folder not found, continuing with existing exercises");
      return;
    }
    
    // Read all .js files from sube-seccion folder
    const files = await fs.readdir(subeSeccionPath);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    let loadedCount = 0;
    
    for (const file of jsFiles) {
      try {
        const filePath = join(subeSeccionPath, file);
        
        // Dynamic import of the section file
        const fileUrl = new URL(`file://${filePath}`);
        const module = await import(fileUrl.href);
        
        if (module.ejercicios && Array.isArray(module.ejercicios)) {
          const sectionName = file.replace('.js', '');
          
          // Mark exercises with section name for processing
          const sectionExercises = module.ejercicios.map((ex: RawExercise) => ({
            ...ex,
            seccion: ex.seccion || sectionName
          }));
          
          allRawExercises.push(...sectionExercises);
          loadedCount += sectionExercises.length;
          
          console.log(`Loaded ${sectionExercises.length} exercises from ${file}`);
        }
      } catch (error) {
        console.error(`Error loading section file ${file}:`, error);
      }
    }
    
    if (loadedCount > 0) {
      console.log(`Total loaded from sube-seccion: ${loadedCount} exercises from ${jsFiles.length} files`);
    }
  } catch (error) {
    console.error("Error accessing sube-seccion folder:", error);
  }
}

function processExercises(allRawExercises: RawExercise[]): InsertExercise[] {
  const processedExercises: InsertExercise[] = [];
  let currentSection = 1;
  let orderCounter = 0;
  
  for (const rawExercise of allRawExercises) {
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
  
  return processedExercises;
}

async function createDefaultExercises(): Promise<void> {
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
