import { Controller, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Brand, ErrorState, RallyButton, RallyScreen, RallyText, StudioSignature, TextField } from '@/components/rally/ui';
import { rallyColors as c } from '@/constants/rally';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { signInWithEmail, signUpWithEmail } from '@/lib/rally-api';
import { useAppStore } from '@/store/use-app-store';

type AuthForm = { email: string; password: string };
const schema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  password: z.string().min(6, 'Use at least 6 characters.'),
});

export function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const online = useNetworkStatus();
  const ready = useAppStore((state) => state.sessionInitialized);
  const signup = mode === 'signup';
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthForm>({
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });
  const values = useWatch({ control });
  const valid = schema.safeParse(values).success;
  const onSubmit = handleSubmit(async (values) => {
    const result = schema.safeParse(values);
    if (!result.success || !online) return;
    setApiError(null);
    try {
      const session = signup
        ? await signUpWithEmail(result.data.email, result.data.password)
        : await signInWithEmail(result.data.email, result.data.password);
      if (session) router.replace('/habits');
      else setConfirmation(true);
    } catch {
      setApiError(signup
        ? 'We couldn’t create your account. Check your connection and try again.'
        : 'We couldn’t log you in. Check your email and password, then try again.');
    }
  });
  return <RallyScreen contentStyle={{ gap: 27, paddingTop: 12 }}>
    <Brand />
    <View style={s.hero}>
      <RallyText variant="title" style={s.heroText}>Make room{"\n"}for progress.</RallyText>
      <RallyText variant="supporting" style={{ maxWidth: 285, marginTop: 12 }}>
        Track your weekly habits privately.{"\n"}One small commitment at a time.
      </RallyText>
    </View>
    <View style={s.form}>
      <View style={s.tabs} accessibilityRole="tablist">
        {(['login', 'signup'] as const).map((tab) => <Pressable key={tab} accessibilityRole="tab"
          accessibilityLabel={tab === 'login' ? 'Log in' : 'Sign up'} accessibilityState={{ selected: mode === tab, disabled: isSubmitting }}
          disabled={isSubmitting} onPress={() => { if (mode !== tab) router.replace(tab === 'login' ? '/log-in' : '/sign-up'); }}
          style={[s.tab, mode === tab && s.activeTab]}>
          <RallyText color={mode === tab ? c.actionPrimary : c.textSecondary} style={{ fontSize: 14, fontWeight: '600' }}>{tab === 'login' ? 'Log in' : 'Sign up'}</RallyText>
        </Pressable>)}
      </View>
      <Controller control={control} name="email" rules={{ validate: (v) => z.string().trim().email().safeParse(v).success || 'Enter a valid email.' }}
        render={({ field }) => <TextField label="Email" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          editable={ready && !isSubmitting} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCorrect={false} placeholder="you@example.com" error={errors.email?.message} />} />
      <Controller control={control} name="password" rules={{ required: 'Enter your password.', minLength: { value: 6, message: 'Use at least 6 characters.' } }}
        render={({ field }) => <TextField label="Password" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          editable={ready && !isSubmitting} secureTextEntry autoComplete={signup ? 'new-password' : 'current-password'} textContentType={signup ? 'newPassword' : 'password'}
          placeholder={signup ? 'At least 6 characters' : 'Your password'} returnKeyType="go" onSubmitEditing={() => { if (valid) void onSubmit(); }}
          error={errors.password?.message} />} />
      {apiError ? <ErrorState title="Let’s try that again." message={apiError} /> : null}
      {confirmation ? <View accessibilityRole="alert"><RallyText>Check your email to confirm your account, then return to Log in.</RallyText></View> : null}
      <RallyButton disabled={!ready || !valid || !online || confirmation} loading={isSubmitting} onPress={onSubmit}>{isSubmitting ? signup ? 'Creating account…' : 'Signing in…' : signup ? 'Sign up' : 'Log in'}</RallyButton>
    </View>
    <StudioSignature />
  </RallyScreen>;
}
const s = StyleSheet.create({
  hero: { paddingTop: 11 },
  heroText: { fontSize: 33, lineHeight: 38, fontWeight: '600', letterSpacing: -1.1 },
  form: { gap: 20 },
  tabs: { flexDirection: 'row', backgroundColor: c.bgSurface, borderRadius: 12, padding: 4 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 9 },
  activeTab: { backgroundColor: c.bgElevated },
});
