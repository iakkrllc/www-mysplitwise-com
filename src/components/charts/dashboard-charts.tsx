"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { getCategory } from "@/lib/categories";
import { formatMoney, round2 } from "@/lib/calculations";
import { getCurrency } from "@/lib/currency";

export function DashboardCharts() {
  const { baseExpenses, currentUser, state } = useStore();
  const base = state.baseCurrency;
  const sym = getCurrency(base).symbol;
  const axisFmt = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000) return `${v < 0 ? "-" : ""}${sym}${(abs / 1000).toFixed(1)}k`;
    return `${v < 0 ? "-" : ""}${sym}${Math.round(abs)}`;
  };

  const catData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of baseExpenses) {
      if (e.isSettlement) continue;
      const my = e.shares.find((s) => s.userId === currentUser.id);
      if (!my || my.owed <= 0) continue;
      map.set(e.category, (map.get(e.category) ?? 0) + my.owed);
    }
    return Array.from(map.entries())
      .map(([cat, value]) => ({
        id: cat,
        name: getCategory(cat).name,
        value: round2(value),
        color: getCategory(cat).color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [baseExpenses, currentUser.id]);

  const totalSpend = useMemo(
    () => round2(catData.reduce((a, c) => a + c.value, 0)),
    [catData],
  );

  const timeData = useMemo(() => {
    const sorted = [...baseExpenses].sort(
      (a, b) => +new Date(a.date) - +new Date(b.date),
    );
    let running = 0;
    const byDate = new Map<string, number>();
    for (const e of sorted) {
      const my = e.shares.find((s) => s.userId === currentUser.id);
      if (my) running += my.paid - my.owed;
      byDate.set(e.date, round2(running));
    }
    return Array.from(byDate.entries()).map(([date, balance]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      balance,
    }));
  }, [baseExpenses, currentUser.id]);

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Insights
      </h2>
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Spending by category */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-bold text-sw-charcoal">Your spending by category</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Your share of all expenses
          </p>
          {catData.length === 0 ? (
            <EmptyChart label="No spending yet" />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {catData.map((d) => (
                        <Cell key={d.id} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload as (typeof catData)[number];
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs shadow-md">
                            <span className="font-bold">{p.name}</span>:{" "}
                            {formatMoney(p.value, base)}
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </span>
                  <span className="text-base font-extrabold text-sw-charcoal">
                    {formatMoney(totalSpend, base)}
                  </span>
                </div>
              </div>
              <div className="grid w-full grid-cols-1 gap-1.5">
                {catData.slice(0, 6).map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="flex-1 truncate text-sw-charcoal">
                      {d.name}
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {formatMoney(d.value, base)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Balance over time */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-bold text-sw-charcoal">Your balance over time</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Cumulative net balance
          </p>
          {timeData.length === 0 ? (
            <EmptyChart label="No activity yet" />
          ) : (
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--sw-green-strong))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--sw-green-strong))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--sw-gray))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--sw-gray))" }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={axisFmt}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const v = payload[0].value as number;
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs shadow-md">
                          <div className="font-semibold text-muted-foreground">
                            {label}
                          </div>
                          <div
                            className={
                              v >= 0 ? "font-bold text-owed" : "font-bold text-owe"
                            }
                          >
                            {v >= 0 ? "owed " : "owe "}
                            {formatMoney(Math.abs(v), base)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--sw-green-strong))"
                    strokeWidth={2.5}
                    fill="url(#balFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
