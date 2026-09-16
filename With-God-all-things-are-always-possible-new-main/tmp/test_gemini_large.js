import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

  const activeDocs = [{ id: '1', title: 'test', rawText: 'A'.repeat(1000000) }];
  const message = 'hello';

  let candidateChunks = [];
  activeDocs.forEach(doc => {
    const text = doc.rawText;
    const chunkSize = 1000;
    const overlap = 200;
    const chunks = [];
    let start = 0;
    let chunkIdx = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      const chunkStr = text.slice(start, end).trim();
      chunks.push({
        chunkId: `${doc.id}_chunk_${chunkIdx}`,
        documentId: doc.id,
        chunkIndex: chunkIdx,
        text: chunkStr,
        pageNumber: 1,
        docTitle: doc.title,
      });
      chunkIdx++;
      if (end >= text.length) break;
      start = end - overlap;
    }
    candidateChunks = candidateChunks.concat(chunks);
  });

  console.log('Candidate chunks count:', candidateChunks.length);

  const contextText = candidateChunks.map((c, idx) => {
    return `--- Chunk ${idx + 1} (Doc ID: ${c.documentId}, Title: ${c.docTitle}) ---\nText Content:\n${c.text}`;
  }).join('\n\n');

  console.log('Context text total length:', contextText.length, 'chars');

  const systemInstruction = `RELEVANT WORKSPACE DOCUMENT CHUNKS:\n${contextText}`;
  const promptText = `${systemInstruction}\n\nCurrent User Question: ${message}`;

  console.log('Prompt text total length:', promptText.length, 'chars');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText,
    });
    console.log('Response text:', response.text?.substring(0, 100));
  } catch(e) {
    console.error('Gemini error:', e.message);
    if (e.stack) console.error(e.stack);
  }
}

run();
