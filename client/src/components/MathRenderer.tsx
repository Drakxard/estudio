import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  // Split content by math delimiters and render appropriately
  const renderContent = (text: string) => {
    // Handle block math $$...$$
    const blockMathRegex = /\$\$(.*?)\$\$/gs;
    const inlineMathRegex = /\$(.*?)\$/g;
    
    let result: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    // First handle block math
    const blockMatches: Array<{ match: RegExpExecArray; type: 'block' }> = [];
    while ((match = blockMathRegex.exec(text)) !== null) {
      blockMatches.push({ match, type: 'block' });
    }
    
    // Then handle inline math (avoiding conflicts with block math)
    const inlineMatches: Array<{ match: RegExpExecArray; type: 'inline' }> = [];
    let tempText = text;
    // Remove block math temporarily to avoid conflicts
    tempText = tempText.replace(blockMathRegex, '');
    while ((match = inlineMathRegex.exec(tempText)) !== null) {
      inlineMatches.push({ match, type: 'inline' });
    }
    
    // Combine and sort all matches by position
    const allMatches = [...blockMatches, ...inlineMatches]
      .sort((a, b) => a.match.index - b.match.index);
    
    allMatches.forEach(({ match, type }, index) => {
      // Add text before the math
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          result.push(
            <span key={`text-${index}`}>
              {textBefore.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </span>
          );
        }
      }
      
      // Add the math
      const mathContent = match[1].trim();
      if (mathContent) {
        try {
          if (type === 'block') {
            result.push(
              <div key={`math-${index}`} className="my-4 text-center">
                <BlockMath math={mathContent} />
              </div>
            );
          } else {
            result.push(
              <InlineMath key={`math-${index}`} math={mathContent} />
            );
          }
        } catch (error) {
          // Fallback for invalid LaTeX
          result.push(
            <span key={`error-${index}`} className="text-red-500 font-mono">
              ${type === 'block' ? '$' : ''}${mathContent}${type === 'block' ? '$' : ''}$
            </span>
          );
        }
      }
      
      lastIndex = match.index + match[0].length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.trim()) {
        result.push(
          <span key="text-end">
            {remainingText.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      }
    }
    
    return result.length > 0 ? result : [text];
  };

  return (
    <div className={`math-content ${className}`}>
      {renderContent(content)}
    </div>
  );
}