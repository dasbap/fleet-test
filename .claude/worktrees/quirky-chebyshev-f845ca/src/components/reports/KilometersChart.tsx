import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car } from 'lucide-react';

interface KilometersChartProps {
  data: Array<{ registration: string; km: number }>;
}

export function KilometersChart({ data }: KilometersChartProps) {
  const chartData = data.map(item => ({
    name: item.registration,
    km: item.km,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Kilomètres par Véhicule
        </CardTitle>
        <CardDescription>Top 10 véhicules par distance parcourue</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="name" width={80} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} km`, 'Distance']}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="km" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
        )}
      </CardContent>
    </Card>
  );
}
