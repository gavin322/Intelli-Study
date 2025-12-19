import { http } from './http';

export interface WordCard {
  id: string;
  text: string;
  translation: string;
  example?: string;
  partOfSpeech?: string;
  audioUrl?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface LexiconSource {
  id: string;
  name: string;
  description?: string;
}

export const fetchSources = () => http.get<LexiconSource[]>('/lexicon/sources').then((res) => res.data);

export interface LexiconSourceStat extends LexiconSource {
  wordCount: number;
  pageCount: number;
  pageSize: number;
}

export const fetchSourceStats = (pageSize = 20) =>
  http.get<LexiconSourceStat[]>('/lexicon/sources/stats', { params: { pageSize } }).then((res) => res.data);

export const fetchWords = (params: {
  page?: number;
  pageSize?: number;
  sourceId?: string;
  onlyUnlearned?: boolean;
}) => {
  return http.get<PaginatedResponse<WordCard>>('/lexicon/words', { params });
};

export const updateWordProgress = (
  wordId: string,
  payload: { mastered: boolean; inNotebook: boolean },
) => http.patch(`/lexicon/words/${wordId}/progress`, payload);

// 仅标记“学习过”（用于下次自动跳转到未学习的单词），不会影响 mastered / inNotebook。
export const markWordLearned = (wordId: string) => http.post(`/lexicon/words/${wordId}/learned`);

export interface LearningStats {
  sourceId: string | null;
  learnedCount: number;
  totalCount: number;
  remainingCount: number;
}

export const fetchLearningStats = (sourceId?: string) =>
  http
    .get<LearningStats>('/lexicon/learning/stats', { params: { sourceId } })
    .then((res) => res.data);
