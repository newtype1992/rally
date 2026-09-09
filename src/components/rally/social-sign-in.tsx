import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { RallyText } from '@/components/rally/ui';
import { isSocialProviderEnabled, type SocialProvider } from '@/lib/social-auth';

export function SocialSignIn({ disabled, pending, onSignIn }: {
  disabled: boolean; pending: SocialProvider | null; onSignIn: (provider: SocialProvider) => void;
}) {
  const [nativeApple, setNativeApple] = useState(false);
  useEffect(() => {
    let active = true;
    if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then((available) => { if (active) setNativeApple(available); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const googleEnabled = isSocialProviderEnabled('google');
  const appleEnabled = isSocialProviderEnabled('apple');
  return <View style={{ gap: 12 }}>
    <ProviderButton provider="google" disabled={disabled || !googleEnabled} pending={pending === 'google'} onPress={() => onSignIn('google')} />
    {nativeApple && appleEnabled ? <View pointerEvents={disabled ? 'none' : 'auto'} accessibilityState={{ disabled, busy: pending === 'apple' }} style={disabled ? { opacity: 0.55 } : undefined}>
      <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE} cornerRadius={12} style={{ height: 52, width: '100%' }}
        onPress={() => { if (!disabled) onSignIn('apple'); }} />
      {pending === 'apple' ? <RallyText variant="micro" style={{ textAlign: 'center', marginTop: 8 }}>Connecting to Apple…</RallyText> : null}
    </View> : <ProviderButton provider="apple" disabled={disabled || !appleEnabled} pending={pending === 'apple'} onPress={() => onSignIn('apple')} />}
    {!googleEnabled || !appleEnabled ? <RallyText variant="micro">{!googleEnabled && !appleEnabled ? 'Google and Apple sign-in are' : !googleEnabled ? 'Google sign-in is' : 'Apple sign-in is'} being set up. Email is available now.</RallyText> : null}
    <RallyText variant="micro" style={{ textAlign: 'center' }}>or continue with email</RallyText>
  </View>;
}

function ProviderButton({ provider, disabled, pending, onPress }: {
  provider: SocialProvider; disabled: boolean; pending: boolean; onPress: () => void;
}) {
  const label = `Continue with ${provider === 'google' ? 'Google' : 'Apple'}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: pending }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, (disabled || pressed) && { opacity: 0.55 }]}>
    {pending ? <ActivityIndicator color="#1F1F1F" /> : provider === 'google' ? <Image source={require('../../../assets/google-g.png')} style={{ width: 20, height: 20 }} accessible={false} /> : null}
    <RallyText color="#1F1F1F" style={{ fontSize: 15, fontWeight: '500', textAlign: 'center', flexShrink: 1 }}>{label}</RallyText>
  </Pressable>;
}
const s = StyleSheet.create({
  button: { minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775' },
});
