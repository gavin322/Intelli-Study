import { http } from './http';

export type PracticeMode = 'CHN_TO_ENG' | 'AUDIO_TO_ENG';
export type PracticeSource = 'WORD' | 'NOTEBOOK';

export interface PracticeSessionPayload {
  sessionId: string;
  payload: Array<{ id: string; text: string; translation: string }>;
}

export const startSession = (params: {
  mode: PracticeMode;
  source: PracticeSource;
  wordIds: string[];
}) => http.post<PracticeSessionPayload>('/practice/sessions', params).then((res) => res.data);

export const submitAttempt = (payload: {
  sessionId: string;
  wordId: string;
  prompt: string;
  answer: string;
  mistakeCount?: number;
  hintLevel?: number;
}) => http.post<{ attemptId: string; isCorrect: boolean }>('/practice/attempts', payload).then((res) => res.data);

export const fetchHint = (wordId: string, level: number) =>
  http.post<{ hint: string; level: number }>('/practice/hints', { wordId, level }).then((res) => res.data);
