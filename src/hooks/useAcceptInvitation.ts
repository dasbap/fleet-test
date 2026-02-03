import { supabase } from '@/integrations/supabase/client';

interface AcceptInvitationResult {
  ok: boolean;
  error?: string;
  fleet_id?: string;
  membership_id?: string;
}

export async function acceptInvitation(code: string): Promise<AcceptInvitationResult> {
  try {
    const { data, error } = await supabase.rpc('accept_invitation', {
      p_code: code
    });

    if (error) {
      console.error('Error accepting invitation:', error);
      return { ok: false, error: error.message };
    }

    return data as AcceptInvitationResult;
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
      .from('fleet_memberships')
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
