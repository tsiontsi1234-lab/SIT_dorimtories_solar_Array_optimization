/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { YearlyResults, TRACKER_EXTRA_COST } from "../types";
import { TrendingUp, DollarSign, Award, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface ResultsPanelProps {
  yearlyResults: YearlyResults | null;
  latitude: number;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ yearlyResults, latitude }) => {
  if (!yearlyResults) {
    return (
      <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-6 text-center text-slate-400 flex flex-col items-center justify-center gap-3 min-h-[140px]" id="results-panel-empty">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin-slow" />
        <div>
          <div className="font-semibold text-slate-300">Annual Analysis Pending</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Click the <strong className="text-cyan-400">"Run Annual Analysis"</strong> button above to calculate the mathematical optimum tilt and execute the year-round performance comparison.
          </p>
        </div>
      </div>
    );
  }

  const {
    optimalTilt,
    fixedYearlyEnergy,
    trackingYearlyEnergy,
    improvementPercent,
  } = yearlyResults;

  // Assuming an average energy cost of $0.18 per kWh for commercial/residential dorm use
  const electricityRate = 0.18;
  const fixedAnnualSavings = fixedYearlyEnergy * electricityRate;
  const trackingAnnualSavings = trackingYearlyEnergy * electricityRate;
  const incrementalSavings = trackingAnnualSavings - fixedAnnualSavings;
  const paybackYears = TRACKER_EXTRA_COST / incrementalSavings;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-6" id="final-results-analysis-report">
      {/* Title */}
      <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm uppercase tracking-tight">
          <Award className="w-5 h-5 text-amber-500" />
          Executive Optimization Report: Yearly Yield & Financial Feasibility
        </h3>
        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
          Analysis Complete
        </span>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1. Optimal Fixed Tilt */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Optimal Fixed Tilt</div>
            <div className="text-3xl font-black text-cyan-400 font-mono mt-1">{optimalTilt}°</div>
          </div>
          <div className="text-[10px] text-slate-400 font-sans mt-3 border-t border-slate-900 pt-2 leading-relaxed">
            Optimized for Latitude {latitude}°N facing South ($180^\circ$ azimuth).
          </div>
        </div>

        {/* 2. Fixed Energy */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500" /> Fixed Annual Yield
            </div>
            <div className="text-xl font-bold text-slate-100 font-mono mt-1">
              {Math.round(fixedYearlyEnergy).toLocaleString()} <span className="text-xs text-slate-400">kWh</span>
            </div>
          </div>
          <div className="text-[10px] text-cyan-400 font-mono mt-3 border-t border-slate-900 pt-2 flex justify-between">
            <span>Value:</span>
            <span className="font-bold">${fixedAnnualSavings.toFixed(2)} / yr</span>
          </div>
        </div>

        {/* 3. Tracking Energy */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Tracking Annual Yield
            </div>
            <div className="text-xl font-bold text-slate-100 font-mono mt-1">
              {Math.round(trackingYearlyEnergy).toLocaleString()} <span className="text-xs text-slate-400">kWh</span>
            </div>
          </div>
          <div className="text-[10px] text-amber-400 font-mono mt-3 border-t border-slate-900 pt-2 flex justify-between">
            <span>Value:</span>
            <span className="font-bold">${trackingAnnualSavings.toFixed(2)} / yr</span>
          </div>
        </div>

        {/* 4. Improvement Percent */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Net Gain
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">
              +{improvementPercent}%
            </div>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-3 border-t border-slate-900 pt-2 flex justify-between">
            <span>Inc. Savings:</span>
            <span className="font-bold">+${incrementalSavings.toFixed(2)} / yr</span>
          </div>
        </div>
      </div>

      {/* Financial Feasibility Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Financial Amortization (Tracking vs Fixed)
          </div>

          <div className="flex flex-col gap-3 font-mono text-[11px] text-slate-400">
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span>Upfront Capital Premium (Est.):</span>
              <span className="text-slate-200 font-bold">${TRACKER_EXTRA_COST.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span>Annual Incremental Revenue:</span>
              <span className="text-emerald-400 font-bold">+${incrementalSavings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span>Average Utility Rate Base:</span>
              <span className="text-slate-200">${electricityRate.toFixed(2)} / kWh</span>
            </div>
            <div className="flex justify-between font-semibold pt-1">
              <span className="text-slate-300">Capital Amortization Period:</span>
              <span className="text-amber-500 font-bold">{paybackYears.toFixed(1)} Years</span>
            </div>
          </div>

          <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[10px] text-slate-500 italic">
            *Payback time assumes dual-axis active actuators, standard maintenance coefficients, and steady 2026 tariff structures.
          </div>
        </div>

        {/* Engineering Advisory Advisory */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col justify-between gap-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-cyan-400" /> SIT Dormitories Engineering Advisory
          </div>

          <div className="text-xs text-slate-400 leading-relaxed space-y-2">
            <p>
              Our 3D solar array optimization models confirm that <strong className="text-amber-400">Sun-Tracking produces approximately {Math.round(improvementPercent)}% more annual energy</strong> than a statically positioned fixed-tilt array, even when the latter is positioned at its absolute mathematical optimum tilt of <strong className="text-cyan-400">{optimalTilt}°</strong>.
            </p>
            <p>
              However, from an engineering feasibility standpoint, the tracking mechanism introduces an estimated upfront capital premium of <strong className="text-slate-200">${TRACKER_EXTRA_COST} per panel</strong> alongside active electric motors, wind-shear structural reinforcement, and ongoing mechanical maintenance overhead.
            </p>
          </div>

          <div className="flex gap-3 bg-slate-900/60 p-3.5 border border-slate-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400">
              <strong className="text-slate-200 block mb-0.5 font-semibold">Recommendation Summary:</strong>
              "Tracking produces approximately {Math.round(improvementPercent)}% more annual energy. Depending on installation and maintenance costs, a fixed system may offer the better return on investment for budget-limited projects, while a tracking system is preferable when maximizing energy production is the primary objective."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
