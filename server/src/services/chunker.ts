export interface TextChunk {
  index: number;
  text: string;
  tokenCount: number;
}

export function chunkText(
  text: string,
  targetSize: number = 1500,
  overlap: number = 250
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const clean = text.trim();
  if (clean.length <= targetSize) {
    return [
      {
        index: 0,
        text: clean,
        tokenCount: Math.ceil(clean.length / 4),
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < clean.length) {
    let endIndex = startIndex + targetSize;

    if (endIndex >= clean.length) {
      const chunkStr = clean.slice(startIndex).trim();
      if (chunkStr.length > 0) {
        chunks.push({
          index: chunkIndex++,
          text: chunkStr,
          tokenCount: Math.ceil(chunkStr.length / 4),
        });
      }
      break;
    }

    // Try finding natural break boundaries: paragraph > sentence > newline > space
    const lookbackDistance = Math.min(overlap * 2, 400);
    const windowToInspect = clean.slice(endIndex - lookbackDistance, endIndex + 100);

    let breakOffset = -1;

    // 1. Look for double newline (paragraph)
    const paraIdx = windowToInspect.lastIndexOf('\n\n');
    if (paraIdx !== -1 && paraIdx >= 50) {
      breakOffset = paraIdx + 2;
    }

    // 2. Look for sentence boundary (. ! ?)
    if (breakOffset === -1) {
      const sentenceMatch = windowToInspect.match(/([.!?])\s+[A-Z0-9"']/g);
      if (sentenceMatch) {
        const lastSentenceBreak = windowToInspect.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
        if (lastSentenceBreak !== -1) {
          breakOffset = lastSentenceBreak + 2;
        }
      }
    }

    // 3. Look for single newline
    if (breakOffset === -1) {
      const newlineIdx = windowToInspect.lastIndexOf('\n');
      if (newlineIdx !== -1 && newlineIdx >= 50) {
        breakOffset = newlineIdx + 1;
      }
    }

    // 4. Look for space
    if (breakOffset === -1) {
      const spaceIdx = windowToInspect.lastIndexOf(' ');
      if (spaceIdx !== -1) {
        breakOffset = spaceIdx + 1;
      }
    }

    if (breakOffset !== -1) {
      endIndex = endIndex - lookbackDistance + breakOffset;
    }

    const chunkContent = clean.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        index: chunkIndex++,
        text: chunkContent,
        tokenCount: Math.ceil(chunkContent.length / 4),
      });
    }

    // Advance with overlap
    startIndex = endIndex - overlap;
    if (startIndex <= chunks[chunks.length - 1]?.text.length && startIndex < endIndex) {
      // Avoid infinite loops
      startIndex = Math.max(startIndex, endIndex - overlap);
    }
  }

  return chunks;
}
