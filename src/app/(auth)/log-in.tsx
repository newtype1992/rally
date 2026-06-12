import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import {
  ErrorState,
  FooterActions,
  RallyButton,
  RallyScreen,
  StatePanel,
  TextField,
} from '@/components/rally/ui';
import { applyZodErrors, messageFromError } from '@/lib/forms';
import { signInWithEmail } from '@/lib/rally-api';
import { useAppStore } from '@/store/use-app-store';

type LoginForm = {
  email: string;
  password: string;
};

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export default function LogInScreen() {
  const router = useRouter();
  const inviteTokenOrCode = useAppStore((state) => state.inviteContext.inviteTokenOrCode);
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }
    setApiError(null);
    try {
      await signInWithEmail(parsed.data.email, parsed.data.password);
      if (inviteTokenOrCode) {
        router.replace(`/invite/${inviteTokenOrCode}/setup`);
        return;
      }
      router.replace('/today');
    } catch (error) {
      setApiError(messageFromError(error));
    }
  });

  return (
    <RallyScreen
      title="Rally"
      subtitle="Log in to keep private habits and shared accountability in one place."
      footer={
        <FooterActions>
          <RallyButton loading={isSubmitting} onPress={onSubmit}>
            Log in
          </RallyButton>
          <RallyButton variant="secondary" href="/sign-up">
            Create account
          </RallyButton>
        </FooterActions>
      }>
      <StatePanel
        title="Track privately first"
        message="Sharing happens per habit, only after you choose to invite someone."
        tone="private"
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Email"
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            placeholder="avery.local@example.test"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Password"
            value={value}
            onChangeText={onChange}
            secureTextEntry
            placeholder="password123"
            error={errors.password?.message}
          />
        )}
      />
      {apiError ? <ErrorState title="Log in failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
