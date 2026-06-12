import { Controller, useForm } from 'react-hook-form';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import {
  ErrorState,
  FooterActions,
  LoadingState,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  StatePanel,
  TextField,
} from '@/components/rally/ui';
import { analytics } from '@/lib/analytics';
import { applyZodErrors, messageFromError } from '@/lib/forms';
import { useCreateInviteMutation, useDailyView } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

type ShareForm = {
  expiresInDays: string;
  maxAcceptances: string;
};

const shareSchema = z.object({
  expiresInDays: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Use a whole number.')
    .transform(Number)
    .pipe(z.number().int().min(1).max(30)),
  maxAcceptances: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Use a whole number.')
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().min(1).max(4).optional()),
});

export default function ShareHabitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ habitId?: string }>();
  const habitId = typeof params.habitId === 'string' ? params.habitId : null;
  const session = useAppStore((state) => state.session);
  const setLastInvite = useAppStore((state) => state.setLastInvite);
  const daily = useDailyView(Boolean(session));
  const createInvite = useCreateInviteMutation();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ShareForm>({
    defaultValues: {
      expiresInDays: '14',
      maxAcceptances: '',
    },
  });

  const selectedHabit = useMemo(() => {
    const rows = daily.data?.habits ?? [];
    return rows.find((row) => row.habit.habit_id === habitId) ?? rows.find((row) => row.membership.role === 'owner');
  }, [daily.data?.habits, habitId]);

  const onSubmit = handleSubmit(async (values) => {
    const parsed = shareSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }
    if (!selectedHabit) {
      setApiError('Choose an owned habit before creating an invite.');
      return;
    }
    setApiError(null);
    try {
      const invite = await createInvite.mutateAsync({
        habit_id: selectedHabit.habit.habit_id,
        expires_in_days: parsed.data.expiresInDays,
        max_acceptances: parsed.data.maxAcceptances,
      });
      analytics.capture('invite_created', { habit_id: invite.habit_id });
      setLastInvite(invite);
      router.replace('/invite-created');
    } catch (error) {
      setApiError(messageFromError(error));
    }
  });

  if (!session) {
    return (
      <RallyScreen title="Share habit">
        <StatePanel
          title="Log in to create an invite"
          message="Only an active habit owner can create an invite."
          actionLabel="Log in"
          href="/log-in"
        />
      </RallyScreen>
    );
  }

  if (daily.isLoading) {
    return (
      <RallyScreen title="Share habit">
        <LoadingState label="Loading habits" />
      </RallyScreen>
    );
  }

  return (
    <RallyScreen
      title="Share habit"
      subtitle="This invite grants access to one habit only."
      footer={
        <FooterActions>
          <RallyButton loading={isSubmitting || createInvite.isPending} variant="social" onPress={onSubmit}>
            Create invite
          </RallyButton>
          <RallyButton variant="secondary" href="/today">
            Back to Today
          </RallyButton>
        </FooterActions>
      }>
      {selectedHabit ? (
        <RallyCard>
          <RallyText variant="cardTitle">{selectedHabit.habit.name}</RallyText>
          <RallyText variant="supporting">
            {selectedHabit.habit.active_member_count} of {selectedHabit.habit.max_members} members active
          </RallyText>
        </RallyCard>
      ) : (
        <StatePanel
          tone="warning"
          title="No owned habit available"
          message="Create a private habit before sharing."
          actionLabel="Set up habit"
          href="/first-habit"
        />
      )}
      <Controller
        control={control}
        name="expiresInDays"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Expires in days"
            value={value}
            onChangeText={onChange}
            keyboardType="number-pad"
            error={errors.expiresInDays?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="maxAcceptances"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Max acceptances"
            value={value}
            onChangeText={onChange}
            keyboardType="number-pad"
            placeholder="Remaining slots"
            error={errors.maxAcceptances?.message}
          />
        )}
      />
      {apiError ? <ErrorState title="Invite creation failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
