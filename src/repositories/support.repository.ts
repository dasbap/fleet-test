import { supabase } from '@/integrations/supabase/client';
import type { SupportCallbackInsert, SupportTicketInsert } from '@/types/help';

export interface SupportTicketRecord {
  id: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  created_at: string;
}

export class SupportRepository {
  async createTicket(
    userId: string,
    payload: SupportTicketInsert,
  ): Promise<SupportTicketRecord> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        fleet_id: payload.fleet_id ?? null,
        subject: payload.subject,
        body: payload.body,
        priority: payload.priority ?? 'normal',
      })
      .select('id, subject, body, status, priority, created_at')
      .single();

    if (error) {
      console.error('Erreur création ticket:', error);
      throw new Error('Impossible de créer le ticket support.');
    }

    return data as SupportTicketRecord;
  }

  async createCallback(
    userId: string,
    payload: SupportCallbackInsert,
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('support_callbacks')
      .insert({
        user_id: userId,
        fleet_id: payload.fleet_id ?? null,
        phone: payload.phone,
        preferred_time: payload.preferred_time,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erreur demande rappel:', error);
      throw new Error('Impossible d\'enregistrer la demande de rappel.');
    }

    return data as { id: string };
  }
}
