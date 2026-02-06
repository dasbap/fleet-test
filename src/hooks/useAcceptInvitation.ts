import { supabase } from '@/integrations/supabase/client';

export interface AcceptInvitationResult {
  ok: boolean;
  error?: string | null;
  fleet_id?: string;
  membership_id?: string;
  message?: string;
}

/** Normalise le retour RPC (jsonb) : peut être un objet ou un tableau d'un élément. */
function normalizeRpcResult(data: unknown): AcceptInvitationResult | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    return typeof first === 'object' && first !== null && 'ok' in first
      ? (first as AcceptInvitationResult)
      : null;
  }
  return typeof data === 'object' && data !== null && 'ok' in data
    ? (data as AcceptInvitationResult)
    : null;
}

export async function acceptInvitation(code: string): Promise<AcceptInvitationResult> {
  try {
    const { data, error } = await supabase.rpc('accepter_invitation', {
      p_code: code
    });

    if (error) {
      console.error('Error accepting invitation:', error);
      return { ok: false, error: error.message };
    }

    const result = normalizeRpcResult(data);
    if (result) {
      // already_member (RPC retourne ok: true) : considéré comme succès ; le client peut rafraîchir les memberships
      return result;
    }
    return { ok: false, error: 'invalid_response' };
  } catch (err) {
    console.error('Exception accepting invitation:', err);
    return { ok: false, error: 'unexpected_error' };
  }
}

export async function checkPendingInvitation(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const invitationCode = user.user_metadata?.invitation_code;
  const invitationFleetId = user.user_metadata?.invitation_fleet_id;
  
  // If user has invitation metadata but we should check if already processed
  if (invitationCode && invitationFleetId) {
    // Check if membership already exists
    const { data: membership } = await supabase
      .from('flotte_adhesions')
      .select('id')
      .eq('user_id', user.id)
      .eq('fleet_id', invitationFleetId)
      .maybeSingle();
    
    // If no membership exists, invitation is pending
    if (!membership) {
      return invitationCode;
    }
  }
  
  return null;
}
