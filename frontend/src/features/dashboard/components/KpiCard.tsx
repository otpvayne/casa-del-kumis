import { ReactNode } from "react";

type Props = {
  title: string;
  value: number;
  icon?: ReactNode;
  subtitle?: string;
  badge?: {
    label: string;
    tone?: "neutral" | "success" | "warning" | "danger" | "info";
  };
};

const toneClass: Record<NonNullable<Props["badge"]>["tone"], string> = {
  neutral: "bg-white/10 text-white/70 border-white/10",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  danger: "bg-red-500/15 text-red-300 border-red-500/20",
  info: "bg-sky-500/15 text-sky-300 border-sky-500/20",
};

export function KpiCard({ title, value, icon, subtitle, badge }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-white/60">{title}</p>
            {badge && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${toneClass[badge.tone ?? "neutral"]}`}
              >
                {badge.label}
              </span>
            )}
          </div>

          <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>

          {subtitle && <p className="text-xs text-white/40 mt-2">{subtitle}</p>}
        </div>

        {icon && <div className="text-white/20 text-2xl">{icon}</div>}
      </div>
    </div>
  );
}
