import { Link, useRouter } from 'expo-router';
import { memo, useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type PressableProps, type StyleProp, type TextInputProps,
  type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { rallyColors as c, rallyRadius } from '@/constants/rally';
import { useNetworkStatus } from '@/hooks/use-network-status';
import type { HabitSummary } from '@/types/rally';

type TextVariant = 'title' | 'heading' | 'cardTitle' | 'body' | 'supporting' | 'micro' | 'code' | 'display';
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'dangerQuiet';
type ChipTone = 'neutral' | 'success' | 'danger' | 'primary';
type IconName = 'add' | 'chevron-back' | 'close' | 'arrow' | 'check';
type RallyHref = ComponentProps<typeof Link>['href'];
type HeaderAction = {
  icon: IconName; accessibilityLabel: string; href?: RallyHref; onPress?: PressableProps['onPress'];
  testID?: string; tone?: 'default' | 'primary' | 'muted'; appearance?: 'framed' | 'quiet';
};

export function RallyText({ variant = 'body', color, selectable, style, children }: {
  variant?: TextVariant; color?: string; selectable?: boolean; style?: StyleProp<TextStyle>; children: ReactNode;
}) {
  return <Text selectable={selectable} accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
    style={[typeStyles[variant], { color: color ?? (variant === 'supporting' || variant === 'micro' ? c.textSecondary : c.textPrimary) }, style]}>{children}</Text>;
}

export function Brand({ small = false }: { small?: boolean }) {
  return <View style={s.brand} accessible accessibilityLabel="Rally. Personal habit tracker.">
    <Svg width={small ? 25 : 28} height={30} viewBox="0 0 28 32" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden>
      <Path fill={c.actionPrimary} d="M3 3h12c7 0 10 4 10 9 0 4-2 7-6 8l7 9h-9L9 18v11H3V3Zm6 6v7h6c3 0 4-2 4-4s-1-3-4-3H9Z" />
    </Svg>
    <RallyText style={{ fontSize: 25, fontWeight: '600', letterSpacing: -1.1 }}>rally</RallyText>
  </View>;
}

export function StudioSignature() {
  return <View style={s.maker} accessible accessibilityLabel="Made by Newtype">
    <View style={s.makerRule} /><RallyText variant="micro" style={s.makerText}>MADE BY  <Text style={{ color: c.textPrimary, fontWeight: '600' }}>NEWTYPE</Text></RallyText><View style={s.makerRule} />
  </View>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <RallyText variant="micro" style={s.eyebrow}>{children}</RallyText>;
}

export function OfflineNotice() {
  const online = useNetworkStatus();
  return online ? null : <View accessibilityRole="alert" style={s.notice}>
    <RallyText variant="supporting">You’re offline. Reconnect to save changes.</RallyText>
  </View>;
}

export function ScreenHeader({ title, subtitle, eyebrow, backHref, onBack, rightAction, compact = false }: {
  title?: string; subtitle?: string; eyebrow?: string; backHref?: RallyHref;
  onBack?: PressableProps['onPress']; rightAction?: HeaderAction; compact?: boolean;
}) {
  const router = useRouter();
  const back = onBack ?? (backHref ? () => router.canGoBack() ? router.back() : router.replace(backHref) : undefined);
  return <View style={s.header}>
    {back ? <View style={s.topRow}><RallyIconButton icon="chevron-back" accessibilityLabel="Back" onPress={back} appearance="quiet" />
      <RallyText variant="supporting">Habit detail</RallyText>{rightAction ? <RallyIconButton {...rightAction} /> : <View style={{ width: 48 }} />}</View> : null}
    {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
    <View style={s.titleRow}><View style={{ flex: 1, gap: 8 }}>
      {title ? <RallyText variant="title" style={compact ? { fontSize: 26, lineHeight: 32, letterSpacing: -0.7 } : back ? { fontSize: 29, lineHeight: 35 } : undefined}>{title}</RallyText> : null}
      {subtitle ? <RallyText variant="supporting">{subtitle}</RallyText> : null}
    </View>{!back && rightAction ? <RallyIconButton {...rightAction} /> : null}</View>
  </View>;
}

export function RallyScreen({ title, subtitle, eyebrow, backHref, onBack, rightAction, children, footer, scroll = true, contentStyle, sheet = false }: {
  title?: string; subtitle?: string; eyebrow?: string; backHref?: RallyHref; onBack?: PressableProps['onPress'];
  rightAction?: HeaderAction; children: ReactNode; footer?: ReactNode; scroll?: boolean; contentStyle?: StyleProp<ViewStyle>; sheet?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const content = <View style={[s.content, contentStyle]}>
    {title || rightAction || backHref ? <ScreenHeader {...{ title, subtitle, eyebrow, backHref, onBack, rightAction }} compact={sheet} /> : null}
    <OfflineNotice />{children}{footer && !sheet ? <View style={{ paddingTop: 8 }}>{footer}</View> : null}
  </View>;
  const container = { paddingTop: sheet ? 24 : insets.top + 16, paddingBottom: insets.bottom + 28 };
  if (sheet && footer) {
    // Give the native sheet an explicit safe-area frame instead of relying on
    // intrinsic flex-only sizing (the earlier blank-sheet failure). The frame
    // follows detent changes; inputs scroll independently of the action footer.
    return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={frame.y}
      style={{ height: frame.height, maxHeight: '100%', flexShrink: 1, backgroundColor: c.bgSurface }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="never" contentContainerStyle={[s.scrollContent, { paddingTop: 28, paddingBottom: 24 }]}>
        {content}
      </ScrollView>
      <View testID="sheet-action-footer" style={[s.fixedFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={{ width: '100%', maxWidth: 480 }}>{footer}</View>
      </View>
    </KeyboardAvoidingView>;
  }
  // Preserve intrinsic root scrolling for sheets that do not have a fixed footer.
  if (sheet && scroll && Platform.OS === 'ios') {
    return <ScrollView style={{ backgroundColor: c.bgApp, flexGrow: 1, flexShrink: 1, flexBasis: 'auto' }}
      contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scrollContent, container]}>{content}</ScrollView>;
  }
  return <View style={s.root}>{scroll ? <ScrollView style={s.root}
    contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive"
    keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scrollContent, container]}>{content}</ScrollView>
    : <View style={[s.scrollContent, { flex: 1 }, container]}>{content}</View>}</View>;
}

export function RallyCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function RallyButton({ children, variant = 'primary', disabled, loading, onPress, href, accessibilityLabel, testID, style }: {
  children: ReactNode; variant?: ButtonVariant; disabled?: boolean; loading?: boolean; onPress?: PressableProps['onPress'];
  href?: RallyHref; accessibilityLabel?: string; testID?: string; style?: StyleProp<ViewStyle>;
}) {
  const color = variant === 'primary' || variant === 'success' || variant === 'danger' ? c.bgApp : variant === 'dangerQuiet' ? c.statusDanger : variant === 'secondary' ? c.actionPrimary : variant === 'ghost' ? c.textSecondary : c.textPrimary;
  const baseStyle = [s.button, buttonStyles[variant], (disabled || loading) && { opacity: 0.55 }, style];
  const button = <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
    accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }} disabled={disabled || loading}
    onPress={onPress} testID={testID} style={href ? StyleSheet.flatten(baseStyle) : ({ pressed }) => [baseStyle, pressed && { opacity: 0.75 }]}>
    {loading ? <ActivityIndicator color={color} /> : null}
    <RallyText color={color} style={s.buttonText}>{children}</RallyText>
  </Pressable>;
  return href && !disabled && !loading ? <Link href={href} asChild>{button}</Link> : button;
}

