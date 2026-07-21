"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";

export interface LeadsChartPoint {
  date: string;
  spend: number;
  leads: number;
  cpl: number | null;
}

export function LeadsChart({ data }: { data: LeadsChartPoint[] }) {
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
        <YAxis yAxisId="leads" orientation="right" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
        <YAxis yAxisId="cpl" hide />
        <Tooltip
          formatter={(value, name) => {
            if (name === "spend" || name === "cpl") return formatCurrency(Number(value));
            return String(value);
          }}
          labelFormatter={(v) => (v ? formatDate(String(v)) : "")}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Bar yAxisId="spend" dataKey="spend" name="Investimento" fill="var(--primary)" radius={4} />
        <Line
          yAxisId="leads"
          type="monotone"
          dataKey="leads"
          name="Leads"
          stroke="var(--accent-cyan)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="cpl"
          type="monotone"
          dataKey="cpl"
          name="CPL"
          stroke="var(--accent-amber)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
