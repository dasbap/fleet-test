import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Incident {
  date: Date;
  vehicle: string;
  description: string;
  severity: string;
}

interface RecentIncidentsTableProps {
  incidents: Incident[];
}

const severityConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Faible', variant: 'secondary' },
  medium: { label: 'Moyen', variant: 'outline' },
  high: { label: 'Élevé', variant: 'destructive' },
  critical: { label: 'Critique', variant: 'destructive' },
};

export function RecentIncidentsTable({ incidents }: RecentIncidentsTableProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Derniers Incidents
        </CardTitle>
        <CardDescription>Les 10 incidents les plus récents sur la période</CardDescription>
      </CardHeader>
      <CardContent>
        {incidents.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Sévérité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-sm">
                      {format(incident.date, 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{incident.vehicle}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {incident.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityConfig[incident.severity]?.variant || 'secondary'}>
                        {severityConfig[incident.severity]?.label || incident.severity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
            <p>Aucun incident sur cette période</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
