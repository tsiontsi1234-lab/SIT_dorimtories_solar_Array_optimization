/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  Sun, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Globe, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award,
  Zap,
  ChevronRight,
  Gauge
} from "lucide-react";
import { Solar3DView } from "./components/Solar3DView";
import { DataPanel } from "./components/DataPanel";
import { Graphs } from "./components/Graphs";
import { EducationPanel } from "./components/EducationPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { PANEL_AREA, PANEL_EFFICIENCY } from "./types";
import { 
  getSolarDeclination, 
  getHourAngle, 
  getSolarElevation, 
  getSolarAzimuth, 
  getSolarIntensity, 
  getPanelNormal, 
  getSunVector, 
  calculatePower, 
  calculateDayData, 
  calculateElevationData, 
  runYearlyCalculation 
} from "./utils/solarMath";

export default function App() {
  // 1. Simulation Coordinate and Control States
  const [latitude, setLatitude] = useState<number>(38.0); // 38.0° N (Dormitory/Central US latitude)
  const [dayOfYear, setDayOfYear] = useState<number>(191);  // July 10 (Day 191)
  const [timeOfDay, setTimeOfDay] = useState<number>(12.0); // 12:00 PM (Solar Noon)
  const [fixedTilt, setFixedTilt] = useState<number>(30);   // 30 degrees tilt from horizontal
  const [fixedAzimuth, setFixedAzimuth] = useState<number>(180); // 180 degrees (facing South)
  const [simSpeed, setSimSpeed] = useState<number>(1.0);     // 1.0 hour per real-second
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // 2. Yearly Simulation Optimization states
  const [isSimulatingYearly, setIsSimulatingYearly] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [yearlyResults, setYearlyResults] = useState<any>(null);

  // 3. Keep track of simulated clock animation
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const elapsedMs = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isRunning && !isSimulatingYearly) {
        // Increment time based on simulation speed
        // Speed is "hours of simulation per real-time second"
        const hoursDelta = (elapsedMs / 1000) * simSpeed;
        setTimeOfDay((prevTime) => {
          let nextTime = prevTime + hoursDelta;
          if (nextTime >= 24) {
            nextTime -= 24;
            // Advance calendar day
            setDayOfYear((prevDay) => {
              let nextDay = prevDay + 1;
              if (nextDay > 365) nextDay = 1;
              return nextDay;
            });
          }
          return nextTime;
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    if (isRunning) {
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      lastTimeRef.current = null;
    };
  }, [isRunning, simSpeed, isSimulatingYearly]);

  // Handle Play / Pause / Reset Toggles
  const handleTogglePlay = () => {
    setIsRunning(!isRunning);
  };

  const handleResetSimulation = () => {
    setIsRunning(false);
    setTimeOfDay(12.0); // Reset to Noon
    setDayOfYear(191);   // Reset to July 10
    setLatitude(38.0);  // Reset Latitude
    setFixedTilt(30);   // Reset Fixed Tilt
    setFixedAzimuth(180); // Reset Azimuth to South
    setSimSpeed(1.0);
  };

  // Run the full 365-day integration optimization sequence
  const handleRunYearlySimulation = () => {
    setIsRunning(false);
    setIsSimulatingYearly(true);
    setSimulationProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setSimulationProgress(Math.min(100, progress));

      if (progress >= 100) {
        clearInterval(interval);
        // Execute the fast, exact mathematical integration
        const results = runYearlyCalculation(latitude, fixedAzimuth);
        setYearlyResults(results);
        setIsSimulatingYearly(false);
      }
    }, 80); // takes about 1.6 seconds to climb to 100% (feels premium, authentic, and scientific)
  };

  // Calculate instant daily accumulated energy (Wh) up to the current timeOfDay
  const getDailyAccumulatedEnergy = (isTracking: boolean) => {
    let wh = 0;
    const step = 0.1; // hours resolution
    const latRad = latitude * (Math.PI / 180);
    const declinationRad = getSolarDeclination(dayOfYear);
    const beta = fixedTilt * (Math.PI / 180);
    const gamma = fixedAzimuth * (Math.PI / 180);
    const fixedNormal = getPanelNormal(beta, gamma);

    for (let h = 0; h < timeOfDay; h += step) {
      const H = getHourAngle(h);
      const elevation = getSolarElevation(latRad, declinationRad, H);
      if (elevation <= 0) continue;

      const azimuth = getSolarAzimuth(latRad, declinationRad, H);
      const sunVec = getSunVector(elevation, azimuth);
      const intensity = getSolarIntensity(elevation);

      if (isTracking) {
        wh += intensity * PANEL_AREA * PANEL_EFFICIENCY * step;
      } else {
        const { power } = calculatePower(intensity, sunVec, fixedNormal);
        wh += power * step;
      }
    }
    return wh;
  };

  const accumulatedFixedWh = getDailyAccumulatedEnergy(false);
  const accumulatedTrackingWh = getDailyAccumulatedEnergy(true);

  // Generate Recharts daily data arrays on the fly
  const dayPowerData = calculateDayData(dayOfYear, latitude, fixedTilt, fixedAzimuth);
  const elevationData = calculateElevationData(dayOfYear, latitude);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-300 font-sans p-4 sm:p-6 flex flex-col gap-5" id="solar-sim-root">
      {/* 1. Header */}
      <header className="border-b border-slate-800 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0">
              <Sun className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold font-mono leading-none mb-1">Engineering Visualization Tool</span>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white font-display">
                SIT Dormitories: Solar Array Optimization System
              </h1>
            </div>
          </div>
        </div>

        {/* Right Info widgets */}
        <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
          <div className="flex items-center gap-2 bg-slate-900/40 px-3 py-1.5 rounded border border-slate-800/60">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-mono uppercase text-slate-300">Simulation Engine Active</span>
          </div>
          <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-cyan-400 font-bold">
            v4.1.2-STABLE
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Side: Controls Column (xl:col-span-4) */}
        <div className="xl:col-span-4 flex flex-col gap-5 bg-slate-900/50 border border-slate-800 p-4 rounded-lg shadow-lg h-full" id="sim-control-panel">
          
          {/* Section 1: Global Parameters */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-display">
                Global Parameters
              </h3>
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
            </div>

            <div className="flex flex-col gap-4">
              {/* Control 1: Latitude */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">LATITUDE</span>
                  <span className="font-mono text-cyan-400 font-bold">{latitude.toFixed(4)}° N</span>
                </div>
                <input 
                  type="range" 
                  min="-90" 
                  max="90" 
                  step="0.5"
                  value={latitude} 
                  onChange={(e) => {
                    setLatitude(parseFloat(e.target.value));
                    setYearlyResults(null); // Reset results since parameter changed
                  }}
                  className="w-full accent-cyan-500 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                  id="latitude-slider"
                />
              </div>

              {/* Control 2: Day of the Year */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">DAY OF YEAR</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Math.floor(dayOfYear)} ({dayOfYear === 172 ? "SOLSTICE" : dayOfYear === 80 || dayOfYear === 264 ? "EQUINOX" : "JULY 10"})
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="365" 
                  step="1"
                  value={dayOfYear} 
                  onChange={(e) => setDayOfYear(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                  id="day-of-year-slider"
                />
              </div>

              {/* Control 3: Time of Day */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">TIME OF DAY</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Math.floor(timeOfDay).toString().padStart(2, "0")}:
                    {Math.floor((timeOfDay % 1) * 60).toString().padStart(2, "0")} {timeOfDay >= 12 ? "PM" : "AM"}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="24" 
                  step="0.1"
                  value={timeOfDay} 
                  onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                  id="time-of-day-slider"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Panel Configuration */}
          <section className="flex flex-col gap-4 border-t border-slate-800 pt-3.5">
            <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-display">
                Panel Configuration
              </h3>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            </div>

            <div className="flex flex-col gap-4">
              {/* Control 4: Fixed Tilt Angle */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">FIXED TILT ANGLE</span>
                  <span className="font-mono text-amber-400 font-bold">{fixedTilt.toFixed(1)}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="90" 
                  step="1"
                  value={fixedTilt} 
                  onChange={(e) => {
                    setFixedTilt(parseInt(e.target.value));
                    setYearlyResults(null); // Reset results since parameter changed
                  }}
                  className="w-full accent-amber-500 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                  id="fixed-tilt-slider"
                />
              </div>

              {/* Control 5: Fixed Azimuth Angle */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">AZIMUTH (S=0°)</span>
                  <span className="font-mono text-amber-400 font-bold">{fixedAzimuth}° ({fixedAzimuth === 180 ? "S" : fixedAzimuth === 90 ? "E" : fixedAzimuth === 270 ? "W" : fixedAzimuth === 0 || fixedAzimuth === 360 ? "N" : "AZIM"})</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  step="5"
                  value={fixedAzimuth} 
                  onChange={(e) => {
                    setFixedAzimuth(parseInt(e.target.value));
                    setYearlyResults(null); // Reset results since parameter changed
                  }}
                  className="w-full accent-amber-500 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                  id="fixed-azimuth-slider"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Speed & Controls */}
          <section className="flex flex-col gap-3.5 border-t border-slate-800 pt-3.5 mt-auto">
            {/* Playback speed */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-semibold uppercase">Playback Speed</span>
                <span className="font-mono text-cyan-400 font-bold">{simSpeed.toFixed(1)} hrs/sec</span>
              </div>
              <input 
                type="range" 
                min="0.2" 
                max="5.0" 
                step="0.2"
                value={simSpeed} 
                onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                id="playback-speed-slider"
              />
            </div>

            {/* Play and Reset buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleTogglePlay}
                disabled={isSimulatingYearly}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded font-display text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider ${
                  isRunning 
                    ? "bg-amber-600 hover:bg-amber-500 text-white" 
                    : "bg-cyan-600 hover:bg-cyan-500 text-white"
                }`}
                id="play-pause-btn"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> Pause Cycle
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Play Solar Cycle
                  </>
                )}
              </button>

              <button
                onClick={handleResetSimulation}
                disabled={isSimulatingYearly}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded font-display text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                id="reset-simulation-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Simulation
              </button>
            </div>

            {/* Run annual calculation */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRunYearlySimulation}
                disabled={isSimulatingYearly}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-display"
                id="run-yearly-simulation-btn"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                {isSimulatingYearly ? "Simulating 365 Days..." : "Run Annual Analysis"}
              </button>

              {isSimulatingYearly && (
                <div className="flex flex-col gap-1.5" id="simulation-progress-bar-container">
                  <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden border border-slate-850">
                    <div 
                      className="bg-cyan-500 h-full rounded transition-all duration-100"
                      style={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Integrating paths...</span>
                    <span className="font-bold text-cyan-400">{simulationProgress}%</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Center/Right: 3D Scene View & Live Data Panel (xl:col-span-8) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* 3D Visual Stage (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <Solar3DView 
                latitude={latitude}
                dayOfYear={dayOfYear}
                timeOfDay={timeOfDay}
                fixedTilt={fixedTilt}
                fixedAzimuth={fixedAzimuth}
              />
            </div>

            {/* Live Data Panel (5 cols) */}
            <div className="lg:col-span-5">
              <DataPanel 
                latitude={latitude}
                dayOfYear={dayOfYear}
                timeOfDay={timeOfDay}
                fixedTilt={fixedTilt}
                fixedAzimuth={fixedAzimuth}
                accumulatedFixedWh={accumulatedFixedWh}
                accumulatedTrackingWh={accumulatedTrackingWh}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Lower Grid: Graphs, Educational explanation and comparative report */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Engineering Graphs (xl:col-span-8) */}
        <div className="xl:col-span-8">
          <Graphs 
            dayPowerData={dayPowerData}
            elevationData={elevationData}
            yearlyResults={yearlyResults}
            currentHour={timeOfDay}
          />
        </div>

        {/* Educational theory handbook (xl:col-span-4) */}
        <div className="xl:col-span-4 h-full">
          <EducationPanel />
        </div>
      </div>

      {/* 4. Comparative Optimization Results (appears/updates once simulation runs) */}
      <div className="w-full">
        <ResultsPanel 
          yearlyResults={yearlyResults}
          latitude={latitude}
        />
      </div>

      {/* 5. Footer and Credentials */}
      <footer className="border-t border-slate-900 mt-6 pt-5 pb-2 text-center flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-500 font-mono">
        <span>© 2026 SIT Dormitories Solar Optimization Laboratory</span>
        <span>Lead Researcher: Engineering Capstone Program</span>
      </footer>
    </div>
  );
}
