/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayPowerData, ElevationData, PANEL_AREA, PANEL_EFFICIENCY, TiltOptimizationData, YearlyResults } from "../types";

/**
 * Calculates solar declination angle in radians.
 * Declination is the angle between the equator and the line joining the centers of the Earth and the Sun.
 * It varies from -23.45 degrees (winter solstice) to +23.45 degrees (summer solstice).
 */
export function getSolarDeclination(dayOfYear: number): number {
  // March 21 (approx day 80) is the vernal equinox, when declination is 0
  return 23.45 * (Math.PI / 180) * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);
}

/**
 * Calculates hour angle in radians.
 * Solar noon corresponds to an hour angle of 0.
 * Every hour represents 15 degrees of rotation (negative in morning, positive in afternoon).
 */
export function getHourAngle(timeOfDay: number): number {
  return (timeOfDay - 12) * 15 * (Math.PI / 180);
}

/**
 * Calculates the solar elevation (altitude) angle in radians above the horizon.
 * 0 is on the horizon, PI/2 is directly overhead (zenith).
 */
export function getSolarElevation(latitudeRad: number, declinationRad: number, hourAngleRad: number): number {
  const sinAlpha = Math.sin(latitudeRad) * Math.sin(declinationRad) + 
                   Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return Math.asin(Math.max(-1, Math.min(1, sinAlpha)));
}

/**
 * Calculates the solar azimuth angle in radians measured clockwise from North.
 * North = 0 (or 2PI), East = PI/2 (90 deg), South = PI (180 deg), West = 3PI/2 (270 deg).
 */
export function getSolarAzimuth(latitudeRad: number, declinationRad: number, hourAngleRad: number): number {
  // Use atan2 to resolve quadrants correctly
  // Standard formulation relative to North
  const y = Math.sin(hourAngleRad);
  const x = Math.cos(hourAngleRad) * Math.sin(latitudeRad) - Math.tan(declinationRad) * Math.cos(latitudeRad);
  let azimuth = Math.atan2(y, x) + Math.PI;
  
  // Clean up boundaries
  if (azimuth < 0) azimuth += 2 * Math.PI;
  if (azimuth >= 2 * Math.PI) azimuth -= 2 * Math.PI;
  
  return azimuth;
}

/**
 * Estimates direct normal solar irradiance (W/m2) at the surface,
 * accounting for atmospheric absorption (Air Mass) using Kasten-Young approximation.
 */
export function getSolarIntensity(elevationRad: number): number {
  if (elevationRad <= 0) return 0;
  
  const elevationDeg = elevationRad * (180 / Math.PI);
  
  // Kasten-Young Air Mass formula
  const airMass = 1.0 / (Math.sin(elevationRad) + 0.15 * Math.pow(elevationDeg + 3.885, -1.253));
  
  // Clear-sky solar model (Haurwitz model or exponential attenuation)
  // Solar constant is 1367 W/m2. Clear sky transmission coefficient ~ 0.7
  const intensity = 1367 * Math.pow(0.7, Math.pow(airMass, 0.678));
  
  return Math.max(0, intensity);
}

/**
 * Computes the 3D unit vector pointing towards the sun.
 * Coordinate system:
 * X-axis points East (+X)
 * Y-axis points Up (+Y)
 * Z-axis points South (+Z), so North is -Z
 */
export function getSunVector(elevationRad: number, azimuthRad: number): { x: number, y: number, z: number } {
  if (elevationRad <= 0) {
    // Sun is below horizon. Return coordinates for representation below ground
    const cosEl = Math.cos(elevationRad);
    return {
      x: cosEl * Math.sin(azimuthRad),
      y: Math.sin(elevationRad),
      z: -cosEl * Math.cos(azimuthRad)
    };
  }
  
  const cosEl = Math.cos(elevationRad);
  return {
    x: cosEl * Math.sin(azimuthRad),      // East component (+X)
    y: Math.sin(elevationRad),            // Up component (+Y)
    z: -cosEl * Math.cos(azimuthRad)      // South component (+Z is South, so North -cos(A) gives South)
  };
}

/**
 * Computes the 3D unit vector representing the panel's normal surface.
 * tiltRad: tilt angle from horizontal (0 is flat, PI/2 is vertical)
 * azimuthRad: panel direction clockwise from North (180 is South)
 */
