import { z } from 'zod';
import { SupportRepository } from '@/repositories/support.repository';

const ticketSchema = z.object({
  subject: z.string().min(3, 'Le sujet doit contenir au moins 3 caractères'),
  body: z.string().min(10, 'Décrivez votre problème en au moins 10 caractères'),
  fleet_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

const callbackSchema = z.object({
  phone: z.string().min(8, 'Numéro de téléphone invalide'),
  preferred_time: z.string().min(3, 'Indiquez un créneau préféré'),
  fleet_id: z.string().uuid().optional().nullable(),
});

export type CreateTicketInput = z.infer<typeof ticketSchema>;
export type CreateCallbackInput = z.infer<typeof callbackSchema>;

export class SupportService {
  constructor(private repository: SupportRepository) {}

  async createTicket(userId: string, input: CreateTicketInput): Promise<{ id: string }> {
    const parsed = ticketSchema.parse(input);
    const ticket = await this.repository.createTicket(userId, parsed);

    // Notification email via Edge Function (non bloquant)
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: 'ticket',
          subject: parsed.subject,
          body: parsed.body,
          ticket_id: ticket.id,
        }),
      });
    } catch {
      // Notification non bloquante
    }

    return { id: ticket.id };
  }

  async createCallback(userId: string, input: CreateCallbackInput): Promise<{ id: string }> {
    const parsed = callbackSchema.parse(input);
    const result = await this.repository.createCallback(userId, parsed);

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: 'callback',
          phone: parsed.phone,
          preferred_time: parsed.preferred_time,
          callback_id: result.id,
        }),
      });
    } catch {
      // Notification non bloquante
    }

    return result;
  }
}
