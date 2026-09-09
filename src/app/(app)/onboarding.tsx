import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Brand, ErrorState, Eyebrow, RallyButton, RallyCard, RallyScreen, RallyText } from '@/components/rally/ui';
import { rallyColors as c } from '@/constants/rally';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { completeOnboarding } from '@/lib/rally-api';
import { useAppStore } from '@/store/use-app-store';

export default function OnboardingScreen() {
  const router = useRouter();
  const online = useNetworkStatus();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const finish = async (create: boolean) => {
    if (pending.current || !online) return;
    pending.current = true; setBusy(true); setError(false);
    const accountId = useAppStore.getState().session?.user.id;
    try {
      const user = await completeOnboarding();
      const current = useAppStore.getState().session;
      if (!current || current.user.id !== accountId || user.id !== accountId) return;
      useAppStore.getState().setSession({ ...current, user });
      // Replace the intro before opening the sheet so Cancel returns to habits.
      router.replace('/habits');
      if (create) router.push('/habits/new');
    } catch { setError(true); }
    finally { pending.current = false; setBusy(false); }
  };
  return <RallyScreen contentStyle={{ gap: 28, paddingTop: 12 }}>
    <Brand />
    <View style={s.steps} accessible accessibilityLabel={`Getting started, step ${step + 1} of 2`}>
      {[0, 1].map((i) => <View key={i} style={[s.step, { backgroundColor: i <= step ? c.actionPrimary : c.borderDefault }]} />)}
    </View>
    <View style={{ gap: 14 }}>
      <Eyebrow>{step === 0 ? 'WELCOME TO RALLY' : 'YOUR FIRST SMALL STEP'}</Eyebrow>
      <RallyText variant="title">{step === 0 ? 'A little, often.\nThat’s progress.' : 'Start small.\nMake it yours.'}</RallyText>
      <RallyText variant="supporting">{step === 0 ? 'A private space to build habits that fit your week.' : 'Choose one habit you can come back to. You can always add more later.'}</RallyText>
    </View>
    {step === 0 ? <View style={{ gap: 12 }}>
      <IntroItem number="01" title="Set a weekly target" text="Choose a habit and how many times you want to do it each week." />
      <IntroItem number="02" title="Mark it done today" text="Record one completion per day. Made a mistake? Tap Undo." />
      <IntroItem number="03" title="See your progress" text="Review your week and history. An imperfect week is still progress." />
    </View> : <RallyCard>
      <RallyText variant="cardTitle">What feels doable?</RallyText>
      <RallyText variant="supporting">Read a few pages. Go for a walk. Make time to unwind.</RallyText>
      <View style={s.example}><RallyText color={c.actionPrimary}>Reading</RallyText><RallyText variant="supporting">3 times per week</RallyText></View>
      <RallyText variant="micro">An example, not a requirement. Your habit and target are up to you.</RallyText>
    </RallyCard>}
    {error ? <ErrorState title="We couldn’t save your setup." message="Your place is still here. Check your connection and try again." /> : null}
    <View style={{ gap: 4 }}>
      <RallyButton loading={busy} disabled={!online} onPress={() => step === 0 ? setStep(1) : void finish(true)}>{busy ? 'Saving…' : step === 0 ? 'Let’s begin' : 'Create my first habit'}</RallyButton>
      <RallyButton variant="ghost" disabled={busy || !online} onPress={() => void finish(false)}>Skip for now</RallyButton>
      {step === 1 ? <RallyButton variant="ghost" disabled={busy} onPress={() => setStep(0)}>Previous</RallyButton> : null}
    </View>
  </RallyScreen>;
}

function IntroItem({ number, title, text }: { number: string; title: string; text: string }) {
  return <View style={s.item}><RallyText variant="code" color={c.actionPrimary}>{number}</RallyText><View style={{ flex: 1, gap: 5 }}>
    <RallyText variant="cardTitle">{title}</RallyText><RallyText variant="supporting">{text}</RallyText>
  </View></View>;
}
const s = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6, marginTop: 8 },
  step: { height: 3, width: 32, borderRadius: 2 },
  item: { flexDirection: 'row', gap: 16, paddingVertical: 12 },
  example: { padding: 16, gap: 6, borderRadius: 12, backgroundColor: c.bgElevated },
});
