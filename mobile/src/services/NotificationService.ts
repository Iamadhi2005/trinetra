/**
 * TRINETRA NotificationService
 * Manages Push Token registration, permission requests,
 * notification channels with custom emergency beep audio,
 * and high-priority heads-up delivery across all Android app states.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { registerDeviceToken, getOrCreateDeviceId } from "../config/api";
import { alarmSound } from "./AlarmSoundService";

// ---------------------------------------------------------------------------
// Notification channel IDs (Android)
// ---------------------------------------------------------------------------
export const CHANNEL_CRITICAL = "trinetra_critical_alarm";
export const CHANNEL_CRITICAL_LEGACY = "trinetra_critical";
export const CHANNEL_HIGH = "trinetra_high_alarm";
export const CHANNEL_INFO = "trinetra_info";

// ---------------------------------------------------------------------------
// Configure foreground presentation behaviour (banner + sound while app open)
// ---------------------------------------------------------------------------
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as any;
    const isCritical =
      data?.severity === "Critical" || data?.severity === "High";

    if (isCritical) {
      alarmSound.playEmergencyBeep();
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: isCritical,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

// ---------------------------------------------------------------------------
// Create Android notification channels with emergency sound & max importance
// ---------------------------------------------------------------------------
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  // New primary channel with explicit custom beep sound
  await Notifications.setNotificationChannelAsync(CHANNEL_CRITICAL, {
    name: "TRINETRA — Emergency Medical Alarms",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500, 200, 800],
    sound: "beep_alert.wav",
    enableVibrate: true,
    enableLights: true,
    lightColor: "#FF0000",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    showBadge: true,
  });

  // Legacy channel compatibility
  await Notifications.setNotificationChannelAsync(CHANNEL_CRITICAL_LEGACY, {
    name: "TRINETRA — Critical Security Alerts",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500, 200, 800],
    sound: "beep_alert.wav",
    enableVibrate: true,
    enableLights: true,
    lightColor: "#FF0000",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_HIGH, {
    name: "TRINETRA — High-Priority Events",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
    sound: "beep_alert.wav",
    enableVibrate: true,
    enableLights: true,
    lightColor: "#FF8800",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_INFO, {
    name: "TRINETRA — Informational Alerts",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    enableVibrate: false,
    showBadge: true,
  });
}

// ---------------------------------------------------------------------------
// Request permission and obtain push token (or fallback on emulator)
// ---------------------------------------------------------------------------
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[TRINETRA] Notification permission not granted.");
    }

    if (Device.isDevice) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "d647ded0-a0cb-4b79-8f18-50624743c746",
        });
        if (tokenData && tokenData.data) {
          return tokenData.data;
        }
      } catch (expoErr) {
        console.warn("[TRINETRA] Expo push token fetch notice:", expoErr);
      }
    }

    const deviceId = await getOrCreateDeviceId();
    return `ExponentPushToken[local-${deviceId}]`;
  } catch (err) {
    console.warn("[TRINETRA] Push registration error:", err);
    const deviceId = await getOrCreateDeviceId();
    return `ExponentPushToken[fallback-${deviceId}]`;
  }
}

// ---------------------------------------------------------------------------
// Full registration flow: permission → channels → token → backend
// ---------------------------------------------------------------------------
export async function initAndRegisterDevice(): Promise<string | null> {
  try {
    await setupNotificationChannels();

    const pushToken = await registerForPushNotifications();
    const deviceId = await getOrCreateDeviceId();
    const deviceName = Device.deviceName || "TRINETRA Android Terminal";

    const effectiveToken = pushToken || `ExponentPushToken[dev-${deviceId}]`;
    await registerDeviceToken(deviceId, effectiveToken, deviceName);
    console.log("[TRINETRA] Device registered with push token:", effectiveToken.slice(0, 45) + "...");
    return effectiveToken;
  } catch (err) {
    console.warn("[TRINETRA] Device registration failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Show a local notification immediately with emergency beep audio
// ---------------------------------------------------------------------------
export async function showLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {},
  severity: "Critical" | "High" | "Info" = "Critical"
): Promise<void> {
  const isUrgent = severity === "Critical" || severity === "High";

  // Trigger immediate audible beep sound on hardware stream
  if (isUrgent) {
    alarmSound.playEmergencyBeep();
  }

  const channelId =
    severity === "Critical"
      ? CHANNEL_CRITICAL
      : severity === "High"
      ? CHANNEL_HIGH
      : CHANNEL_INFO;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { ...data, severity },
      sound: isUrgent ? "beep_alert.wav" : undefined,
      priority:
        severity === "Critical"
          ? Notifications.AndroidNotificationPriority.MAX
          : severity === "High"
          ? Notifications.AndroidNotificationPriority.HIGH
          : Notifications.AndroidNotificationPriority.DEFAULT,
      badge: 1,
    },
    trigger: null, // Fire immediately
    ...(Platform.OS === "android" ? { identifier: `trn-${Date.now()}` } : {}),
    ...(Platform.OS === "android" ? { android: { channelId } } : {}),
  } as any);
}

// ---------------------------------------------------------------------------
// Dismiss all notifications (call on logout)
// ---------------------------------------------------------------------------
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}
