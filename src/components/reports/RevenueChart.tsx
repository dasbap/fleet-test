import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface RevenueChartProps {
  data: Array<{ registration: string; amount: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map(item => ({
    name: item.registration,
    revenue: item.amount,
  }));

  const formatValue = (value: number) => 
    new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenus par Véhicule
        </CardTitle>
        <CardDescription>Top 10 véhicules par revenus générés</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={formatValue} className="text-xs" />
                <YAxis type="category" dataKey="name" width={80} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} FCFA`, 'Revenus']}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
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
