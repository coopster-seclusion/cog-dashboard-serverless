import { useQuery } from "@tanstack/react-query";

export interface SolarDevice {
  ps_key: string;
  device_sn: string | null;
  device_type: number | null;
  type_name: string | null;
  fault_status: number | null; // 1=Fault, 2=Alarm, 4=Normal
  device_code: number | null;
}

async function fetchDevices(psId: string): Promise<SolarDevice[]> {
  const res = await fetch(`/api/solar/plants/${psId}/devices`);
  if (!res.ok) throw new Error(`Devices fetch failed: ${res.status}`);
  const data = await res.json();
  return data.devices as SolarDevice[];
}

export function useSolarDevices(psId: string | undefined) {
  return useQuery({
    queryKey: ["solar-devices", psId],
    queryFn: () => fetchDevices(psId!),
    enabled: !!psId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
