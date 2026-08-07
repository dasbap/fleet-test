import { supabase } from "@/integrations/supabase/client";
import type { FaqQuestion } from "@/types/faq-question";

export class FaqQuestionRepository {
  async submitQuestion(question: string, parentQuestionId?: string | null): Promise<FaqQuestion> {
    const { data, error } = await supabase.rpc("submit_faq_question", {
      p_question: question,
      p_parent_question_id: parentQuestionId ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as FaqQuestion;
  }

  async listForAdmin(includeAnswered = false): Promise<FaqQuestion[]> {
    const { data, error } = await supabase.rpc("admin_list_faq_questions", {
      p_include_answered: includeAnswered,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as FaqQuestion[];
  }

  async answerQuestion(questionId: string, answer: string): Promise<FaqQuestion> {
    const { data, error } = await supabase.rpc("admin_answer_faq_question", {
      p_question_id: questionId,
      p_answer: answer,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as FaqQuestion;
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase.rpc("admin_delete_faq_question", {
      p_question_id: questionId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
