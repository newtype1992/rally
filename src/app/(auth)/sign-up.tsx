import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import { ErrorState, FooterActions, RallyButton, RallyScreen, TextField } from '@/components/rally/ui';
import { applyZodErrors } from '@/lib/forms';
import { signUpWithEmail } from '@/lib/rally-api';

type SignUpForm = {
  email: string;
  password: string;
};

const signUpSchema = z.object({
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
      await signUpWithEmail(parsed.data.email, parsed.data.password);
      router.replace('/habits');
    } catch {
      setApiError('Something went wrong while creating your account. Try again.');
    }
  });

  return (
    <RallyScreen
      title="Track your weekly habits privately."
      subtitle="Create habits, mark them done, and see where each one stands this week."
      footer={
        <FooterActions>
          <RallyButton loading={isSubmitting} onPress={onSubmit}>
            Sign up
          </RallyButton>
          <RallyButton variant="secondary" href="/log-in">
            Log in
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
      {apiError ? <ErrorState title="Something went wrong while creating your account." message={apiError} /> : null}
    </RallyScreen>
  );
}
