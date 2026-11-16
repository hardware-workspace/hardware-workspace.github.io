export function noteToTaskTitle(body) {
  const firstLine = String(body || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || '';
  const sentence = firstLine
    .replace(/^(?:[-*•]\s*|\[\s*\]\s*|\d+[.)]\s*)+/, '')
    .replace(/^(?:reminder\s*[:–-]?\s*|to\s*do\s*[:–-]?\s*|todo\s*[:–-]?\s*|remember\s+to\s+|need\s+to\s+|i\s+need\s+to\s+)/i, '')
    .split(/[.!?](?:\s|$)/, 1)[0]
    .replace(/[.!?]+$/, '')
    .trim();
  const short = sentence.split(/\s+/).filter(Boolean).slice(0, 9).join(' ').slice(0, 70).trim();
  return short ? short[0].toUpperCase() + short.slice(1) : 'Follow up on note';
}
