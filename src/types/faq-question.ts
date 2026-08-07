export type FaqQuestionStatus = "open" | "answered" | "closed";

export interface FaqQuestion {
  id: string;
  user_id: string;
  user_email?: string | null;
  user_name?: string | null;
  parent_question_id: string | null;
  question: string;
  status: FaqQuestionStatus;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
}
