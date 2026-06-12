import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken } from '@/lib/rally-api';
import type { NotificationPermissionStatus } from '@/types/rally';

const APP_INSTALL_ID_KEY = 'rally.appInstallId';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function mapPermissionStatus(
  permission: Notifications.NotificationPermissionsStatus,
): NotificationPermissionStatus {
  if (permission.granted || permission.status === 'granted') {
    return 'granted';
  }
  if (permission.status === 'denied') {
    return 'denied';
  }
  return 'not_requested';
}

async function getAppInstallId() {
  const existing = await AsyncStorage.getItem(APP_INSTALL_ID_KEY);
  if (existing) {
    return existing;
  }
  const next = `install-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(APP_INSTALL_ID_KEY, next);
  return next;
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const permission = await Notifications.getPermissionsAsync();
  return mapPermissionStatus(permission);
}

export async function requestNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.status === 'denied') {
    return mapPermissionStatus(current);
  }
  const requested = await Notifications.requestPermissionsAsync();
  return mapPermissionStatus(requested);
}

export async function registerDevicePushTokenIfPossible(permission: NotificationPermissionStatus) {
  if (permission !== 'granted' || !Device.isDevice) {
    return null;
  }
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const appInstallId = await getAppInstallId();

  return registerPushToken({
    expo_push_token: token.data,
    platform: Platform.OS,
    device_id: Device.osInternalBuildId ?? appInstallId,
    app_install_id: appInstallId,
    notification_permission_status: permission,
  });
}