export function getPanelNormal(tiltRad: number, azimuthRad: number): { x: number, y: number, z: number } {
  return {
    x: Math.sin(tiltRad) * Math.sin(azimuthRad),
    y: Math.cos(tiltRad),
    z: -Math.sin(tiltRad) * Math.cos(azimuthRad)
  };
}

/**
 * Calculates current power output (W) of a photovoltaic panel
 * based on solar vector, panel normal, solar intensity, area, and efficiency.
 */
export function calculatePower(
  intensity: number,
  sunVec: { x: number, y: number, z: number },
  normalVec: { x: number, y: number, z: number }
): { power: number, cosTheta: number } {
  if (intensity <= 0 || sunVec.y <= 0) {
    return { power: 0, cosTheta: 0 };
  }
  
  // Dot product represents the cosine of the angle of incidence
  const cosTheta = sunVec.x * normalVec.x + sunVec.y * normalVec.y + sunVec.z * normalVec.z;
  const activeCosTheta = Math.max(0, cosTheta);
  
  // Power = Irradiance * Cos(Incidence) * Area * Efficiency
  const power = intensity * activeCosTheta * PANEL_AREA * PANEL_EFFICIENCY;
  
  return {
    power,
    cosTheta: activeCosTheta
  };
}

/**
 * Generates an array of 24 points for Power vs. Time of Day graph
 */
export function calculateDayData(
  dayOfYear: number,
  latitude: number,
  fixedTilt: number,
  fixedAzimuth: number
): DayPowerData[] {
  const data: DayPowerData[] = [];
  const latRad = latitude * (Math.PI / 180);
  const declinationRad = getSolarDeclination(dayOfYear);
  
  const beta = fixedTilt * (Math.PI / 180);
  const gamma = fixedAzimuth * (Math.PI / 180);
  const fixedNormal = getPanelNormal(beta, gamma);

  // Sample every hour
  for (let hour = 0; hour <= 24; hour += 0.5) {
    const H = getHourAngle(hour);
    const elevation = getSolarElevation(latRad, declinationRad, H);
    
    if (elevation <= 0) {
      data.push({ hour, fixedPower: 0, trackingPower: 0 });
      continue;
    }
    
    const azimuth = getSolarAzimuth(latRad, declinationRad, H);
    const sunVec = getSunVector(elevation, azimuth);
    const intensity = getSolarIntensity(elevation);
    
    // Fixed Panel
    const fixedRes = calculatePower(intensity, sunVec, fixedNormal);
    
    // Tracking Panel (ideal: panel normal = sun vector, cosTheta = 1)
    const trackingNormal = sunVec;
    const trackingRes = calculatePower(intensity, sunVec, trackingNormal);
    
    data.push({
      hour,
      fixedPower: Math.round(fixedRes.power),
      trackingPower: Math.round(trackingRes.power)
    });
  }
  
  return data;
}

/**
 * Generates an array of points for Sun Elevation vs. Time of Day graph
 */
export function calculateElevationData(dayOfYear: number, latitude: number): ElevationData[] {
  const data: ElevationData[] = [];
  const latRad = latitude * (Math.PI / 180);
  const declinationRad = getSolarDeclination(dayOfYear);

  for (let hour = 0; hour <= 24; hour += 0.5) {
    const H = getHourAngle(hour);
    const elevation = getSolarElevation(latRad, declinationRad, H);
    const elevationDeg = Math.max(0, elevation * (180 / Math.PI));
    data.push({
      hour,
      elevation: parseFloat(elevationDeg.toFixed(1))
    });
  }
  
  return data;
}

/**
 * Integrated yearly solar simulation.
 * Computes cumulative annual solar energy (kWh/year) for:
 * 1. Tracking panel
 * 2. Fixed panels at tilt angles from 0 to 60 degrees.
 */
