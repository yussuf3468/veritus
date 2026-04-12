"use client";
import { useEffect, useState } from "react";
import UAParser from "ua-parser-js";
import { generateSessionToken } from "@/lib/utils";

export interface DeviceInfo {
  name: string;
  device_type: "laptop" | "phone" | "tablet" | "desktop" | "other";
  os: string;
  browser: string;
  user_agent: string;
  session_token: string;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
}

const SESSION_TOKEN_KEY = "veritus_session_token";

function getOrCreateSessionToken(): string {
  if (typeof window === "undefined") return generateSessionToken();
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = generateSessionToken();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    const parser = new UAParser(navigator.userAgent);
    const result = parser.getResult();
    const os =
      `${result.os.name ?? "Unknown"} ${result.os.version ?? ""}`.trim();
    const browser =
      `${result.browser.name ?? "Unknown"} ${result.browser.version ?? ""}`.trim();

    let deviceType: DeviceInfo["device_type"] = "other";
    const deviceKind = result.device.type;
    if (deviceKind === "mobile") deviceType = "phone";
    else if (deviceKind === "tablet") deviceType = "tablet";
    else if (!deviceKind) deviceType = "laptop";

    const deviceName = `${result.browser.name ?? "Browser"} on ${result.os.name ?? "OS"}`;
    const sessionToken = getOrCreateSessionToken();

    const base: DeviceInfo = {
      name: deviceName,
      device_type: deviceType,
      os,
      browser,
      user_agent: navigator.userAgent,
      session_token: sessionToken,
      latitude: null,
      longitude: null,
      location: null,
    };

    // Try geolocation (non-blocking)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceInfo({
            ...base,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          });
        },
        () => setDeviceInfo(base),
        { timeout: 5000 },
      );
    } else {
      setDeviceInfo(base);
    }
  }, []);

  return deviceInfo;
}