export function RallyIconButton({ icon, accessibilityLabel, href, onPress, testID, tone = 'default', appearance = 'framed' }: HeaderAction) {
  const paths = { add: 'M12 5v14M5 12h14', 'chevron-back': 'm14 5-7 7 7 7', close: 'm6 6 12 12M18 6 6 18', arrow: 'm9 5 7 7-7 7', check: 'm5 12 4 4 10-10' };
  const baseStyle = [s.iconButton, appearance === 'quiet' && { backgroundColor: 'transparent', borderWidth: 0 }, tone === 'primary' && { backgroundColor: c.actionSoft, borderWidth: 0 }];
  const button = <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} testID={testID}
    style={href ? StyleSheet.flatten(baseStyle) : ({ pressed }) => [baseStyle, pressed && { opacity: 0.65 }]}>
    <Svg width={24} height={24} viewBox="0 0 24 24" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden><Path d={paths[icon]} stroke={tone === 'primary' ? c.actionPrimary : c.textPrimary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
  </Pressable>;
  return href ? <Link href={href} asChild>{button}</Link> : button;
}

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const color = tone === 'success' ? c.statusSuccess : tone === 'danger' ? c.statusDanger : tone === 'primary' ? c.actionPrimary : c.textSecondary;
  return <View style={[s.chip, { backgroundColor: tone === 'success' ? c.successSurface : c.bgInput }]}><RallyText variant="micro" color={color}>{label}</RallyText></View>;
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: ChipTone }) {
  const percent = Math.max(0, Math.min(100, value));
  return <View accessible accessibilityLabel="Weekly progress" accessibilityRole="progressbar"
    accessibilityValue={{ min: 0, max: 100, now: percent, text: Math.round(percent) + '%' }} style={s.progressTrack}>
    <View style={[s.progressFill, { width: percent + '%' as `${number}%`, backgroundColor: tone === 'success' ? c.statusSuccess : c.actionPrimary }]} />
  </View>;
}

