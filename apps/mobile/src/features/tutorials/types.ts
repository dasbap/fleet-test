export interface TutorialChapter {
  id: string;
  title: string;
  startSec: number;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: 'creneau' | 'incident' | 'maintenance' | 'rapports' | 'parametres';
  thumbnailUrl: string;
  videoUrl: string;
  filename: string;
  tags: string[];
  chapters: TutorialChapter[];
}
