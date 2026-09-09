import { Link, useRouter } from 'expo-router';
import { memo, useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type PressableProps, type StyleProp, type TextInputProps,
  type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rallyColors as c, rallyRadius } from '@/constants/rally';
import { useNetworkStatus } from '@/hooks/use-network-status';
import type { HabitSummary } from '@/types/rally';

type TextVariant = 'title' | 'heading' | 'cardTitle' | 'body' | 'supporting' | 'micro' | 'code' | 'display';
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
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
    <View style={[s.brandMark, small && { width: 26, height: 26 }]} accessibilityElementsHidden>
      <View style={s.markStem} /><View style={s.markFlag} />
    </View>
    <RallyText style={{ fontSize: small ? 22 : 26, fontWeight: '800', letterSpacing: -1 }}>rally</RallyText>
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

export function ScreenHeader({ title, subtitle, eyebrow, backHref, onBack, rightAction }: {
  title?: string; subtitle?: string; eyebrow?: string; backHref?: RallyHref;
  onBack?: PressableProps['onPress']; rightAction?: HeaderAction;
}) {
  const router = useRouter();
  const back = onBack ?? (backHref ? () => router.canGoBack() ? router.back() : router.replace(backHref) : undefined);
  return <View style={s.header}>
    {back ? <View style={s.topRow}><RallyIconButton icon="chevron-back" accessibilityLabel="Back" onPress={back} appearance="quiet" />
      <Eyebrow>YOUR HABIT</Eyebrow>{rightAction ? <RallyIconButton {...rightAction} /> : <View style={{ width: 44 }} />}</View> : null}
    {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
    <View style={s.titleRow}><View style={{ flex: 1, gap: 8 }}>
      {title ? <RallyText variant="title">{title}</RallyText> : null}
      {subtitle ? <RallyText variant="supporting">{subtitle}</RallyText> : null}
    </View>{!back && rightAction ? <RallyIconButton {...rightAction} /> : null}</View>
  </View>;
}

export function RallyScreen({ title, subtitle, eyebrow, backHref, onBack, rightAction, children, footer, scroll = true, contentStyle, sheet = false }: {
  title?: string; subtitle?: string; eyebrow?: string; backHref?: RallyHref; onBack?: PressableProps['onPress'];
  rightAction?: HeaderAction; children: ReactNode; footer?: ReactNode; scroll?: boolean; contentStyle?: StyleProp<ViewStyle>; sheet?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const content = <View style={[s.content, contentStyle]}>
    {title || rightAction || backHref ? <ScreenHeader {...{ title, subtitle, eyebrow, backHref, onBack, rightAction }} /> : null}
    <OfflineNotice />{children}{footer ? <View style={{ paddingTop: 8 }}>{footer}</View> : null}
  </View>;
  const container = { paddingTop: sheet ? 24 : insets.top + 24, paddingBottom: insets.bottom + 32 };
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
  const color = variant === 'primary' || variant === 'success' ? c.bgApp : variant === 'danger' ? c.statusDanger : c.textPrimary;
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
  const glyph = { add: '+', 'chevron-back': '←', close: '×', arrow: '↗', check: '✓' }[icon];
  const baseStyle = [s.iconButton, appearance === 'quiet' && { backgroundColor: 'transparent', borderWidth: 0 }, tone === 'primary' && { backgroundColor: c.actionPrimary, borderColor: c.actionPrimary }];
  const button = <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} testID={testID}
    style={href ? StyleSheet.flatten(baseStyle) : ({ pressed }) => [baseStyle, pressed && { opacity: 0.65 }]}>
    <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 26, color: tone === 'primary' ? c.bgApp : c.textPrimary }}>{glyph}</Text>
  </Pressable>;
  return href ? <Link href={href} asChild>{button}</Link> : button;
}

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const color = tone === 'success' ? c.statusSuccess : tone === 'danger' ? c.statusDanger : tone === 'primary' ? c.actionPrimary : c.textSecondary;
  return <View style={[s.chip, { backgroundColor: tone === 'success' ? '#253525' : c.bgInput }]}><RallyText variant="micro" color={color}>{label}</RallyText></View>;
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
  return <RallyCard style={{ paddingVertical: 32, gap: 16 }}><Eyebrow>{tone === 'danger' ? 'LET’S TRY THAT AGAIN' : 'A FRESH START'}</Eyebrow>
    <RallyText variant="heading">{title}</RallyText><RallyText variant="supporting">{message}</RallyText>
    {actionLabel ? <RallyButton onPress={onAction} href={href}>{actionLabel}</RallyButton> : null}</RallyCard>;
}

export function LoadingState({ label = 'Loading habits...' }: { label?: string }) {
  return <View style={s.loading} accessible accessibilityLabel={label}><ActivityIndicator color={c.actionPrimary} /><RallyText variant="supporting">{label}</RallyText></View>;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message: string; onRetry?: PressableProps['onPress'] }) {
  useEffect(() => { AccessibilityInfo.announceForAccessibility(title + ' ' + message); }, [title, message]);
  return <View accessibilityRole="alert" style={s.error}><RallyText color={c.statusDanger} style={{ fontWeight: '600' }}>{title}</RallyText>
    {message !== title ? <RallyText variant="supporting">{message}</RallyText> : null}
    {onRetry ? <RallyButton variant="secondary" onPress={onRetry}>Try again</RallyButton> : null}</View>;
}

