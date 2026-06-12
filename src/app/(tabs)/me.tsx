import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import {
  ErrorState,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  Section,
  StatePanel,
  TextField,
} from '@/components/rally/ui';
import { applyZodErrors, messageFromError } from '@/lib/forms';
import {
  getNotificationPermissionStatus,
  registerDevicePushTokenIfPossible,
  requestNotificationPermissionStatus,
} from '@/lib/notifications';
import { markNotificationOpened, signOut } from '@/lib/rally-api';
import { useAppStore } from '@/store/use-app-store';

type NotificationForm = {
  notificationId: string;
};

const notificationSchema = z.object({
  notificationId: z.string().uuid('Paste a notification UUID.'),
});

export default function MeScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const [status, setStatus] = useState<string>('unknown');
  const [apiError, setApiError] = useState<string | null>(null);
  const [notificationResult, setNotificationResult] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NotificationForm>({ defaultValues: { notificationId: '' } });

  if (!session) {
    return (
      <RallyScreen title="Me">
        <StatePanel
          title="Log in to manage your account"
          message="Notification and account preferences require a Rally session."
          actionLabel="Log in"
          href="/log-in"
        />
      </RallyScreen>
    );
  }

  const refreshPermission = async () => {
    const permission = await getNotificationPermissionStatus();
    setStatus(permission);
  };

  const registerPush = async () => {
    setApiError(null);
    try {
      const permission = await requestNotificationPermissionStatus();
      setStatus(permission);
      const response = await registerDevicePushTokenIfPossible(permission);
      if (!response) {
        setNotificationResult('Push token registration was not available on this runtime.');
        return;
      }
      setNotificationResult(`Push token active: ${response.enabled ? 'yes' : 'no'}`);
    } catch (error) {
      setApiError(messageFromError(error));
    }
  };

  const markOpened = handleSubmit(async (values) => {
    const parsed = notificationSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }
    setApiError(null);
    try {
      const result = await markNotificationOpened({
        notification_id: parsed.data.notificationId,
        opened_at_client: new Date().toISOString(),
      });
      setNotificationResult(`Opened at ${result.opened_at}`);
    } catch (error) {
      setApiError(messageFromError(error));
    }
  });

  return (
    <RallyScreen title="Me" subtitle={session.user.email ?? 'Rally account'}>
      <Section title="Account">
        <RallyCard>
          <RallyText variant="cardTitle">{session.user.email}</RallyText>
          <RallyText variant="supporting">Session-backed habit data comes from Supabase.</RallyText>
          <RallyButton
            variant="danger"
            onPress={async () => {
              await signOut();
              router.replace('/log-in');
            }}>
            Log out
          </RallyButton>
        </RallyCard>
      </Section>

      <Section title="Notifications">
        <RallyCard>
          <RallyText variant="cardTitle">Permission: {status}</RallyText>
          <RallyButton variant="secondary" onPress={refreshPermission}>
            Refresh permission
          </RallyButton>
          <RallyButton onPress={registerPush}>Register push token</RallyButton>
        </RallyCard>
      </Section>

      <Section title="Notification open recovery">
        <Controller
          control={control}
          name="notificationId"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Notification ID"
              value={value}
              onChangeText={onChange}
              placeholder="00000000-0000-0000-0000-000000000000"
              error={errors.notificationId?.message}
            />
          )}
        />
        <RallyButton loading={isSubmitting} variant="secondary" onPress={markOpened}>
          Mark notification opened
        </RallyButton>
      </Section>

      {notificationResult ? (
        <StatePanel title="Notification result" message={notificationResult} tone="success" />
      ) : null}
      {apiError ? <ErrorState title="Account action failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
