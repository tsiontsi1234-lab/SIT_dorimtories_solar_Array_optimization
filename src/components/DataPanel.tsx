/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sun, Calendar, Clock, Compass, Activity, Bolt } from "lucide-react";
import { getSolarDeclination, getHourAngle, getSolarElevation, getSolarAzimuth, getSolarIntensity, getPanelNormal, getSunVector, calculatePower } from "../utils/solarMath";

interface DataPanelProps {
  latitude: number;
  dayOfYear: number;
  timeOfDay: number;
  fixedTilt: number;
  fixedAzimuth: number;
  accumulatedFixedWh: number;
  accumulatedTrackingWh: number;
}

// Convert day of year to calendar date string
function getCalendarDate(day: number): string {
  const months = [
    { name: "January", days: 31 },
    { name: "February", days: 28 },
    { name: "March", days: 31 },
    { name: "April", days: 30 },
    { name: "May", days: 31 },
    { name: "June", days: 30 },
    { name: "July", days: 31 },
    { name: "August", days: 31 },
    { name: "September", days: 30 },
    { name: "October", days: 31 },
    { name: "November", days: 30 },
    { name: "December", days: 31 },
  ];
  
  let tempDay = Math.floor(day);
  if (tempDay < 1) tempDay = 1;
  if (tempDay > 365) tempDay = 365;
  
  let currentMonth = "";
  let monthDay = 0;
  
  let accum = 0;
  for (const m of months) {
    if (tempDay <= accum + m.days) {
      currentMonth = m.name;
      monthDay = tempDay - accum;
      break;
    }
    accum += m.days;
  }
  
  return `${currentMonth} ${monthDay}`;
}

// Convert decimal hours to HH:MM format
function formatSolarTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const hStr = h.toString().padStart(2, "0");
  const mStr = m.toString().padStart(2, "0");
  return `${hStr}:${mStr}`;
}

