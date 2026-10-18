import type { DeviceSnapshot, NetworkConnectionType } from "./types";

interface NavigatorConnection {
  effectiveType?: string;
  type?: string;
  downlink?: number;
}

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
  connection?: NavigatorConnection;
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
  }>;
}

function detectOs(userAgent: string, platform: string): string {
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/win/i.test(platform)) return "Windows";
  if (/mac/i.test(platform)) return "macOS";
  if (/linux/i.test(platform)) return "Linux";
  return "Unknown";
}

function detectDeviceType(
  userAgent: string,
  width: number
): DeviceSnapshot["deviceType"] {
  if (/ipad|tablet/i.test(userAgent) || (width >= 768 && width < 1024)) {
    return "tablet";
  }
  if (/mobile|iphone|android/i.test(userAgent) || width < 768) {
    return "mobile";
  }
  return "desktop";
}

export function resolveNetworkType(): NetworkConnectionType {
  if (typeof navigator === "undefined") return "unknown";
  if (!navigator.onLine) return "offline";

  const nav = navigator as NavigatorWithMemory;
  const connection = nav.connection;
  if (!connection?.type && !connection?.effectiveType) return "unknown";

  const type = (
    connection.type ??
    connection.effectiveType ??
    ""
  ).toLowerCase();
  if (type.includes("wifi")) return "wifi";
  if (type.includes("wimax")) return "wifi";
  if (
    type.includes("cellular") ||
    type.includes("2g") ||
    type.includes("3g") ||
    type.includes("4g") ||
    type.includes("5g")
  ) {
    return "cellular";
  }
  if (type.includes("ethernet")) return "ethernet";
  return "unknown";
}

export async function getDeviceSnapshot(): Promise<DeviceSnapshot> {
  if (typeof window === "undefined") {
    return {
      userAgent: "",
      platform: "",
      os: "Unknown",
      deviceType: "desktop",
      screenWidth: 0,
      screenHeight: 0,
      memoryMb: null,
      batteryLevel: null,
      batteryCharging: null,
      networkType: "unknown",
    };
  }

  const nav = navigator as NavigatorWithMemory;
  const userAgent = nav.userAgent;
  const platform = nav.platform ?? "";
  const width = window.innerWidth;
  const height = window.innerHeight;

  let batteryLevel: number | null = null;
  let batteryCharging: boolean | null = null;

  if (nav.getBattery) {
    try {
      const battery = await nav.getBattery();
      batteryLevel = Math.round(battery.level * 100);
      batteryCharging = battery.charging;
    } catch {
      // Battery API unavailable
    }
  }

  const memoryGb = nav.deviceMemory;
  const memoryMb = typeof memoryGb === "number" ? memoryGb * 1024 : null;

  return {
    userAgent,
    platform,
    os: detectOs(userAgent, platform),
    deviceType: detectDeviceType(userAgent, width),
    screenWidth: width,
    screenHeight: height,
    memoryMb,
    batteryLevel,
    batteryCharging,
    networkType: resolveNetworkType(),
  };
}

export function getMemoryUsageMb(): {
  usedMb: number | null;
  totalMb: number | null;
} {
  if (typeof performance === "undefined") {
    return { usedMb: null, totalMb: null };
  }

  const memory = (
    performance as Performance & {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
    }
  ).memory;
  if (!memory) {
    return { usedMb: null, totalMb: null };
  }

  return {
    usedMb: Math.round(memory.usedJSHeapSize / (1024 * 1024)),
    totalMb: Math.round(memory.totalJSHeapSize / (1024 * 1024)),
  };
}
