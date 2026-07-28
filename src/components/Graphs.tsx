/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { DayPowerData, ElevationData, YearlyResults } from "../types";
import { BarChart3, TrendingUp, Sun, Lightbulb } from "lucide-react";

interface GraphsProps {
  dayPowerData: DayPowerData[];
  elevationData: ElevationData[];
  yearlyResults: YearlyResults | null;
  currentHour: number;
}

export const Graphs: React.FC<GraphsProps> = ({
  dayPowerData,
  elevationData,
  yearlyResults,
  currentHour,
}) => {
  const [activeTab, setActiveTab] = useState<"daily" | "yearly" | "sun">("daily");

  const formatHour = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg shadow-xl text-xs font-mono">
          <div className="font-bold text-slate-200 mb-1">Time: {formatHour(label)}</div>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-4 mt-0.5">
              <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}:
              </span>
              <span className="font-bold text-white">
                {p.value.toLocaleString()} {p.unit || "W"}
              </span>
            </div>
          ))}
        </div>
      );
    };
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-5" id="engineering-analysis-charts">
      {/* Header and Tab Selection */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm uppercase tracking-tight">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Engineering Graphs & Performance Analysis
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time calculations based on active coordinates and direct solar radiation integration.
          </p>
        </div>

        {/* Chart Toggles */}
        <div className="flex bg-slate-950 p-1 rounded bg-opacity-40 border border-slate-800 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
              activeTab === "daily"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Daily Power
          </button>
          <button
            onClick={() => setActiveTab("yearly")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
              activeTab === "yearly"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Yearly Energy Optimization
          </button>
          <button
            onClick={() => setActiveTab("sun")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
              activeTab === "sun"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Solar Path
          </button>
        </div>
      </div>

      {/* Main Charts Content */}
      <div className="h-[280px]">
        {activeTab === "daily" && (
          <div className="w-full h-full grid grid-cols-1 lg:grid-cols-1 gap-5">
            <div className="w-full h-full relative">
              <div className="absolute top-0 right-2 z-10 text-[10px] text-slate-500 font-mono flex items-center gap-2">
                <span>Solid lines = Current Day power output</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayPowerData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFixed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorTracking" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(tick) => `${Math.floor(tick)}h`}
                    tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                    stroke="#334155"
                  />
                  <YAxis 
                    tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                    stroke="#334155"
                    unit="W"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={28}
                    wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                  />
                  <Area 
                    type="monotone" 
                    name="Fixed-Tilt Panel" 
                    dataKey="fixedPower" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFixed)" 
                    unit="W"
                  />
                  <Area 
                    type="monotone" 
                    name="Sun-Tracking Panel" 
                    dataKey="trackingPower" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTracking)" 
                    unit="W"
                  />
                  {/* Vertical line marking the current time of day */}
                  <ReferenceLine 
                    x={currentHour} 
                    stroke="#ef4444" 
                    strokeDasharray="3 3" 
                    label={{ value: "Now", fill: "#f87171", fontSize: 9, position: "top" }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "yearly" && (
          <div className="w-full h-full">
            {yearlyResults ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full">
                {/* Curve Plot: Yearly Energy vs. Tilt Angle (takes 2 cols) */}
                <div className="col-span-1 md:col-span-2 h-full relative">
                  <div className="absolute top-0 left-12 z-10 text-[10px] bg-cyan-950/80 border border-cyan-900/50 px-2 py-0.5 rounded text-cyan-300 font-semibold flex items-center gap-1 shadow-md">
                    <Lightbulb className="w-3 h-3" />
                    Optimal Fixed Tilt: {yearlyResults.optimalTilt}°
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyResults.energyByTilt} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="tilt" 
                        label={{ value: "Fixed Panel Tilt Angle (deg)", fill: "#64748b", fontSize: 10, position: "insideBottom", offset: -5 }}
                        tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                        stroke="#334155"
                      />
                      <YAxis 
                        tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                        stroke="#334155"
                        label={{ value: "Yearly Energy (kWh/year)", fill: "#64748b", angle: -90, position: "insideLeft", offset: 12, style: { textAnchor: 'middle', fontSize: 10 } }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                                <div>Tilt: <span className="text-white font-bold">{payload[0].payload.tilt}°</span></div>
                                <div className="text-indigo-400 mt-0.5">Energy: <span className="font-bold text-white">{payload[0].value} kWh/year</span></div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="energy" 
                        name="Annual Fixed Energy" 
                        stroke="#22d3ee" 
                        strokeWidth={2.5}
                        dot={false}
                      />
                      {/* Highlight Optimal tilt */}
                      <ReferenceLine 
                        x={yearlyResults.optimalTilt} 
                        stroke="#f59e0b" 
                        strokeDasharray="4 4" 
                        label={{ value: `Optimal: ${yearlyResults.optimalTilt}°`, fill: "#f59e0b", fontSize: 10, position: "top" }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart: Comparison */}
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyResults.comparisonData} margin={{ top: 20, right: 5, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: "#94a3b8", fontSize: 8 }}
                        stroke="#334155"
                      />
                      <YAxis 
                        tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                        stroke="#334155"
                        unit=" kWh"
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                                <div className="font-bold text-slate-200 mb-1">{payload[0].name}</div>
                                <div className="text-amber-400">Yield: <span className="text-white font-bold">{payload[0].value.toLocaleString()} kWh/year</span></div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                      >
                        <Cell fill="#06b6d4" />
                        <Cell fill="#f59e0b" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center items-center gap-2 border border-dashed border-slate-800 rounded-lg bg-slate-950/40 text-slate-400 text-xs">
                <span>No full-year simulation data available.</span>
                <span className="text-[10px] text-cyan-400">
                  Click the "Run Annual Analysis" button to generate optimization data.
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === "sun" && (
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(tick) => `${Math.floor(tick)}h`}
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                  stroke="#334155"
                />
                <YAxis 
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                  stroke="#334155"
                  unit="°"
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                          <div className="text-slate-200">Time: {formatHour(label)}</div>
                          <div className="text-emerald-400 mt-0.5">Elevation: <span className="font-bold text-white">{payload[0].value}°</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  name="Sun Elevation Angle" 
                  dataKey="elevation" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorElevation)"
                />
                <ReferenceLine 
                  x={currentHour} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  label={{ value: "Now", fill: "#f87171", fontSize: 9, position: "top" }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
