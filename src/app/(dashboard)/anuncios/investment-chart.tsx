"use client";

import {
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";

interface DailyTotal {
  date: string;
  spend: number;
  resultados: number;
}

export function InvestmentChart({ data }: { data: DailyTotal[] }) {
  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem dados no período selecionado.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => formatDate(v)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          yAxisId="spend"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(v: number) => formatCurrency(v)}
          width={80}
        />
        <YAxis
          yAxisId="resultados"
          orientation="right"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          width={40}
        />
        <Tooltip
          formatter={(value, name) =>
            name === "spend" ? formatCurrency(Number(value)) : String(value)
          }
          labelFormatter={(v) => (v ? formatDate(String(v)) : "")}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Bar yAxisId="spend" dataKey="spend" name="Investimento" fill="var(--primary)" radius={4} />
        <Line
          yAxisId="resultados"
          type="monotone"
          dataKey="resultados"
          name="Resultados"
          stroke="var(--accent-cyan)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
