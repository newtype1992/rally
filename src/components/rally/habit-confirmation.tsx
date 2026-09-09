import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorState, FooterActions, OfflineNotice, RallyButton, RallySheetScreen, RallyText } from '@/components/rally/ui';
import { useArchiveHabitMutation, useDeleteHabitMutation } from '@/hooks/use-rally-data';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useAppStore } from '@/store/use-app-store';

export function HabitConfirmation({ kind }: { kind: 'archive' | 'delete' }) {
  const router = useRouter();
  const { habitId, habitName } = useLocalSearchParams<{ habitId?: string; habitName?: string }>();
  const session = useAppStore((state) => state.session);
  const initialized = useAppStore((state) => state.sessionInitialized);
  const archive = useArchiveHabitMutation();
  const remove = useDeleteHabitMutation();
  const online = useNetworkStatus();
  const mutation = kind === 'archive' ? archive : remove;
  const label = kind === 'archive' ? 'Archive habit' : 'Delete habit';
  const close = () => {
    if (mutation.isPending) return;
    if (router.canGoBack()) router.back();
    else router.replace('/habits');
  };
  const submit = async () => {
    if (!habitId || !online || mutation.isPending) return;
    try {
      await mutation.mutateAsync({ habitId, confirmation: 'explicit' });
      router.dismissTo('/habits');
    } catch {
      // Render the recorded mutation error without rejecting the press event.
    }
  };
  if (initialized && !session) return <Redirect href="/log-in" />;
  return <RallySheetScreen backgroundTitle={habitName ?? 'Habit'} sheetTitle={kind === 'archive' ? 'Archive this habit?' : 'Delete this habit?'} onClose={mutation.isPending ? undefined : close}
    footer={<FooterActions>
      <RallyButton variant={kind === 'delete' ? 'danger' : 'primary'} disabled={!habitId || !online || !session} loading={mutation.isPending} onPress={submit}>{mutation.isPending ? 'Saving changes…' : label}</RallyButton>
      <RallyButton variant="ghost" disabled={mutation.isPending} onPress={close}>Cancel</RallyButton>
    </FooterActions>}>
    <Stack.Screen options={{ gestureEnabled: !mutation.isPending }} />
    <OfflineNotice />
    <RallyText variant="supporting">{kind === 'archive'
      ? 'This habit will leave your dashboard. Its completion history will stay saved. Restoring archived habits isn’t available yet.'
      : 'This habit will leave your dashboard and can’t be restored in the app. Take a moment before you continue.'}</RallyText>
    {!habitId ? <ErrorState title="No habit selected." message="Open a habit from your dashboard to manage it." /> : null}
    {mutation.error ? <ErrorState title="That didn’t save." message="Your habit is still here. Check your connection and try again." /> : null}
  </RallySheetScreen>;
}
