import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { z } from 'zod';

import {
  FooterActions,
  RallyButton,
  RallyCard,
  RallyScreen,
  RallyText,
  TextField,
  WeekdaySelector,
} from '@/components/rally/ui';
import { habitExampleName } from '@/constants/rally';
import { applyZodErrors } from '@/lib/forms';
import { useAppStore } from '@/store/use-app-store';
import type { Weekday } from '@/types/rally';

type FirstHabitForm = {
  habitName: string;
  plannedWeekdays: Weekday[];
};

const firstHabitSchema = z.object({
  habitName: z.string().trim().min(1, 'Name the habit.'),
  plannedWeekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Choose at least one day.'),
});

export default function FirstHabitScreen() {
  const router = useRouter();
  const draft = useAppStore((state) => state.onboardingDraft);
  const updateDraft = useAppStore((state) => state.updateOnboardingDraft);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FirstHabitForm>({
    defaultValues: {
      habitName: draft.habitName,
      plannedWeekdays: draft.plannedWeekdays,
    },
  });

  const onSubmit = handleSubmit((values) => {
    const parsed = firstHabitSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }
    updateDraft({
      habitName: parsed.data.habitName.trim(),
      plannedWeekdays: parsed.data.plannedWeekdays as Weekday[],
    });
    router.push('/setup-details');
  });

  return (
    <RallyScreen
      title="First habit"
      subtitle={`Use ${habitExampleName} if you want a fast first pass, or name any habit you actually track.`}
      footer={
        <FooterActions>
          <RallyButton onPress={onSubmit}>Continue</RallyButton>
        </FooterActions>
      }>
      <RallyCard>
        <RallyText variant="cardTitle">Pick the days you plan to do it</RallyText>
        <RallyText variant="supporting">
          These selected days define your weekly target. There is no separate target preset.
        </RallyText>
      </RallyCard>
      <Controller
        control={control}
        name="habitName"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Habit name"
            value={value}
            onChangeText={onChange}
            autoCapitalize="words"
            placeholder={habitExampleName}
            error={errors.habitName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="plannedWeekdays"
        render={({ field: { value, onChange } }) => (
          <RallyCard>
            <RallyText variant="micro">Planned days</RallyText>
            <WeekdaySelector selected={value} onChange={onChange} />
            {errors.plannedWeekdays?.message ? (
              <RallyText selectable variant="supporting" color="#FF5C7A">
                {errors.plannedWeekdays.message}
              </RallyText>
            ) : null}
          </RallyCard>
        )}
      />
    </RallyScreen>
  );
}
