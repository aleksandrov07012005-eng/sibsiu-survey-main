/**
 * Device fingerprinting utility
 * Generates a unique fingerprint based on browser/device characteristics
 */

interface FingerprintData {
  userAgent: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  colorDepth: number;
  pixelDepth: number;
  screenResolution: string;
  timezone: string;
  timezoneOffset: number;
  webGL?: string;
}

/**
 * Get WebGL renderer information
 */
function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "unknown";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "unknown";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Get device fingerprint data
 */
function getFingerprintData(): FingerprintData {
  const nav = navigator as any;
  const screen_obj = window.screen as any;

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: nav.hardwareConcurrency || 0,
    deviceMemory: nav.deviceMemory,
    maxTouchPoints: nav.maxTouchPoints || 0,
    colorDepth: screen_obj.colorDepth || 0,
    pixelDepth: screen_obj.pixelDepth || 0,
    screenResolution: `${screen_obj.width}x${screen_obj.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    webGL: getWebGLRenderer(),
  };
}

/**
 * Simple hash function (non-cryptographic, suitable for fingerprinting)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate a device fingerprint
 * Returns a hash string that uniquely identifies the device/browser combination
 */
export function generateDeviceFingerprint(): string {
  try {
    const data = getFingerprintData();
    const jsonString = JSON.stringify(data);
    return simpleHash(jsonString);
  } catch (error) {
    // Fallback if fingerprinting fails
    return simpleHash(
      navigator.userAgent + new Date().getTimezoneOffset().toString(),
    );
  }
}

/**
 * Get or create a persistent device fingerprint for this session
 * Uses sessionStorage to maintain consistency within a session
 */
export function getSessionFingerprint(): string {
  const key = "__device_fingerprint_session__";

  try {
    let fingerprint = sessionStorage.getItem(key);
    if (!fingerprint) {
      fingerprint = generateDeviceFingerprint();
      sessionStorage.setItem(key, fingerprint);
    }
    return fingerprint;
  } catch {
    // Fallback if sessionStorage is not available
    return generateDeviceFingerprint();
  }
}

/**
 * Get device fingerprint data for display/debugging
 */
export function getFingerprintInfo(): FingerprintData {
  return getFingerprintData();
}
