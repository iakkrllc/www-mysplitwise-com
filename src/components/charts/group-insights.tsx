"use client";

import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { getCategory } from "@/lib/categories";
import { formatMoney, round2 } from "@/lib/calculations";
import { UserAvatar } from "../user-avatar";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";

export function GroupInsights({ groupId }: { groupId: string }) {
  const { state, baseExpenses, getGroup, getUser } = useStore();
  const { openModal } = useUI();
  const base = state.baseCurrency;
  const group = getGroup(groupId);

  const ge = useMemo(
    () =>
      baseExpenses.filter((e) => e.groupId === groupId && !e.isSettlement),
    [baseExpenses, groupId],
  );

  const catData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of ge) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .map(([cat, value]) => ({
        id: cat,
        name: getCategory(cat).name,
        value: round2(value),
        color: getCategory(cat).color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [ge]);

  const total = useMemo(
    () => round2(catData.reduce((a, c) => a + c.value, 0)),
    [catData],
  );

  const spenders = useMemo(() => {
    if (!group) return [];
    const map = new Map<string, number>();
    for (const id of group.memberIds) map.set(id, 0);
    for (const e of ge) {
      for (const s of e.shares) {
        if (map.has(s.userId)) map.set(s.userId, (map.get(s.userId) ?? 0) + s.paid);
      }
    }
    const max = Math.max(1, ...Array.from(map.values()));
    return group.memberIds
      .map((id) => ({ id, paid: round2(map.get(id) ?? 0), pct: ((map.get(id) ?? 0) / max) * 100 }))
      .sort((a, b) => b.paid - a.paid);
  }, [group, ge]);

  const monthSpend = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return round2(
      ge.filter((e) => e.date.slice(0, 7) === ym).reduce((a, e) => a + e.amount, 0),
    );
  }, [ge]);

  if (!group || ge.length === 0) return null;

  const budget = group.monthlyBudget ?? 0;
  const pct = budget > 0 ? Math.min(100, (monthSpend / budget) * 100) : 0;
  const over = budget > 0 && monthSpend > budget;
  const barColor = over
    ? "hsl(var(--sw-orange))"
    : pct > 80
      ? "#E4A85B"
      : "hsl(var(--sw-green-strong))";

  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Group insights
      </h2>

      {/* Budget tracker */}
      <div className="mb-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-sw-charcoal">
            <Target className="h-4 w-4 text-primary" /> Monthly budget
          </h3>
          <button
            type="button"
            onClick={() => openModal({ kind: "createGroup", editId: group.id })}
            className="text-xs font-bold text-primary hover:underline"
          >
            {budget > 0 ? "Edit" : "Set budget"}
          </button>
        </div>

        {budget > 0 ? (
          <>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-2xl font-extrabold text-sw-charcoal">
                {formatMoney(monthSpend, base)}
              </span>
              <span className="text-sm text-muted-foreground">
                of {formatMoney(budget, base)} · {monthName}
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(2, pct)}%`, backgroundColor: barColor }}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-xs font-semibold",
                over ? "text-owe" : "text-muted-foreground",
              )}
            >
              {over
                ? `Over budget by ${formatMoney(monthSpend - budget, base)}`
                : `${formatMoney(budget - monthSpend, base)} left this month`}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Set a monthly budget to track this group&apos;s spending against a
            target.
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Category donut */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-bold text-sw-charcoal">Spending by category</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Total {formatMoney(total, base)} across the group
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-[170px] w-[170px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={80}
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
        </div>

        {/* Top spenders */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-bold text-sw-charcoal">Who paid the most</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Total paid into the group
          </p>
          <div className="space-y-3">
            {spenders.map((s) => {
              const u = getUser(s.id);
              if (!u) return null;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <UserAvatar user={u} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-semibold text-sw-charcoal">
                        {u.id === state.currentUserId ? "You" : u.name.split(" ")[0]}
                      </span>
                      <span className="text-sm font-bold text-sw-charcoal">
                        {formatMoney(s.paid, base)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(3, s.pct)}%`,
                          backgroundColor: u.avatarColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
