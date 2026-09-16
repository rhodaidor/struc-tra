/**
 * Lightweight client-side text extractor for documents (PDF, DOCX, TXT, etc.)
 * Extracts clean raw text directly upon upload without heavy rendering dependencies.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Plain text / CSV / Markdown / JSON / XML
  if (['txt', 'csv', 'md', 'json', 'xml', 'html', 'log'].includes(ext) || file.type.startsWith('text/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve((reader.result as string) || '');
      };
      reader.onerror = () => {
        resolve(`Document: ${fileName}`);
      };
      reader.readAsText(file, 'UTF-8');
    });
  }

  // 2. Microsoft Word (.docx / .doc)
  if (ext === 'docx' || ext === 'doc' || file.type.includes('word') || file.type.includes('document')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const rawString = decoder.decode(buffer);

          // In .docx XML structure, text runs are in <w:t>Text</w:t> and paragraphs in <w:p>
          if (rawString.includes('<w:t') || rawString.includes('<w:p')) {
            let textWithBreaks = rawString.replace(/<\/w:p>/gi, '\n\n');
            textWithBreaks = textWithBreaks.replace(/<\/w:tr>/gi, '\n');
            
            const textMatches = textWithBreaks.match(/<w:t[^>]*>(.*?)<\/w:t>/gi);
            if (textMatches && textMatches.length > 0) {
              const cleanText = textMatches
                .map(m => m.replace(/<[^>]+>/g, '').trim())
                .filter(Boolean)
                .join(' ');
              
              if (cleanText.trim().length > 10) {
                resolve(cleanText);
                return;
              }
            }
          }

          // Fallback: extract readable words
          const words = rawString.match(/([A-Za-z0-9\s.,!?:;'"\-\/]{3,})/g);
          if (words && words.length > 0) {
            const joined = words
              .map(w => w.trim())
              .filter(w => w.length > 2 && !w.startsWith('PK') && !w.includes('theme') && !w.includes('xml'))
              .join('\n');
            if (joined.length > 20) {
              resolve(joined);
              return;
            }
          }
        } catch (err) {
          console.warn('Client DOCX text extraction notice:', err);
        }
        resolve(`[Word Document: ${fileName}]\nOriginal stored binary ready for download.`);
      };
      reader.onerror = () => resolve(`[Word Document: ${fileName}]`);
      reader.readAsArrayBuffer(file);
    });
  }

  // 3. PDF (.pdf)
  if (ext === 'pdf' || file.type.includes('pdf')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const decoder = new TextDecoder('latin1', { fatal: false });
          const rawString = decoder.decode(buffer);

          // Search for text operators in PDF stream
          const tjMatches = rawString.match(/\(([^)]+)\)\s*T[jJ]/g);
          if (tjMatches && tjMatches.length > 0) {
            const textParts = tjMatches.map(m => {
              const inner = m.match(/\(([^)]+)\)/);
              return inner ? inner[1] : '';
            }).filter(t => t.trim().length > 0);

            if (textParts.length > 0) {
              resolve(textParts.join(' '));
              return;
            }
          }

          // Fallback regex for readable text strings in PDF
          const readableChunks = rawString.match(/([A-Za-z0-9\s.,!?:;'"\-\/]{4,})/g);
          if (readableChunks && readableChunks.length > 0) {
            const filtered = readableChunks
              .map(c => c.trim())
              .filter(c => 
                c.length > 3 && 
                !c.startsWith('Font') && 
                !c.startsWith('Type') && 
                !c.startsWith('Encoding') &&
                !c.startsWith('ProcSet')
              );
            if (filtered.length > 5) {
              resolve(filtered.join('\n'));
              return;
            }
          }
        } catch (err) {
          console.warn('Client PDF text extraction notice:', err);
        }
        resolve(`[PDF Document: ${fileName}]\nOriginal stored binary ready for download.`);
      };
      reader.onerror = () => resolve(`[PDF Document: ${fileName}]`);
      reader.readAsArrayBuffer(file);
    });
  }

  return Promise.resolve(`[Document File: ${fileName}]`);
}