export const DataPanel: React.FC<DataPanelProps> = ({
  latitude,
  dayOfYear,
  timeOfDay,
  fixedTilt,
  fixedAzimuth,
  accumulatedFixedWh,
  accumulatedTrackingWh,
}) => {
  const latRad = latitude * (Math.PI / 180);
  const declinationRad = getSolarDeclination(dayOfYear);
  const declinationDeg = declinationRad * (180 / Math.PI);
  const H = getHourAngle(timeOfDay);
  const elevationRad = getSolarElevation(latRad, declinationRad, H);
  const elevationDeg = elevationRad * (180 / Math.PI);
  const azimuthRad = getSolarAzimuth(latRad, declinationRad, H);
  const azimuthDeg = azimuthRad * (180 / Math.PI);

  const isSunUp = elevationRad > 0;
  const intensity = getSolarIntensity(elevationRad);

  // Fixed Panel normal calculations
  const beta = fixedTilt * (Math.PI / 180);
  const gamma = fixedAzimuth * (Math.PI / 180);
  const fixedNormal = getPanelNormal(beta, gamma);
  const sunVec = getSunVector(elevationRad, azimuthRad);
  const fixedRes = calculatePower(intensity, sunVec, fixedNormal);

  // Tracking Panel calculation
  const trackRes = calculatePower(intensity, sunVec, isSunUp ? sunVec : { x: 0, y: 1, z: 0 });

  const fixedAngleOfIncidenceDeg = isSunUp 
    ? Math.acos(Math.max(-1, Math.min(1, fixedNormal.x * sunVec.x + fixedNormal.y * sunVec.y + fixedNormal.z * sunVec.z))) * (180 / Math.PI)
    : 0;

  // Max peak power of our model is 1367 * 2 * 0.20 = 546.8W (with sun directly perpendicular, at airmass 1)
  const maxModelPower = 547; 

  const fixedPowerPercent = Math.min(100, (fixedRes.power / maxModelPower) * 100);
  const trackingPowerPercent = Math.min(100, (trackRes.power / maxModelPower) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-5 h-full text-slate-300" id="live-telemetry-panel">
      {/* Title */}
      <div className="border-b border-slate-800 pb-3">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm tracking-tight uppercase">
          <Activity className="w-4 h-4 text-emerald-400" />
          Live Telemetry & Engineering Metrics
        </h3>
      </div>

      {/* Primary Atmospheric State Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Date / Day of Year */}
        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg flex items-center gap-3">
          <Calendar className="w-8 h-8 text-cyan-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Calendar Date</div>
            <div className="text-sm font-bold text-slate-100 font-sans">{getCalendarDate(dayOfYear)}</div>
            <div className="text-[10px] text-cyan-400 font-mono">Day {Math.floor(dayOfYear)} / 365</div>
          </div>
        </div>

        {/* Time of Day */}
        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Solar Time</div>
            <div className="text-sm font-bold text-slate-100 font-mono">{formatSolarTime(timeOfDay)}</div>
            <div className="text-[10px] text-amber-400 font-mono">Hour Angle: {(H * 180 / Math.PI).toFixed(0)}°</div>
          </div>
        </div>

        {/* Sun Elevation */}
        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg flex items-center gap-3">
          <Sun className="w-8 h-8 text-amber-500 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Sun Elevation</div>
            <div className="text-sm font-bold text-slate-100 font-mono">
              {isSunUp ? `${elevationDeg.toFixed(1)}°` : "0.0°"}
            </div>
            <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-semibold tracking-wider font-sans uppercase ${
              isSunUp ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-slate-950 text-slate-600 border border-slate-800"
            }`}>
              {isSunUp ? "Daylight" : "Nighttime"}
            </span>
          </div>
        </div>

        {/* Sun Azimuth */}
        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg flex items-center gap-3">
          <Compass className="w-8 h-8 text-cyan-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Sun Azimuth</div>
            <div className="text-sm font-bold text-slate-100 font-mono">{azimuthDeg.toFixed(1)}°</div>
            <div className="text-[10px] text-cyan-400 font-sans font-medium uppercase">
              {azimuthDeg < 45 || azimuthDeg >= 315 ? "North" :
               azimuthDeg < 135 ? "East" :
               azimuthDeg < 225 ? "South" : "West"}
            </div>
          </div>
        </div>
      </div>

      {/* Atmospheric Irradiance Indicator */}
      <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-lg flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          <span>Direct Normal Irradiance (DNI)</span>
          <span className="font-mono text-amber-500 text-xs font-bold">{Math.round(intensity)} W/m²</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
          <div 
            className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-200"
            style={{ width: `${Math.min(100, (intensity / 1000) * 100)}%` }}
          />
        </div>
        <div className="text-[9px] text-slate-500 font-sans italic">
          *DNI accounts for {Math.round(declinationDeg)}° solar declination and atmospheric scattering.
        </div>
      </div>

      {/* Side-by-Side System Comparisons */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
        <div className="grid grid-cols-3 text-[10px] text-slate-400 border-b border-slate-800 pb-2 font-bold tracking-wider uppercase">
          <div>Parameter</div>
          <div className="text-cyan-400 text-center font-bold">Fixed-Tilt</div>
          <div className="text-amber-500 text-right font-bold">Sun-Tracking</div>
        </div>

        {/* Tilt Angle */}
        <div className="grid grid-cols-3 text-xs py-1 items-center border-b border-slate-850">
          <div className="text-slate-400 font-medium">Panel Tilt (β)</div>
          <div className="text-center font-mono font-semibold text-slate-200">{fixedTilt}°</div>
          <div className="text-right font-mono font-semibold text-slate-200">
            {isSunUp ? `${Math.round(90 - elevationDeg)}°` : "Stow (0°)"}
          </div>
        </div>

        {/* Azimuth Angle */}
        <div className="grid grid-cols-3 text-xs py-1 items-center border-b border-slate-850">
          <div className="text-slate-400 font-medium">Panel Azimuth (γ)</div>
          <div className="text-center font-mono font-semibold text-slate-200">{fixedAzimuth}°</div>
          <div className="text-right font-mono font-semibold text-slate-200">
            {isSunUp ? `${Math.round(azimuthDeg)}°` : "Stow (180°)"}
          </div>
        </div>

        {/* Angle of Incidence */}
        <div className="grid grid-cols-3 text-xs py-1 items-center border-b border-slate-850">
          <div className="text-slate-400 font-medium">Incidence Angle (θ)</div>
          <div className="text-center font-mono font-bold text-rose-400">
            {isSunUp ? `${fixedAngleOfIncidenceDeg.toFixed(1)}°` : "—"}
          </div>
          <div className="text-right font-mono font-bold text-emerald-400">
            {isSunUp ? "0.0°" : "—"}
          </div>
        </div>

        {/* Cosine of incidence */}
        <div className="grid grid-cols-3 text-xs py-1 items-center border-b border-slate-850">
          <div className="text-slate-400 font-medium">Cosine Loss cos(θ)</div>
          <div className="text-center font-mono text-rose-400">
            {isSunUp ? fixedRes.cosTheta.toFixed(3) : "—"}
          </div>
          <div className="text-right font-mono text-emerald-400">
            {isSunUp ? "1.000" : "—"}
          </div>
        </div>

        {/* Instantaneous Power Output */}
        <div className="grid grid-cols-3 text-xs py-2 items-center border-b border-slate-800">
          <div className="text-slate-400 font-medium flex items-center gap-1">
            <Bolt className="w-3.5 h-3.5 text-amber-500" /> Power
          </div>
          <div className="text-center font-mono font-bold text-cyan-450 text-sm">
            {Math.round(fixedRes.power)} W
          </div>
          <div className="text-right font-mono font-bold text-amber-500 text-sm">
            {Math.round(trackRes.power)} W
          </div>
        </div>

        {/* Accumulated Daily Energy */}
        <div className="grid grid-cols-3 text-xs py-1 items-center font-semibold">
          <div className="text-slate-300 font-bold">Daily Energy</div>
          <div className="text-center font-mono text-cyan-300">
            {(accumulatedFixedWh / 1000).toFixed(3)} kWh
          </div>
          <div className="text-right font-mono text-amber-400">
            {(accumulatedTrackingWh / 1000).toFixed(3)} kWh
          </div>
        </div>
      </div>

      {/* Real-time power visual bar comparisons */}
      <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800/50 mt-auto">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          Instantaneous Power Output Comparison
        </div>
        
        {/* Fixed bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-cyan-400 font-bold">Fixed-Tilt</span>
            <span className="text-slate-300">{Math.round(fixedRes.power)} W</span>
          </div>
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-850">
            <div 
              className="bg-cyan-500 h-full rounded-full transition-all duration-200"
              style={{ width: `${fixedPowerPercent}%` }}
            />
          </div>
        </div>

        {/* Tracking bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-amber-500 font-bold">Sun-Tracking</span>
            <span className="text-slate-300">{Math.round(trackRes.power)} W</span>
          </div>
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-850">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-200"
              style={{ width: `${trackingPowerPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
