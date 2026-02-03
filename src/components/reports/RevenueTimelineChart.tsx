import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { format, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RevenueTimelineChartProps {
  closures: Array<{
    date: Date;
    revenue: number;
    validated: boolean;
  }>;
  startDate: Date;
  endDate: Date;
}

type Granularity = 'day' | 'week';

export function RevenueTimelineChart({ closures, startDate, endDate }: RevenueTimelineChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('day');

  const chartData = useMemo(() => {
    if (granularity === 'day') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(day => {
        const dayClosures = closures.filter(c => 
          format(c.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        );
        return {
          date: format(day, 'dd/MM', { locale: fr }),
          fullDate: format(day, 'dd MMM yyyy', { locale: fr }),
          total: dayClosures.reduce((sum, c) => sum + c.revenue, 0),
          validated: dayClosures.filter(c => c.validated).reduce((sum, c) => sum + c.revenue, 0),
        };
      });
    } else {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekClosures = closures.filter(c => 
          isWithinInterval(c.date, { start: weekStart, end: weekEnd })
        );
        return {
          date: `S${format(weekStart, 'w')}`,
          fullDate: `${format(weekStart, 'dd/MM', { locale: fr })} - ${format(weekEnd, 'dd/MM', { locale: fr })}`,
          total: weekClosures.reduce((sum, c) => sum + c.revenue, 0),
          validated: weekClosures.filter(c => c.validated).reduce((sum, c) => sum + c.revenue, 0),
        };
      });
    }
  }, [closures, startDate, endDate, granularity]);

  const formatValue = (value: number) => 
    new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(value);

  const hasData = closures.length > 0;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution des Revenus
            </CardTitle>
            <CardDescription>Revenus totaux et validés sur la période</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={granularity === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGranularity('day')}
            >
              Jour
            </Button>
            <Button
              variant={granularity === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGranularity('week')}
            >
              Semaine
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  tickFormatter={formatValue} 
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString('fr-FR')} FCFA`, 
                    name === 'total' ? 'Total' : 'Validés'
                  ]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  formatter={(value) => value === 'total' ? 'Total' : 'Validés'}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="validated" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Aucune donnée disponible pour cette période</p>
        )}
      </CardContent>
    </Card>
  );
}
