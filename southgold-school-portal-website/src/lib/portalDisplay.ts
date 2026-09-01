import { SchoolTerm } from '../types';

const TERM_PATTERN = /\b(first|second|third)\s+term\b/ig;

export function cleanAcademicSession(sessionName?: string, activeTerm?: string | null) {
  let cleaned = (sessionName || '').trim();

  if (activeTerm) {
    const escapedTerm = activeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`\\b${escapedTerm}\\b`, 'ig'), '');
  }

  return cleaned
    .replace(TERM_PATTERN, '')
    .replace(/\s*[|,•-]\s*$/g, '')
    .replace(/^\s*[|,•-]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function formatTermSession(term: SchoolTerm | string, sessionName?: string) {
  const session = cleanAcademicSession(sessionName, term);
  return session ? `${term}, ${session} Session` : `${term}`;
}

export function formatOptionalDate(value?: string | null) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