export function TextField({ label, helper, error, ...props }: TextInputProps & { label: string; helper?: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  useEffect(() => { if (error) AccessibilityInfo.announceForAccessibility(label + '. ' + error); }, [error, label]);
  return <View style={s.field}>
    <RallyText style={s.fieldLabel}>{label}</RallyText>
    <TextInput autoCapitalize="none" placeholderTextColor={c.textMuted} {...props} accessibilityLabel={label}
      accessibilityHint={error ?? helper} aria-describedby={helper || error ? id : undefined}
      onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
      style={[s.input, focused && { borderColor: c.actionPrimary }, error ? { borderColor: c.statusDanger } : null, props.style]} />
    {error || helper ? <Text nativeID={id} accessibilityLiveRegion="polite" style={[typeStyles.supporting, { color: error ? c.statusDanger : c.textSecondary }]}>{error ?? helper}</Text> : null}
  </View>;
}

export function StatePanel({ title, message, tone = 'neutral', actionLabel, onAction, href }: {
  title: string; message: string; tone?: ChipTone; actionLabel?: string; onAction?: PressableProps['onPress']; href?: RallyHref;
}) {
  return <RallyCard style={{ padding: 20, gap: 16, marginTop: 24 }}><Eyebrow>{tone === 'danger' ? 'LET’S TRY THAT AGAIN' : 'A PLACE TO START'}</Eyebrow>
    <RallyText variant="heading">{title}</RallyText><RallyText variant="supporting">{message}</RallyText>
    {actionLabel ? <RallyButton onPress={onAction} href={href}>{actionLabel}</RallyButton> : null}</RallyCard>;
}

export function LoadingState({ label = 'Loading habits...' }: { label?: string }) {
  return <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
    <RallyText variant="supporting">{label}</RallyText>
    {[0, 1, 2].map((key) => <View key={key} style={s.skeleton} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[s.skeletonLine, { width: '65%', height: 18 }]} /><View style={s.skeletonLine} /><View style={[s.skeletonLine, { width: '35%', height: 36, alignSelf: 'flex-end' }]} />
    </View>)}
  </View>;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message: string; onRetry?: PressableProps['onPress'] }) {
  useEffect(() => { AccessibilityInfo.announceForAccessibility(title + ' ' + message); }, [title, message]);
  return <View accessibilityRole="alert" style={s.error}><RallyText color={c.statusDanger} style={{ fontWeight: '600' }}>{title}</RallyText>
    {message !== title ? <RallyText variant="supporting">{message}</RallyText> : null}
    {onRetry ? <RallyButton variant="secondary" onPress={onRetry}>Try again</RallyButton> : null}</View>;
}

export function FooterActions({ children }: { children: ReactNode }) { return <View style={{ gap: 4 }}>{children}</View>; }
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: 16, paddingTop: 12 }}><RallyText variant="heading">{title}</RallyText>{children}</View>;
}
export function MetricCell({ label, value }: { label: string; value: string }) {
  return <View style={s.metric} accessible accessibilityLabel={label + ', ' + value}><RallyText variant="display" style={{ fontSize: 26, lineHeight: 32, letterSpacing: -0.5 }}>{value}</RallyText><RallyText variant="supporting">{label}</RallyText></View>;
}

