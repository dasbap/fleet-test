"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExpenseChartRow, KmChartRow } from "@/lib/dashboard/types";

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

interface ExpensesBarChartProps {
  data: ExpenseChartRow[];
}

export function ExpensesBarChart({ data }: ExpensesBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dépenses (6 derniers mois)</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) =>
                Number(value).toLocaleString("fr-FR") + " FCFA"
              }
            />
            <Legend />
            <Bar
              dataKey="carburant"
              name="Carburant"
              stackId="a"
              fill="hsl(var(--primary))"
            />
            <Bar
              dataKey="entretien"
              name="Entretien"
              stackId="a"
              fill="hsl(var(--chart-2))"
            />
            <Bar
              dataKey="assurance"
              name="Assurance"
              stackId="a"
              fill="hsl(var(--chart-3))"
            />
            <Bar
              dataKey="autres"
              name="Autres"
              stackId="a"
              fill="hsl(var(--chart-4))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface VehicleStatusChartProps {
  active: number;
  maintenance: number;
  inactive: number;
  sold: number;
}

export function VehicleStatusChart({
  active,
  maintenance,
  inactive,
  sold,
}: VehicleStatusChartProps) {
  const data = [
    { name: "Actifs", value: active },
    { name: "Maintenance", value: maintenance },
    { name: "Inactifs", value: inactive },
    { name: "Vendus", value: sold },
  ].filter((item) => item.value > 0);

  const isEmpty = data.length === 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Statut des véhicules</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">Aucun véhicule enregistré.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface KmLineChartProps {
  data: KmChartRow[];
}

export function KmLineChart({ data }: KmLineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kilomètres parcourus</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="km"
              name="Km"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="trajets"
              name="Créneaux"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** @deprecated Utiliser ExpensesBarChart / KmLineChart */
export function DashboardCharts() {
  return null;
}
