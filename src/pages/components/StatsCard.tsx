import React from "react";

interface StatsCardProps {
  label: string;
  count: number;
  colorClass: string;
  icon?: React.ReactNode;
  primaryHex: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  count,
  colorClass,
  icon,
  primaryHex,
}) => {
  return (
    <div
      className="group relative bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden flex justify-between items-start"
    >
      {/* Decorative corner glow using primary theme color */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full filter blur-[40px] opacity-10 transition-opacity duration-300 group-hover:opacity-20"
        style={{ backgroundColor: primaryHex }}
      />
      
      {/* Top border colored highlight accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
        style={{
          backgroundColor: colorClass.includes("red")
            ? "#f87171"
            : colorClass.includes("emerald")
            ? "#34d399"
            : primaryHex,
        }}
      />

      <div className="space-y-2.5">
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
          {label}
        </span>
        <h3 className={`text-2xl font-black tracking-tight leading-none ${colorClass}`}>
          {count} <span className="text-xs font-bold text-slate-400">Objectives</span>
        </h3>
      </div>

      {icon && (
        <div
          className="p-3.5 rounded-xl border transition-colors duration-300 flex items-center justify-center"
          style={{
            color: colorClass.includes("red")
              ? "#ef4444"
              : colorClass.includes("emerald")
              ? "#10b981"
              : primaryHex,
            backgroundColor: colorClass.includes("red")
              ? "#fef2f2"
              : colorClass.includes("emerald")
              ? "#ecfdf5"
              : `${primaryHex}10`,
            borderColor: colorClass.includes("red")
              ? "#fee2e2"
              : colorClass.includes("emerald")
              ? "#d1fae5"
              : `${primaryHex}20`,
          }}
        >
          {icon}
        </div>
      )}
    </div>
  );
};