export const HabitCard = memo(function HabitCard({ habit, onMarkDone, onUndo, onOpen, busy, disabled }: {
  habit: HabitSummary; onMarkDone?: () => void; onUndo?: () => void; onOpen?: () => void; busy?: boolean; disabled?: boolean;
}) {
  return <RallyCard style={[{ padding: 16, gap: 10 }, habit.done_today && { borderColor: c.successBorder }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Open ' + habit.name} onPress={onOpen} style={({ pressed }) => [s.cardTitleRow, pressed && { opacity: 0.65 }]}>
      <RallyText variant="cardTitle" style={{ flex: 1 }}>{habit.name}</RallyText>
      <Svg width={18} height={18} viewBox="0 0 24 24" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden><Path d="m9 5 7 7-7 7" stroke={c.textSecondary} strokeWidth={1.8} fill="none" /></Svg>
    </Pressable>
    <View style={s.progressRow}><RallyText variant="supporting" style={{ flexShrink: 1 }}>{habit.completed_this_week} / {habit.weekly_target} this week</RallyText>
      <RallyText variant="supporting">{Math.round(habit.progress_percentage)}%</RallyText></View>
    <ProgressBar value={habit.progress_percentage} tone={habit.done_today ? 'success' : 'primary'} />
    <View style={s.cardActionRow}>
      {habit.done_today ? <RallyText variant="micro" color={c.statusSuccess}>✓  Done today</RallyText> : <RallyText variant="micro">Today</RallyText>}
      <RallyButton variant={habit.done_today ? 'ghost' : 'secondary'} loading={busy} disabled={disabled}
        onPress={habit.done_today ? onUndo : onMarkDone} style={s.cardAction}>{busy ? 'Updating…' : habit.done_today ? 'Undo' : 'Mark done'}</RallyButton>
    </View>
  </RallyCard>;
});

export function RallySheetScreen({ backgroundTitle, sheetTitle, onClose, children, footer }: {
  backgroundTitle: string; sheetTitle: string; onClose?: PressableProps['onPress']; children: ReactNode; footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return <View style={s.sheetRoot} accessibilityViewIsModal>
    <ScrollView contentContainerStyle={[s.sheetScroll, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }]}
      keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never">
      <View style={s.sheetPanel}>
        <View style={s.topRow}><Eyebrow>MANAGE HABIT</Eyebrow>{onClose ? <RallyIconButton icon="close" accessibilityLabel="Close" onPress={onClose} appearance="quiet" /> : null}</View>
        <RallyText variant="supporting">{backgroundTitle}</RallyText>
        <RallyText variant="title">{sheetTitle}</RallyText>
        <View style={{ gap: 16 }}>{children}</View>
      </View>
    </ScrollView>
    {footer ? <View style={[s.fixedFooter, { backgroundColor: c.bgApp, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={{ width: '100%', maxWidth: 480 }}>{footer}</View>
    </View> : null}
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgApp },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 22 },
  content: { width: '100%', maxWidth: 480, gap: 24 },
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  maker: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 },
  makerRule: { width: 24, height: 1, backgroundColor: c.borderInput },
  makerText: { fontSize: 10, letterSpacing: 1.4 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  header: { gap: 16, paddingBottom: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { borderRadius: rallyRadius.card, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface, padding: 20, gap: 18 },
  button: { minHeight: 52, borderRadius: rallyRadius.control, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  iconButton: { minWidth: 48, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface, alignItems: 'center', justifyContent: 'center' },
  chip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, flexShrink: 1 },
  progressTrack: { height: 4, borderRadius: 3, backgroundColor: c.borderDefault, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  field: { gap: 9 }, fieldLabel: { fontSize: 14, fontWeight: '500' },
  input: { minHeight: 56, borderWidth: 1, borderColor: c.borderInput, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: c.bgInput, color: c.textPrimary, fontSize: 16, lineHeight: 24 },
  loading: { paddingVertical: 48, alignItems: 'center', gap: 14 },
  error: { padding: 16, gap: 8, backgroundColor: c.dangerSurface, borderRadius: 12 },
  notice: { padding: 14, backgroundColor: c.bgElevated, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: c.actionPrimary },
  metric: { width: '47%', minWidth: 0, gap: 5 },
  cardTitleRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  cardActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  cardAction: { minHeight: 44, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
  fixedFooter: { paddingTop: 16, paddingHorizontal: 22, borderTopWidth: 1, borderTopColor: c.borderDefault, backgroundColor: c.bgSurface, alignItems: 'center' },
  skeleton: { padding: 20, gap: 17, borderRadius: 18, backgroundColor: c.bgSurface, borderWidth: 1, borderColor: c.borderDefault },
  skeletonLine: { height: 12, borderRadius: 4, backgroundColor: c.borderDefault, width: '100%' },
  sheetRoot: { flex: 1, backgroundColor: c.bgApp },
  sheetScroll: { flexGrow: 1, paddingHorizontal: 22, alignItems: 'center' },
  sheetPanel: { width: '100%', maxWidth: 480, gap: 24 },
});
const typeStyles = StyleSheet.create({
  title: { fontSize: 31, lineHeight: 37, fontWeight: '600', letterSpacing: -1.05 },
  heading: { fontSize: 18, lineHeight: 25, fontWeight: '600', letterSpacing: -0.4 },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.35 },
  body: { fontSize: 15, lineHeight: 23 },
  supporting: { fontSize: 13, lineHeight: 21 },
  micro: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  code: { fontSize: 13, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  display: { fontSize: 38, lineHeight: 44, fontWeight: '500', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
});
const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: c.actionPrimary },
  secondary: { backgroundColor: c.bgElevated },
  danger: { backgroundColor: c.statusDanger },
  dangerQuiet: { backgroundColor: 'transparent' },
  ghost: { backgroundColor: 'transparent' },
  success: { backgroundColor: c.statusSuccess },
});
