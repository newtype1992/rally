import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import { ErrorState, FooterActions, RallyButton, RallyScreen, TextField } from '@/components/rally/ui';
import { applyZodErrors } from '@/lib/forms';
import { signInWithEmail } from '@/lib/rally-api';

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
      router.replace('/habits');
    } catch {
      setApiError('We could not sign you in. Check your details and try again.');
    }
  });

  return (
    <RallyScreen
      title="Track your weekly habits privately."
      subtitle="Create habits, mark them done, and see where each one stands this week."
      footer={
        <FooterActions>
          <RallyButton loading={isSubmitting} onPress={onSubmit}>
            Log in
          </RallyButton>
          <RallyButton variant="secondary" href="/sign-up">
            Sign up
          </RallyButton>
        </FooterActions>
      }>
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
      {apiError ? <ErrorState title="We could not sign you in." message={apiError} /> : null}
    </RallyScreen>
  );
}
