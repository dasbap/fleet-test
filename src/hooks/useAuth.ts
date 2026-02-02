import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'organizer' | 'manager' | 'driver' | 'mechanic';

interface FleetMembership {
  id: string;
  fleet_id: string;
  role: AppRole;
  is_active: boolean;
}

interface UserWithRole {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  memberships: FleetMembership[];
  userFleetId: string | null;
  isLoading: boolean;
}

export function useAuth(): UserWithRole {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [memberships, setMemberships] = useState<FleetMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMemberships = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('fleet_memberships')
        .select('id, fleet_id, role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching memberships:', error);
        // Set default role for new users without memberships
        setRole('organizer');
        setMemberships([]);
        return;
      }

      if (data && data.length > 0) {
        setMemberships(data as FleetMembership[]);
        // Use the highest privilege role
        const roleHierarchy: AppRole[] = ['organizer', 'manager', 'mechanic', 'driver'];
        const userRoles = data.map(m => m.role as AppRole);
        const highestRole = roleHierarchy.find(r => userRoles.includes(r)) || 'driver';
        setRole(highestRole);
      } else {
        // No memberships yet - default to organizer for new users
        setRole('organizer');
        setMemberships([]);
      }
    } catch (err) {
      console.error('Error in fetchMemberships:', err);
      setRole('organizer');
      setMemberships([]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer membership fetch to avoid blocking
          setTimeout(() => fetchMemberships(session.user.id), 0);
        } else {
          setRole(null);
          setMemberships([]);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchMemberships(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get the first active fleet ID for the user
  const userFleetId = memberships.length > 0 ? memberships[0].fleet_id : null;

  return { user, session, role, memberships, userFleetId, isLoading };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email: string, password: string, fullName: string, invitationFleetId?: string) {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        invitation_fleet_id: invitationFleetId,
      },
    },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
