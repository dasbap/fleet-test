/**
 * Panneau support intégré : WhatsApp, email, ticket, rappel.
 */
import { useState } from 'react';
import { Mail, Phone, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { WhatsAppSupportButton } from '@/components/help/WhatsAppSupportButton';
import { buildSupportMailto, SUPPORT } from '@/config/navigation';
import { useCreateSupportTicket, useCreateSupportCallback } from '@/hooks/useSupportTicket';
import { useLocation } from 'react-router-dom';
import { useAuthOptional } from '@/hooks/useAuth';

type SupportTab = 'channels' | 'ticket' | 'callback';

export function SupportPanel({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<SupportTab>('channels');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const location = useLocation();
  const role = useAuthOptional()?.role ?? null;
  const createTicket = useCreateSupportTicket();
  const createCallback = useCreateSupportCallback();

  const emailSubject = `[E-Samba Support] ${location.pathname} (${role ?? 'visiteur'})`;
  const emailHref = buildSupportMailto(emailSubject);

  const trackSupportClick = (channel: string) => {
    try {
      (window as Window & { posthog?: { capture: (e: string, p?: Record<string, unknown>) => void } })
        .posthog?.capture('help_support_clicked', {
          channel,
          page: location.pathname,
          role: role ?? 'visitor',
        });
    } catch {
      // non bloquant
    }
  };

  const handleTicket = () => {
    createTicket.mutate(
      { subject, body },
      {
        onSuccess: () => {
          setSubject('');
          setBody('');
          setTab('channels');
        },
      },
    );
  };

  const handleCallback = () => {
    createCallback.mutate(
      { phone, preferred_time: preferredTime },
      {
        onSuccess: () => {
          setPhone('');
          setPreferredTime('');
          setTab('channels');
        },
      },
    );
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <WhatsAppSupportButton compact />
        <Button variant="outline" size="sm" asChild onClick={() => trackSupportClick('email')}>
          <a href={emailHref}>
            <Mail className="h-4 w-4 mr-1" aria-hidden />
            Email
          </a>
        </Button>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-4" aria-label="Support">
      <h2 className="text-sm font-semibold text-foreground">Besoin d&apos;un conseiller ?</h2>

      {tab === 'channels' && (
        <div className="space-y-3">
          <WhatsAppSupportButton />
          <a
            href={emailHref}
            onClick={() => trackSupportClick('email')}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
            {SUPPORT.email}
          </a>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                trackSupportClick('ticket');
                setTab('ticket');
              }}
            >
              <Ticket className="h-4 w-4 mr-1" aria-hidden />
              Ouvrir un ticket
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                trackSupportClick('callback');
                setTab('callback');
              }}
            >
              <Phone className="h-4 w-4 mr-1" aria-hidden />
              Demander un rappel
            </Button>
          </div>
        </div>
      )}

      {tab === 'ticket' && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="ticket-subject">Sujet</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex : Problème de paiement"
            />
          </div>
          <div>
            <Label htmlFor="ticket-body">Description</Label>
            <Textarea
              id="ticket-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Décrivez votre problème…"
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTab('channels')}>
              Retour
            </Button>
            <Button size="sm" onClick={handleTicket} disabled={createTicket.isPending}>
              Envoyer
            </Button>
          </div>
        </div>
      )}

      {tab === 'callback' && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="callback-phone">Téléphone</Label>
            <Input
              id="callback-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6 XX XX XX XX"
              type="tel"
            />
          </div>
          <div>
            <Label htmlFor="callback-time">Créneau préféré</Label>
            <Input
              id="callback-time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="Ex : Aujourd'hui 14h-16h"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTab('channels')}>
              Retour
            </Button>
            <Button size="sm" onClick={handleCallback} disabled={createCallback.isPending}>
              Demander
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
