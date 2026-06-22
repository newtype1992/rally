import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { z } from 'zod';

import { ErrorState, FooterActions, RallyButton, RallyScreen, TextField } from '@/components/rally/ui';
import { rallyColors } from '@/constants/rally';
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
    .refine((value) => value >= 1, 'Weekly target must be at least 1.'),
});

export default function CreateHabitScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
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
  });

  const onSubmit = handleSubmit(async (values) => {
    const parsed = createHabitSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }

    await createHabit.mutateAsync({
      name: parsed.data.name,
      weekly_target: parsed.data.weeklyTarget,
    });
    resetDraft();
    router.dismissTo('/habits');
  });

  const dismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/habits');
    }
  };

  const screen = (
    <RallyScreen
      title="What do you want to track?"
      subtitle="Keep setup short. You can adjust details after the habit exists."
      rightAction={{
        icon: 'close',
        accessibilityLabel: 'Close Create Habit',
        onPress: dismiss,
        tone: 'muted',
      }}>
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Habit name"
            value={value}
            onChangeText={(next) => {
              updateDraft({ name: next });
              onChange(next);
            }}
            placeholder="Gym"
            helper="Example: Gym, Reading, Running"
            error={errors.name?.message}
            testID="habit-name-input"
          />
        )}
      />
      <Controller
        control={control}
        name="weeklyTarget"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Weekly target"
            value={value}
            onChangeText={(next) => {
              updateDraft({ weeklyTarget: next });
              onChange(next);
            }}
            keyboardType="number-pad"
            placeholder="3"
            helper="How many times per week?"
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
      <FooterActions>
        <RallyButton loading={isSubmitting || createHabit.isPending} onPress={onSubmit}>
          Create habit
        </RallyButton>
        <RallyButton variant="secondary" onPress={dismiss}>
          Cancel
        </RallyButton>
      </FooterActions>
    </RallyScreen>
  );

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.iosSheetHost, { height: Math.round(windowHeight * 0.8) }]}>
        {screen}
      </View>
    );
  }

  return <View style={styles.screenHost}>{screen}</View>;
}

const styles = StyleSheet.create({
  iosSheetHost: {
    backgroundColor: rallyColors.bgApp,
  },
  screenHost: {
    flex: 1,
    backgroundColor: rallyColors.bgApp,
  },
});