export function runYearlyCalculation(latitude: number, fixedAzimuth: number): YearlyResults {
  const latRad = latitude * (Math.PI / 180);
  const gamma = fixedAzimuth * (Math.PI / 180);
  
  // Track energy for tilt angles from 0 to 60 degrees
  const tiltAngles = Array.from({ length: 61 }, (_, i) => i); // 0, 1, 2, ... 60
  const accumulatedFixedWhByTilt = new Array(61).fill(0);
  let accumulatedTrackingWh = 0;
  
  // Precompute normal vectors for all tilt angles for performance
  const panelNormalsByTilt = tiltAngles.map(tilt => {
    const beta = tilt * (Math.PI / 180);
    return getPanelNormal(beta, gamma);
  });
  
  // Integrate over 365 days
  // To keep it extremely fast and exact, we sample every 10 days and scale, 
  // or we can calculate all 365 days with 1-hour time intervals, which is highly accurate and still instant in JS!
  // Let's do a 1-hour step for all 365 days: 365 * 24 = 8,760 evaluations.
  // This takes less than 15ms in JS and is completely realistic!
  for (let day = 1; day <= 365; day++) {
    const declinationRad = getSolarDeclination(day);
    
    // Sample hours of the day (only daylight hours to optimize)
    // Sunrise/sunset hour angles
    const cosHourAngleSunrise = -Math.tan(latRad) * Math.tan(declinationRad);
    let hStart = 6;
    let hEnd = 18;
    
    if (cosHourAngleSunrise >= -1 && cosHourAngleSunrise <= 1) {
      const H_sunrise = Math.acos(cosHourAngleSunrise);
      const hourSunrise = 12 - H_sunrise * (180 / Math.PI) / 15;
      const hourSunset = 12 + H_sunrise * (180 / Math.PI) / 15;
      hStart = Math.max(0, Math.floor(hourSunrise) - 1);
      hEnd = Math.min(24, Math.ceil(hourSunset) + 1);
    } else if (cosHourAngleSunrise < -1) {
      // Polar day
      hStart = 0;
      hEnd = 24;
    } else {
      // Polar night (no sun at all)
      continue;
    }
    
    // Let's integrate with a 0.5-hour step during daylight hours for maximum precision
    const hourStep = 0.5;
    for (let h = hStart; h <= hEnd; h += hourStep) {
      const H = getHourAngle(h);
      const elevation = getSolarElevation(latRad, declinationRad, H);
      
      if (elevation <= 0) continue;
      
      const azimuth = getSolarAzimuth(latRad, declinationRad, H);
      const sunVec = getSunVector(elevation, azimuth);
      const intensity = getSolarIntensity(elevation);
      
      // Tracking energy accumulation
      // Power = Irradiance * 1.0 * Area * Eff
      const trackingPower = intensity * PANEL_AREA * PANEL_EFFICIENCY;
      accumulatedTrackingWh += trackingPower * hourStep;
      
      // Fixed panels energy accumulation
      for (let tIdx = 0; tIdx < tiltAngles.length; tIdx++) {
        const normalVec = panelNormalsByTilt[tIdx];
        const cosTheta = sunVec.x * normalVec.x + sunVec.y * normalVec.y + sunVec.z * normalVec.z;
        if (cosTheta > 0) {
          const fixedPower = intensity * cosTheta * PANEL_AREA * PANEL_EFFICIENCY;
          accumulatedFixedWhByTilt[tIdx] += fixedPower * hourStep;
        }
      }
    }
  }
  
  // Convert Wh to kWh
  const trackingYearlyEnergy = accumulatedTrackingWh / 1000;
  const energyByTilt: TiltOptimizationData[] = tiltAngles.map(tilt => ({
    tilt,
    energy: parseFloat((accumulatedFixedWhByTilt[tilt] / 1000).toFixed(1))
  }));
  
  // Find optimal tilt angle
  let optimalTilt = 0;
  let maxFixedEnergy = 0;
  for (let i = 0; i < energyByTilt.length; i++) {
    if (energyByTilt[i].energy > maxFixedEnergy) {
      maxFixedEnergy = energyByTilt[i].energy;
      optimalTilt = energyByTilt[i].tilt;
    }
  }
  
  const fixedYearlyEnergy = maxFixedEnergy;
  const improvementPercent = fixedYearlyEnergy > 0 
    ? parseFloat(((trackingYearlyEnergy - fixedYearlyEnergy) / fixedYearlyEnergy * 100).toFixed(1))
    : 0;
    
  return {
    optimalTilt,
    fixedYearlyEnergy: parseFloat(fixedYearlyEnergy.toFixed(1)),
    trackingYearlyEnergy: parseFloat(trackingYearlyEnergy.toFixed(1)),
    improvementPercent,
    energyByTilt,
    comparisonData: [
      { name: `Optimal Fixed (${optimalTilt}°)`, value: parseFloat(fixedYearlyEnergy.toFixed(1)), fill: "#4f46e5" }, // Indigo
      { name: "Sun-Tracking System", value: parseFloat(trackingYearlyEnergy.toFixed(1)), fill: "#f59e0b" }         // Amber
    ]
  };
}
