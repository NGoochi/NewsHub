export type Article = {
  id: string;
  title: string;
  url?: string;
  source?: string;
  content?: string;
  retrievedAt?: string;
  analysisStatus?: 'pending' | 'in_progress' | 'complete' | 'error';
  analysisResult?: any | null;
};

export type SheetArticle = {
  id: number;           // Numerical ID from sheet (row - 1)
  title: string;        // Article title
  status: 'Retrieved' | 'Analysed';
};

export type AnalysisRun = {
  id: string;
  timestamp: string;
  articleIds: string[];
  status: 'pending' | 'complete' | 'error';
  resultSheetRange?: string | null;
};

export type Project = {
  id: string;             // slug
  name: string;
  createdAt: string;
  sheetId: string;
  sheetUrl?: string | null;
  queries: string[];
  owner?: string | null;  // placeholder
  articles: Article[];
  sheetArticles: SheetArticle[];  // New: tracks articles from sheet
  analysisRuns: AnalysisRun[];
  meta?: any;
  archivedAt?: string;   // timestamp when project was archived
};
