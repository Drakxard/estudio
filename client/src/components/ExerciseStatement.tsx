import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

// Import KaTeX for LaTeX rendering
const katex = (window as any).katex;

interface ExerciseStatementProps {
  className?: string;
}

export function ExerciseStatement({ className }: ExerciseStatementProps) {
  const { currentExercise } = useAppStore();

  useEffect(() => {
    // Render LaTeX after component updates
    if (katex && currentExercise) {
      setTimeout(() => {
        const mathElements = document.querySelectorAll('.math-content');
        mathElements.forEach((element) => {
          try {
            const text = element.textContent || '';
            if (text.includes('$') || text.includes('\\')) {
              // Process inline math
              let processedText = text.replace(/\$([^$]+)\$/g, (match, math) => {
                try {
                  return katex.renderToString(math, { displayMode: false });
                } catch (e) {
                  return match;
                }
              });
              
              // Process display math
              processedText = processedText.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
                try {
                  return katex.renderToString(math, { displayMode: true });
                } catch (e) {
                  return match;
                }
              });
              
              element.innerHTML = processedText;
            }
          } catch (error) {
            console.warn('LaTeX rendering error:', error);
          }
        });
      }, 100);
    }
  }, [currentExercise]);

  if (!currentExercise) {
    return (
      <div className={`w-full mb-8 ${className || ''}`}>
        <div className="text-center text-gray-400 text-sm mb-3">
          <span>Cargando ejercicio...</span>
        </div>
        <div className="bg-gray-925 border border-gray-800 rounded-xl p-8 mb-6">
          <div className="text-lg leading-relaxed text-center text-gray-400">
            Selecciona una sección para comenzar
          </div>
        </div>
      </div>
    );
  }

  const displayText = currentExercise.ejercicio || currentExercise.enunciado;
  const topic = currentExercise.tema;

  return (
    <div className={`w-full mb-8 ${className || ''}`}>
      <div className="text-center text-gray-400 text-sm mb-3">
        <span>{topic}</span>
      </div>
      
      <div className="bg-gray-925 border border-gray-800 rounded-xl p-8 mb-6">
        <div className="text-lg leading-relaxed text-center math-content">
          {displayText}
        </div>
      </div>
    </div>
  );
}
