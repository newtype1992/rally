import { Controller, useForm, useWatch } from 'react-hook-form';
import { Stack, useRouter } from 'expo-router';
import { z } from 'zod';

import { ErrorState, FooterActions, RallyButton, RallyScreen, TextField } from '@/components/rally/ui';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useCreateHabitMutation } from '@/hooks/use-rally-data';
import { applyZodErrors, messageFromError } from '@/lib/forms';
import { useAppStore } from '@/store/use-app-store';

type CreateHabitForm = {
  name: string;
  weeklyTarget: string;
};

const createHabitSchema = z.object({
  name: z.string().trim().min(1, 'Enter a habit name.'),
  weeklyTarget: z
    .string()
    .trim()
    .min(1, 'Enter a weekly target.')
    .regex(/^\d+$/, 'Use a whole number for weekly target.')
    .transform((value) => Number(value))
    .refine((value) => Number.isSafeInteger(value) && value >= 1 && value <= 2147483647, 'Enter a positive whole number.'),
});

export default function CreateHabitScreen() {
  const router = useRouter();
  const online = useNetworkStatus();
  const draft = useAppStore((state) => state.createHabitDraft);
  const updateDraft = useAppStore((state) => state.updateCreateHabitDraft);
  const resetDraft = useAppStore((state) => state.resetCreateHabitDraft);
  const createHabit = useCreateHabitMutation();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateHabitForm>({
    defaultValues: draft,
    mode: 'onBlur',
  });
  const values = useWatch({ control });

  const onSubmit = handleSubmit(async (values) => {
    const parsed = createHabitSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }

    try {
      await createHabit.mutateAsync({ name: parsed.data.name, weeklyTarget: parsed.data.weeklyTarget });
      resetDraft();
      router.dismissTo('/habits');
    } catch {
      // The mutation error below preserves the draft and provides a retry path.
    }
  });

  const dismiss = () => {
    if (isSubmitting) return;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/habits');
    }
  };

  return (
    <RallyScreen
      sheet
      title="What do you want to track?"
      subtitle="Start with one small commitment."
      footer={<FooterActions>
        <RallyButton disabled={!online || !createHabitSchema.safeParse(values).success} loading={isSubmitting || createHabit.isPending} onPress={onSubmit}>
          {isSubmitting || createHabit.isPending ? 'Saving…' : 'Create habit'}
        </RallyButton>
        <RallyButton variant="ghost" onPress={dismiss} disabled={isSubmitting} style={{ minHeight: 44, paddingVertical: 10 }}>
          Cancel
        </RallyButton>
      </FooterActions>}
      rightAction={{
        icon: 'close',
        accessibilityLabel: 'Close Create Habit',
        onPress: dismiss,
        tone: 'muted',
        appearance: 'quiet',
      }}>
      <Stack.Screen options={{ gestureEnabled: !isSubmitting }} />
      <Controller
        control={control}
        name="name"
        rules={{ validate: (value) => Boolean(value.trim()) || 'Enter a habit name.' }}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Habit name"
            onBlur={onBlur}
            editable={!isSubmitting}
            value={value}
            onChangeText={(next) => {
              updateDraft({ name: next });
              onChange(next);
            }}
            placeholder="e.g. Reading"
            helper="Example: Gym, Reading, Running"
            error={errors.name?.message}
            testID="habit-name-input"
          />
        )}
      />
      <Controller
        control={control}
        name="weeklyTarget"
        rules={{ validate: (value) => createHabitSchema.shape.weeklyTarget.safeParse(value).success || 'Enter a positive whole number.' }}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Weekly target"
            onBlur={onBlur}
            editable={!isSubmitting}
            value={value}
            onChangeText={(next) => {
              updateDraft({ weeklyTarget: next });
              onChange(next);
            }}
            keyboardType="number-pad"
            placeholder="3"
            helper="How many times per week? You can mark a habit done once each day."
            error={errors.weeklyTarget?.message}
            testID="weekly-target-input"
          />
        )}
      />
      {createHabit.error ? (
        <ErrorState
          title="We could not create this habit."
          message={`Your details are still here, so you can try again. ${messageFromError(createHabit.error)}`}
        />
      ) : null}
    </RallyScreen>
  );

}
