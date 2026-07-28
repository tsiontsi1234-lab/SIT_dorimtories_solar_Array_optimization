/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BookOpen, Info, Hash, GraduationCap, Sun } from "lucide-react";

export const EducationPanel: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4 text-slate-300 text-xs h-full animate-fade-in" id="educational-theory-panel">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm tracking-tight uppercase">
          <GraduationCap className="w-5 h-5 text-cyan-400" />
          Solar Geometry & Physics Theory
        </h3>
      </div>

      <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin">
        {/* Concept 1: Sun Coordinates */}
        <div className="flex gap-2.5">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-100 block mb-0.5">Sun Coordinate System</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The sun's position in the horizontal coordinate system is defined by:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-400 text-[11px]">
              <li>
                <strong className="text-slate-200">Elevation (α):</strong> The vertical angle above the flat horizon, from 0° (sunset/sunrise) to 90° (directly overhead).
              </li>
              <li>
                <strong className="text-slate-200">Azimuth (A):</strong> The horizontal angle measured clockwise from North (North = 0°, East = 90°, South = 180°, West = 270°).
              </li>
            </ul>
          </div>
        </div>

        {/* Concept 2: Normal Vector */}
        <div className="flex gap-2.5 border-t border-slate-800 pt-3">
          <Hash className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-100 block mb-0.5">Panel Normal Vector (N)</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The normal vector represents a unit-length arrow pointing directly perpendicular to the active photovoltaic surface. 
              Its horizontal angle matches the panel's azimuth (γ), and its vertical pitch is determined by the panel's tilt (β).
            </p>
          </div>
        </div>

        {/* Concept 3: Angle of Incidence and Cosine Losses */}
        <div className="flex gap-2.5 border-t border-slate-800 pt-3">
          <BookOpen className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-100 block mb-0.5">The Cosine Loss Law</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The energy capture of any PV surface depends on the angle of incidence (θ) between the sun's rays (S) and the surface normal (N). This is represented by the vector dot product:
            </p>
            <div className="my-2 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-center text-cyan-400 text-[11px]">
              Captured Power ∝ max(0, Sunlight • Panel Normal) = cos(θ)
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              If θ = 0° (perpendicular sun), cos(0) = 1.0 (100% of available light is captured). 
              If the sun is tilted at θ = 60°, then cos(60°) = 0.5, which represents a <strong className="text-rose-400">50% geometric reduction</strong> in solar energy harvesting, even on a perfectly clear day!
            </p>
          </div>
        </div>

        {/* Concept 4: Tracking Advantages */}
        <div className="flex gap-2.5 border-t border-slate-800 pt-3">
          <Sun className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-100 block mb-0.5">Why Sun-Tracking Works</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              A fixed-tilt panel can only be perfectly aligned with the sun once per day (usually at solar noon). During mornings and afternoons, it suffers massive cosine losses. 
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px] mt-1.5">
              An active <strong className="text-emerald-400">Sun-Tracking System</strong> continuously rotates around its axis to maintain θ = 0° throughout the entire day. By keeping cos(θ) = 1.0 from sunrise to sunset, tracking systems capture a much wider solar profile, widening the "bell curve" of power production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
