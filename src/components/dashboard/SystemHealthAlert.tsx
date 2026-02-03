import { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SystemHealthAlert() {
  const { role, userFleetId } = useAuth();
  const { status, isLoading, error, checkHealth, repairOrphanUser } = useSystemHealth();
  const [showDetails, setShowDetails] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);

  // Only show for organizers and managers
  if (role !== 'organizer' && role !== 'manager') {
    return null;
  }

  // Don't show if healthy and no errors
  if (status.isHealthy && !error) {
    return null;
  }

  const handleRepair = async (userId: string) => {
    if (!userFleetId) return;
    
    setRepairing(userId);
    await repairOrphanUser(userId, userFleetId);
    setRepairing(null);
  };

  return (
    <>
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Incohérence détectée</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {error || `${status.usersWithoutMembership} utilisateur(s) sans affiliation valide.`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkHealth()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Revérifier
            </Button>
            {status.orphanUsers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(true)}
              >
                <Wrench className="h-4 w-4 mr-1" />
                Réparer
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Utilisateurs sans affiliation</DialogTitle>
            <DialogDescription>
              Ces utilisateurs sont inscrits mais n'ont pas d'entrée fleet_memberships valide.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {status.orphanUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRepair(user.user_id)}
                  disabled={repairing === user.user_id}
                >
                  {repairing === user.user_id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Affilier
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {status.orphanUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Aucun utilisateur orphelin détecté.
            </p>
          )}

          <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded">
            <strong>Note:</strong> Si le bouton "Affilier" ne fonctionne pas, 
            exécutez la RPC <code>repair_orphan_membership</code> dans Supabase SQL Editor.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
