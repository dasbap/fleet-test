import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

interface MaintenanceTrendsChartProps {
  data: {
    completed: number;
    inProgress: number;
    pending: number;
  };
}

export function MaintenanceTrendsChart({ data }: MaintenanceTrendsChartProps) {
  const chartData = [
    { name: 'Terminé', value: data.completed, fill: 'hsl(var(--chart-2))' },
    { name: 'En cours', value: data.inProgress, fill: 'hsl(var(--chart-4))' },
    { name: 'En attente', value: data.pending, fill: 'hsl(var(--chart-3))' },
  ];

  const total = data.completed + data.inProgress + data.pending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Tendances Maintenance
        </CardTitle>
        <CardDescription>Répartition des interventions par statut</CardDescription>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [value, 'Interventions']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wrench className="h-12 w-12 mb-4 opacity-50" />
            <p>Aucune intervention sur cette période</p>
          </div>
        )}
        
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-chart-2">{data.completed}</p>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-chart-4">{data.inProgress}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-chart-3">{data.pending}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
