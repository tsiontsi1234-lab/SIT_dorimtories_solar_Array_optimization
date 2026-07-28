/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SimulationState {
  latitude: number;       // degrees (-90 to 90)
  dayOfYear: number;      // 1 to 365
  timeOfDay: number;      // 0 to 24 (hours decimal, e.g. 13.5 = 1:30 PM)
  fixedTilt: number;      // degrees (0 to 90)
  fixedAzimuth: number;   // degrees (0 to 360, 180 is South, 90 is East, etc)
  simSpeed: number;       // speed multiplier (e.g. 0.5, 1, 2, 5 hours per real-second)
  isRunning: boolean;     // whether the timeOfDay is advancing automatically
}

export interface DayPowerData {
  hour: number;
  fixedPower: number;     // Watts
  trackingPower: number;  // Watts
}

export interface ElevationData {
  hour: number;
  elevation: number;      // degrees
}

export interface TiltOptimizationData {
  tilt: number;
  energy: number;         // kWh/year
}

export interface YearlyResults {
  optimalTilt: number;
  fixedYearlyEnergy: number;     // kWh/year
  trackingYearlyEnergy: number;  // kWh/year
  improvementPercent: number;
  energyByTilt: TiltOptimizationData[];
  comparisonData: { name: string; value: number; fill: string }[];
}

// Physical and operational constants for the simulation
export const PANEL_AREA = 2.0;       // square meters (approx standard size)
export const PANEL_EFFICIENCY = 0.20; // 20% efficiency (high quality mono-Si)
export const TRACKER_EXTRA_COST = 2500; // estimated additional cost per panel in dollars (motor, sensor, structure)
