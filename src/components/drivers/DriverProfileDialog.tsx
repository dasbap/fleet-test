import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateDriverLicense,
  useDriverLicenses,
  useDriverProfile,
  useUpdateDriverProfile,
} from '@/hooks/useDriverProfiles';
import {
  useCalculateDriverScore,
  useDriverScores,
  useDriverScoreSnapshots,
} from '@/hooks/useDriverScores';
import { useIncidents, useUpdateIncidentStatus, type IncidentStatus } from '@/hooks/useIncidents';

interface DriverProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleetId?: string;
  driverId: string | null;
  driverName?: string | null;
}

export default function DriverProfileDialog({
  open,
  onOpenChange,
  fleetId,
  driverId,
  driverName,
}: DriverProfileDialogProps) {
  const CONTRACT_TYPE_OPTIONS = [
    { value: 'cdi', label: 'CDI' },
    { value: 'cdd', label: 'CDD' },
    { value: 'interim', label: 'Intérim' },
    { value: 'consultant', label: 'Consultant' },
    { value: 'other', label: 'Autre' },
  ] as const;
  const EMPLOYMENT_STATUS_OPTIONS = [
    { value: 'active', label: 'Actif' },
    { value: 'suspended', label: 'Suspendu' },
    { value: 'inactive', label: 'Inactif' },
  ] as const;
  const INCIDENT_STATUS_OPTIONS = [
    { value: 'open', label: 'Open' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ] as const;

  const { data: profile } = useDriverProfile(driverId ?? undefined, fleetId);
  const { data: licenses = [] } = useDriverLicenses(driverId ?? undefined, fleetId);
  const { data: incidents = [] } = useIncidents(fleetId);
  const { data: scores = [] } = useDriverScores(fleetId);
  const { data: scoreSnapshots = [] } = useDriverScoreSnapshots(driverId ?? undefined, fleetId);
  const calculateScore = useCalculateDriverScore();
  const updateProfile = useUpdateDriverProfile();
  const createLicense = useCreateDriverLicense();
  const updateIncidentStatus = useUpdateIncidentStatus();

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    employee_code: '',
    hire_date: '',
    contract_type: 'cdi',
    employment_status: 'active',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    rh_notes: '',
  });

  const [licenseForm, setLicenseForm] = useState({
    license_number: '',
    license_category: '',
    issued_at: '',
    expires_at: '',
    issuing_country: 'CM',
  });
  const [incidentStatusDrafts, setIncidentStatusDrafts] = useState<Record<string, IncidentStatus>>(
    {},
  );

  const driverIncidents = useMemo(
    () => incidents.filter((incident) => incident.driver_user_id === driverId).slice(0, 10),
    [incidents, driverId],
  );

  const driverScore = useMemo(
    () => scores.find((score) => score.driver_user_id === driverId) ?? null,
    [scores, driverId],
  );

  const scoreBadgeVariant =
    driverScore?.score_level === 'green'
      ? 'default'
      : driverScore?.score_level === 'orange'
        ? 'secondary'
        : 'destructive';

  const syncProfileForm = () => {
    setProfileForm({
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      employee_code: profile?.employee_code ?? '',
      hire_date: profile?.hire_date ?? '',
      contract_type: profile?.contract_type ?? 'cdi',
      employment_status: profile?.employment_status ?? 'active',
      emergency_contact_name: profile?.emergency_contact_name ?? '',
      emergency_contact_phone: profile?.emergency_contact_phone ?? '',
      rh_notes: profile?.rh_notes ?? '',
    });
    setIncidentStatusDrafts({});
  };

  const handleSaveProfile = async () => {
    if (!driverId) return;
    await updateProfile.mutateAsync({
      driverUserId: driverId,
      updates: {
        ...profileForm,
        full_name: profileForm.full_name || null,
        phone: profileForm.phone || null,
        employee_code: profileForm.employee_code || null,
        hire_date: profileForm.hire_date || null,
        emergency_contact_name: profileForm.emergency_contact_name || null,
        emergency_contact_phone: profileForm.emergency_contact_phone || null,
        rh_notes: profileForm.rh_notes || null,
      },
    });
  };

  const handleCreateLicense = async () => {
    if (!driverId || !fleetId) return;
    await createLicense.mutateAsync({
      fleet_id: fleetId,
      driver_user_id: driverId,
      license_number: licenseForm.license_number,
      license_category: licenseForm.license_category,
      issued_at: licenseForm.issued_at || null,
      expires_at: licenseForm.expires_at || null,
      issuing_country: licenseForm.issuing_country || 'CM',
    });
    setLicenseForm({
      license_number: '',
      license_category: '',
      issued_at: '',
      expires_at: '',
      issuing_country: 'CM',
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) syncProfileForm();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fiche conducteur</DialogTitle>
          <DialogDescription>
            Profil RH léger, permis, incidents et score comportemental de {driverName ?? 'ce conducteur'}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Profil RH</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={profileForm.full_name}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))
                }
                placeholder="Nom complet"
              />
              <Input
                value={profileForm.phone}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Téléphone"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={profileForm.employee_code}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, employee_code: event.target.value }))
                  }
                  placeholder="Code employé"
                />
                <Input
                  value={profileForm.hire_date}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, hire_date: event.target.value }))
                  }
                  type="date"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={profileForm.contract_type}
                  onValueChange={(value) =>
                    setProfileForm((prev) => ({ ...prev, contract_type: value }))
                  }
                >
                  <SelectTrigger aria-label="Type de contrat">
                    <SelectValue placeholder="Type de contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={profileForm.employment_status}
                  onValueChange={(value) =>
                    setProfileForm((prev) => ({ ...prev, employment_status: value }))
                  }
                >
                  <SelectTrigger aria-label="Statut emploi">
                    <SelectValue placeholder="Statut emploi" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={profileForm.emergency_contact_name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      emergency_contact_name: event.target.value,
                    }))
                  }
                  placeholder="Contact d'urgence"
                />
                <Input
                  value={profileForm.emergency_contact_phone}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      emergency_contact_phone: event.target.value,
                    }))
                  }
                  placeholder="Téléphone urgence"
                />
              </div>
              <Textarea
                value={profileForm.rh_notes}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, rh_notes: event.target.value }))}
                placeholder="Notes RH"
              />
              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                Enregistrer le profil
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permis conducteur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={licenseForm.license_number}
                  onChange={(event) =>
                    setLicenseForm((prev) => ({ ...prev, license_number: event.target.value }))
                  }
                  placeholder="Numéro de permis"
                />
                <Input
                  value={licenseForm.license_category}
                  onChange={(event) =>
                    setLicenseForm((prev) => ({ ...prev, license_category: event.target.value }))
                  }
                  placeholder="Catégorie"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={licenseForm.issued_at}
                  onChange={(event) =>
                    setLicenseForm((prev) => ({ ...prev, issued_at: event.target.value }))
                  }
                  type="date"
                />
                <Input
                  value={licenseForm.expires_at}
                  onChange={(event) =>
                    setLicenseForm((prev) => ({ ...prev, expires_at: event.target.value }))
                  }
                  type="date"
                />
                <Input
                  value={licenseForm.issuing_country}
                  onChange={(event) =>
                    setLicenseForm((prev) => ({ ...prev, issuing_country: event.target.value }))
                  }
                  placeholder="Pays"
                />
              </div>
              <Button onClick={handleCreateLicense} disabled={createLicense.isPending}>
                Ajouter un permis
              </Button>
              <Separator />
              <div className="space-y-2">
                {licenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun permis enregistré.</p>
                ) : (
                  licenses.map((license) => (
                    <div key={license.id} className="border rounded-md p-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {license.license_number} - {license.license_category}
                        </p>
                        <Badge variant="outline">{license.verification_status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expiration: {license.expires_at ?? 'Non renseignée'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incidents récents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {driverIncidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun incident récent.</p>
              ) : (
                driverIncidents.map((incident) => (
                  <div key={incident.id} className="border rounded-md p-2">
                    <p className="text-sm font-medium">{incident.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Select
                        value={incidentStatusDrafts[incident.id] ?? incident.status}
                        onValueChange={(value: IncidentStatus) =>
                          setIncidentStatusDrafts((prev) => ({
                            ...prev,
                            [incident.id]: value,
                          }))
                        }
                      >
                        <SelectTrigger
                          className="h-8 text-xs"
                          aria-label={`Statut incident ${incident.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INCIDENT_STATUS_OPTIONS.map((statusOption) => (
                            <SelectItem key={statusOption.value} value={statusOption.value}>
                              {statusOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          updateIncidentStatus.isPending ||
                          (incidentStatusDrafts[incident.id] ?? incident.status) === incident.status
                        }
                        onClick={() => {
                          const status = incidentStatusDrafts[incident.id] ?? incident.status;
                          updateIncidentStatus.mutate({ incidentId: incident.id, status });
                        }}
                      >
                        Mettre à jour
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{incident.severity}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score comportemental</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {driverScore ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant={scoreBadgeVariant}>{driverScore.score_level}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Modèle: {driverScore.model_version ?? 'v1'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>Total: {driverScore.score_total ?? driverScore.financial_score}/100</p>
                    <p>Incidents: {driverScore.incidents_score ?? '-'}</p>
                    <p>Délai clôture: {driverScore.closure_delay_score ?? '-'}</p>
                    <p>Discipline créneau: {driverScore.shift_discipline_score ?? '-'}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Score non calculé.</p>
              )}
              <Separator />
              <Button
                variant="outline"
                disabled={!driverId || !fleetId || calculateScore.isPending}
                onClick={() => {
                  if (!driverId || !fleetId) return;
                  calculateScore.mutate({ driverUserId: driverId, fleetId });
                }}
              >
                Recalculer le score
              </Button>
              <Separator />
              <div className="space-y-1">
                {scoreSnapshots.slice(0, 5).map((snapshot) => (
                  <p key={snapshot.id} className="text-xs text-muted-foreground">
                    {snapshot.score_total}/100 -{' '}
                    {formatDistanceToNowStrict(new Date(snapshot.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                ))}
                {scoreSnapshots.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun historique disponible.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
