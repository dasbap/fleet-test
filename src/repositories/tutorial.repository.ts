import { supabase } from "@/integrations/supabase/client";

export interface TutorialItem {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  videoUrl: string;
  thumbUrl: string;
}

const TUTORIAL_COUNT = 10;

function toSequenceId(index: number): string {
  return String(index).padStart(2, "0");
}

export class TutorialRepository {
  list(): TutorialItem[] {
    const tutorials: TutorialItem[] = [];
    for (let index = 1; index <= TUTORIAL_COUNT; index += 1) {
      const seq = toSequenceId(index);
      const videoPath = `videos/tuto-${seq}.mp4`;
      const thumbPath = `thumbs/tuto-${seq}.jpg`;
      tutorials.push({
        id: `tuto-${seq}`,
        title: `Tutoriel ${seq}`,
        description: "Guide rapide pour une opération métier E-Samba.",
        durationMin: 3 + (index % 4),
        videoUrl: supabase.storage.from("tutorials").getPublicUrl(videoPath).data
          .publicUrl,
        thumbUrl: supabase.storage.from("tutorials").getPublicUrl(thumbPath).data
          .publicUrl,
      });
    }
    return tutorials;
  }
}
