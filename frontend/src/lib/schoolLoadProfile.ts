export type DayType = "weekday" | "weekend" | "holiday";

// Hourly demand profile in kW — typical NZ secondary school
// Weekday total: ~1,048 kWh/day
const WEEKDAY_PROFILE: number[] = [
  15,  // 00:00 — base load (security, servers, refrigeration)
  15,  // 01:00
  15,  // 02:00
  15,  // 03:00
  15,  // 04:00
  20,  // 05:00 — early HVAC startup
  45,  // 06:00 — HVAC ramp, early staff
  120, // 07:00 — staff arrival, classrooms opening
  180, // 08:00 — peak morning (all rooms, kitchen, labs)
  175, // 09:00 — full school in session
  170, // 10:00
  165, // 11:00
  185, // 12:00 — lunch peak (kitchen, canteen)
  175, // 13:00 — afternoon session
  160, // 14:00
  120, // 15:00 — student departure begins
  80,  // 16:00 — staff remaining, sports
  55,  // 17:00 — wind-down
  35,  // 18:00
  25,  // 19:00
  20,  // 20:00
  18,  // 21:00
  16,  // 22:00
  15,  // 23:00
];

// Weekend total: ~386 kWh/day
const WEEKEND_PROFILE: number[] = [
  12, 12, 12, 12, 12, 12,   // 00–05 — minimal base load
  12, 15, 20, 25, 25, 25,   // 06–11 — occasional weekend use
  25, 22, 20, 18, 15, 14,   // 12–17
  13, 12, 12, 12, 12, 12,   // 18–23
];

export function getDayType(date: Date): DayType {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function getHourlyDemandProfile(date: Date): number[] {
  const dayType = getDayType(date);
  return dayType === "weekday" ? WEEKDAY_PROFILE : WEEKEND_PROFILE;
}

export function getCurrentDemandKW(date: Date): number {
  const profile = getHourlyDemandProfile(date);
  const hour = date.getHours();
  const nextHour = (hour + 1) % 24;
  const minuteFraction = date.getMinutes() / 60;
  return profile[hour] + (profile[nextHour] - profile[hour]) * minuteFraction;
}

export function getDailyConsumptionKWh(date: Date): number {
  return getHourlyDemandProfile(date).reduce((sum, kw) => sum + kw, 0);
}

// kWh consumed so far today, up to the current minute
export function getTodayConsumedKWh(date: Date): number {
  const profile = getHourlyDemandProfile(date);
  const hour = date.getHours();
  const minuteFraction = date.getMinutes() / 60;
  let total = 0;
  for (let h = 0; h < hour; h++) total += profile[h];
  total += profile[hour] * minuteFraction;
  return total;
}

export function getGridExportKW(generationKW: number, consumptionKW: number): number {
  return Math.max(0, generationKW - consumptionKW);
}

export function getGridImportKW(generationKW: number, consumptionKW: number): number {
  return Math.max(0, consumptionKW - generationKW);
}

export function get24hExportKWh(
  hourlyGenerationKW: number[],
  demandProfile: number[],
): number {
  return hourlyGenerationKW.reduce((sum, genKW, hour) => {
    return sum + getGridExportKW(genKW, demandProfile[hour]);
  }, 0);
}

export function get24hConsumptionKWh(demandProfile: number[]): number {
  return demandProfile.reduce((sum, kw) => sum + kw, 0);
}

export function getSelfConsumptionRatio(
  hourlyGenerationKW: number[],
  demandProfile: number[],
): number {
  const totalGeneration = hourlyGenerationKW.reduce((s, v) => s + v, 0);
  if (totalGeneration === 0) return 0;
  const selfConsumed = hourlyGenerationKW.reduce((sum, genKW, hour) => {
    return sum + Math.min(genKW, demandProfile[hour]);
  }, 0);
  return (selfConsumed / totalGeneration) * 100;
}
