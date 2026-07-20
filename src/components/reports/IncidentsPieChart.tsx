import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface IncidentsPieChartProps {
  data: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

const COLORS = {
  low: 'hsl(var(--muted-foreground))',
  medium: 'hsl(var(--chart-4))',
  high: 'hsl(var(--chart-5))',
  critical: 'hsl(var(--destructive))',
};

const LABELS = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique',
};

export function IncidentsPieChart({ data }: IncidentsPieChartProps) {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }));

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Incidents par Sévérité
        </CardTitle>
        <CardDescription>Répartition des {total} incidents</CardDescription>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Aucun incident</p>
        )}
      </CardContent>
    </Card>
  );
}
