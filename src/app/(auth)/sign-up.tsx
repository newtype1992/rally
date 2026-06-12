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
import { signUpWithEmail } from '@/lib/rally-api';

type SignUpForm = {
  displayName: string;
  email: string;
  password: string;
};

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, 'Add the name your buddies will see.'),
  email: z.string().trim().email('Enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export default function SignUpScreen() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors(parsed.error, setError);
      return;
    }
    setApiError(null);
    try {
      await signUpWithEmail(parsed.data.email, parsed.data.password, parsed.data.displayName);
      router.replace('/first-habit');
    } catch (error) {
      setApiError(messageFromError(error));
    }
  });

  return (
    <RallyScreen
      title="Create account"
      subtitle="Start with one private habit. Sharing stays optional."
      footer={
        <FooterActions>
          <RallyButton loading={isSubmitting} onPress={onSubmit}>
            Continue
          </RallyButton>
          <RallyButton variant="secondary" href="/log-in">
            Log in instead
          </RallyButton>
        </FooterActions>
      }>
      <StatePanel
        title="Your first habit stays private"
        message="You can invite friends to this one habit after setup without exposing anything else."
        tone="private"
      />
      <Controller
        control={control}
        name="displayName"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Display name"
            value={value}
            onChangeText={onChange}
            autoCapitalize="words"
            placeholder="Avery"
            error={errors.displayName?.message}
          />
        )}
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
            placeholder="you@example.com"
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
            placeholder="6 characters minimum"
            error={errors.password?.message}
          />
        )}
      />
      {apiError ? <ErrorState title="Sign up failed" message={apiError} /> : null}
    </RallyScreen>
  );
}