export function FooterActions({ children }: { children: ReactNode }) { return <View style={{ gap: 10 }}>{children}</View>; }
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: 16, paddingTop: 12 }}><RallyText variant="heading">{title}</RallyText>{children}</View>;
}
export function MetricCell({ label, value }: { label: string; value: string }) {
  return <View style={s.metric} accessible accessibilityLabel={label + ', ' + value}><RallyText variant="display">{value}</RallyText><RallyText variant="supporting">{label}</RallyText></View>;
}

export const HabitCard = memo(function HabitCard({ habit, onMarkDone, onUndo, onOpen, busy, disabled, index = 0 }: {
  habit: HabitSummary; onMarkDone?: () => void; onUndo?: () => void; onOpen?: () => void; busy?: boolean; disabled?: boolean; index?: number;
}) {
  return <RallyCard style={habit.done_today ? { borderColor: '#435A3F' } : undefined}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Open ' + habit.name} onPress={onOpen} style={({ pressed }) => [s.cardTitleRow, pressed && { opacity: 0.65 }]}>
      <Text style={s.cardIndex}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={{ flex: 1, gap: 4 }}><RallyText variant="cardTitle">{habit.name}</RallyText>
        <RallyText variant="supporting">{habit.completed_this_week} / {habit.weekly_target} this week</RallyText></View>
      <Text style={{ fontSize: 23, color: c.textMuted }}>↗</Text>
    </Pressable>
    <View style={s.progressRow}><View style={{ flex: 1 }}><ProgressBar value={habit.progress_percentage} tone={habit.done_today ? 'success' : 'primary'} /></View>
      <RallyText variant="code" color={habit.done_today ? c.statusSuccess : c.actionPrimary}>{Math.round(habit.progress_percentage)}%</RallyText></View>
    <View style={s.cardActionRow}>
      {habit.done_today ? <Chip label="✓  Done today" tone="success" /> : <RallyText variant="micro">One small step today.</RallyText>}
      <RallyButton variant={habit.done_today ? 'ghost' : 'secondary'} loading={busy} disabled={disabled}
        onPress={habit.done_today ? onUndo : onMarkDone} style={s.cardAction}>{habit.done_today ? 'Undo' : 'Mark done'}</RallyButton>
    </View>
  </RallyCard>;
});

export function RallySheetScreen({ backgroundTitle, sheetTitle, onClose, children }: {
  backgroundTitle: string; sheetTitle: string; onClose?: PressableProps['onPress']; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return <View style={s.sheetRoot} accessibilityViewIsModal>
    <ScrollView contentContainerStyle={[s.sheetScroll, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }]}
      keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never">
      <View style={s.sheetPanel}>
        <View style={s.topRow}><Eyebrow>MANAGE HABIT</Eyebrow>{onClose ? <RallyIconButton icon="close" accessibilityLabel="Close" onPress={onClose} appearance="quiet" /> : null}</View>
        <Chip label={backgroundTitle} />
        <RallyText variant="title">{sheetTitle}</RallyText>
        <View style={{ gap: 16 }}>{children}</View>
      </View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgApp },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24 },
  content: { width: '100%', maxWidth: 480, gap: 24 },
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  brandMark: { width: 32, height: 32, backgroundColor: c.actionPrimary, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  markStem: { position: 'absolute', width: 3, height: 17, left: '32%', top: '25%', backgroundColor: c.bgApp, borderRadius: 1 },
  markFlag: { position: 'absolute', width: 12, height: 8, left: '32%', top: '25%', backgroundColor: c.bgApp, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  header: { gap: 16, paddingBottom: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { borderRadius: rallyRadius.card, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface, padding: 20, gap: 18 },
  button: { minHeight: 52, borderRadius: rallyRadius.control, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  iconButton: { minWidth: 48, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface, alignItems: 'center', justifyContent: 'center' },
  chip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, flexShrink: 1 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#3A4035', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  field: { gap: 9 }, fieldLabel: { fontSize: 13, fontWeight: '600' },
  input: { minHeight: 56, borderWidth: 1, borderColor: c.borderInput, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: c.bgInput, color: c.textPrimary, fontSize: 16, lineHeight: 24 },
  loading: { paddingVertical: 48, alignItems: 'center', gap: 14 },
  error: { padding: 16, gap: 8, backgroundColor: '#30221F', borderRadius: 14, borderWidth: 1, borderColor: '#6D4841' },
  notice: { padding: 14, backgroundColor: c.bgElevated, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: c.actionPrimary },
  metric: { flex: 1, minWidth: 125, padding: 18, backgroundColor: c.bgSurface, borderRadius: 16, gap: 8 },
  cardTitleRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIndex: { width: 34, fontSize: 12, color: c.textMuted, fontVariant: ['tabular-nums'] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  cardAction: { minHeight: 44, paddingVertical: 9, paddingHorizontal: 14 },
  sheetRoot: { flex: 1, backgroundColor: c.bgApp },
  sheetScroll: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 20, alignItems: 'center' },
  sheetPanel: { width: '100%', maxWidth: 480, padding: 24, borderRadius: 28, backgroundColor: c.bgSurface, borderWidth: 1, borderColor: c.borderDefault, gap: 20 },
});
const typeStyles = StyleSheet.create({
  title: { fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -1.2 },
  heading: { fontSize: 21, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4 },
  cardTitle: { fontSize: 19, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 23 },
  supporting: { fontSize: 13, lineHeight: 21 },
  micro: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  code: { fontSize: 13, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  display: { fontSize: 38, lineHeight: 44, fontWeight: '500', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
});
const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: c.actionPrimary },
  secondary: { backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.borderDefault },
  danger: { backgroundColor: '#392723', borderWidth: 1, borderColor: '#87584E' },
  ghost: { backgroundColor: 'transparent' },
  success: { backgroundColor: c.statusSuccess },
});
