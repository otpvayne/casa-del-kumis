import { ReactNode } from "react";

type Props = {
  title: string;
  value: number;
  icon?: ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
};

export function KpiCard({ title, value, icon, subtitle, trend }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-white/60 mb-1">{title}</p>
          <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
          
          {subtitle && (
            <p className="text-xs text-white/40 mt-2">{subtitle}</p>
          )}
          
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-medium ${
                trend.isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-white/40">vs mes anterior</span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="text-white/20 text-2xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}