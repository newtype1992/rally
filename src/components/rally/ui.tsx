import { Link } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rallyColors, rallyLayout, rallyRadius, rallySpacing, weekdayOptions } from '@/constants/rally';
import { displayWeekdays, formatPercent } from '@/lib/date';
import type { DailyHabitRow, PendingCheckin, Weekday } from '@/types/rally';

type TextVariant = 'title' | 'heading' | 'cardTitle' | 'body' | 'supporting' | 'micro' | 'code';

export function RallyText({
  variant = 'body',
  color,
  selectable,
  style,
  children,
}: {
  variant?: TextVariant;
  color?: string;
  selectable?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  return (
    <Text
      selectable={selectable}
      style={[
        styles.textBase,
        textVariantStyles[variant],
        { color: color ?? defaultTextColor(variant) },
        style,
      ]}>
      {children}
    </Text>
  );
}

function defaultTextColor(variant: TextVariant) {
  if (variant === 'supporting' || variant === 'micro') {
    return rallyColors.textSecondary;
  }
  return rallyColors.textPrimary;
}

export function RallyScreen({
  title,
  subtitle,
  children,
  footer,
  scroll = true,
  contentStyle,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = footer ? rallySpacing.xl + 96 : rallySpacing.xl + insets.bottom;
  const header =
    title || subtitle ? (
      <View style={styles.screenHeader}>
        {title ? <RallyText variant="title">{title}</RallyText> : null}
        {subtitle ? <RallyText variant="supporting">{subtitle}</RallyText> : null}
      </View>
    ) : null;
  const content = (
    <View style={[styles.screenContent, contentStyle]}>
      {header}
      {children}
    </View>
  );

  return (
    <View style={styles.screenRoot}>
      {scroll ? (
        <ScrollView
          style={styles.screenScroll}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.screenScrollContent,
            { paddingTop: rallySpacing.lg + insets.top, paddingBottom: bottomPadding },
          ]}>
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.screenStatic, { paddingTop: insets.top, paddingBottom: bottomPadding }]}>
          {content}
        </View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, rallySpacing.md) }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function RallyCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'social' | 'danger' | 'ghost';

export function RallyButton({
  children,
  variant = 'primary',
  disabled,
  loading,
  onPress,
  href,
  accessibilityLabel,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: PressableProps['onPress'];
  href?: ComponentProps<typeof Link>['href'];
  accessibilityLabel?: string;
}) {
  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonVariantStyles[variant],
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading ? styles.pressed : null,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? rallyColors.bgApp : rallyColors.actionPrimary} />
      ) : (
        <RallyText
          selectable={false}
          variant="body"
          color={variant === 'primary' || variant === 'social' ? rallyColors.bgApp : rallyColors.textPrimary}
          style={styles.buttonText}>
          {children}
        </RallyText>
      )}
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        {button}
      </Link>
    );
  }
  return button;
}

export function IconButton({
  label,
  icon,
  onPress,
  href,
}: {
  label: string;
  icon: string;
  onPress?: PressableProps['onPress'];
  href?: ComponentProps<typeof Link>['href'];
}) {
  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
      <RallyText selectable={false} variant="heading" style={styles.iconButtonText}>
        {icon}
      </RallyText>
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        {button}
      </Link>
    );
  }
  return button;
}

type ChipTone = 'neutral' | 'private' | 'shared' | 'success' | 'warning' | 'danger' | 'primary';

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  return (
    <View style={[styles.chip, chipToneStyles[tone]]}>
      <RallyText selectable={false} variant="micro" color={chipTextColor(tone)}>
        {label}
      </RallyText>
    </View>
  );
}

function chipTextColor(tone: ChipTone) {
  if (tone === 'primary') {
    return rallyColors.bgApp;
  }
  return rallyColors.textPrimary;
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: ChipTone }) {
  return (
    <View
      accessibilityLabel={`Progress ${formatPercent(value)}`}
      accessibilityRole="progressbar"
      style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: progressColor(tone),
          },
        ]}
      />
    </View>
  );
}

function progressColor(tone: ChipTone) {
  switch (tone) {
    case 'shared':
      return rallyColors.socialShared;
    case 'success':
      return rallyColors.statusSuccess;
    case 'warning':
      return rallyColors.statusWarning;
    case 'danger':
      return rallyColors.statusDanger;
    default:
      return rallyColors.actionPrimary;
  }
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.fieldGroup}>
      <RallyText variant="micro" color={rallyColors.textSecondary}>
        {label}
      </RallyText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={rallyColors.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
      {error ? (
        <RallyText selectable variant="supporting" color={rallyColors.statusDanger}>
          {error}
        </RallyText>
      ) : null}
    </View>
  );
}

export function SwitchRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchCopy}>
        <RallyText variant="cardTitle">{title}</RallyText>
        {description ? <RallyText variant="supporting">{description}</RallyText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: rallyColors.actionPrimary, false: rallyColors.bgInput }}
        thumbColor={value ? rallyColors.bgApp : rallyColors.textMuted}
      />
    </View>
  );
}

export function WeekdaySelector({
  selected,
  onChange,
}: {
  selected: Weekday[];
  onChange: (selected: Weekday[]) => void;
}) {
  const toggle = (weekday: Weekday) => {
    const exists = selected.includes(weekday);
    const next = exists ? selected.filter((day) => day !== weekday) : [...selected, weekday];
    if (next.length === 0) {
      return;
    }
    onChange(next.sort((a, b) => a - b));
  };

  return (
    <View style={styles.weekdayRow}>
      {weekdayOptions.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={option.longLabel}
            onPress={() => toggle(option.value)}
            style={({ pressed }) => [
              styles.weekdayButton,
              active ? styles.weekdayButtonActive : null,
              pressed ? styles.pressed : null,
            ]}>
            <RallyText
              selectable={false}
              variant="body"
              color={active ? rallyColors.bgApp : rallyColors.textPrimary}
              style={styles.weekdayText}>
              {option.label}
            </RallyText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatePanel({
  title,
  message,
  tone = 'neutral',
  actionLabel,
  onAction,
  href,
}: {
  title: string;
  message: string;
  tone?: ChipTone;
  actionLabel?: string;
  onAction?: PressableProps['onPress'];
  href?: ComponentProps<typeof Link>['href'];
}) {
  return (
    <RallyCard style={[styles.statePanel, tone === 'danger' ? styles.dangerPanel : null]}>
      <Chip label={tone === 'danger' ? 'Needs attention' : 'State'} tone={tone} />
      <RallyText variant="heading">{title}</RallyText>
      <RallyText variant="supporting">{message}</RallyText>
      {actionLabel ? (
        <RallyButton variant={tone === 'danger' ? 'danger' : 'secondary'} onPress={onAction} href={href}>
          {actionLabel}
        </RallyButton>
      ) : null}
    </RallyCard>
  );
}

export function BackendGapState({ rpcName }: { rpcName: string }) {
  return (
    <StatePanel
      tone="warning"
      title="Backend follow-up needed"
      message={`${rpcName} is wired from the app, but the local Supabase RPC is still reserved for the next backend pass.`}
    />
  );
}

export function LoadingState({ label = 'Loading Rally' }: { label?: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color={rallyColors.actionPrimary} />
      <RallyText variant="supporting">{label}</RallyText>
    </View>
  );
}

export function ErrorState({
  title = 'Something did not load',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: PressableProps['onPress'];
}) {
  return (
    <StatePanel
      title={title}
      message={message}
      tone="danger"
      actionLabel={onRetry ? 'Retry' : undefined}
      onAction={onRetry}
    />
  );
}

export function FooterActions({ children }: { children: ReactNode }) {
  return <View style={styles.footerActions}>{children}</View>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <RallyText variant="heading">{title}</RallyText>
      {children}
    </View>
  );
}

export function MetricCell({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: ChipTone;
}) {
  return (
    <View style={styles.metricCell}>
      <RallyText variant="heading" color={progressColor(tone)}>
        {value}
      </RallyText>
      <RallyText variant="micro">{label}</RallyText>
    </View>
  );
}

export function HabitCard({
  row,
  pendingCheckin,
  onCheckIn,
  onSkip,
  onShare,
  onSettings,
  onOpenShared,
}: {
  row: DailyHabitRow;
  pendingCheckin?: PendingCheckin;
  onCheckIn?: () => void;
  onSkip?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
  onOpenShared?: () => void;
}) {
  const isShared = row.habit.privacy === 'shared';
  const progress = row.week_progress.capped_percentage;
  const tone =
    row.today.state === 'missed'
      ? 'danger'
      : row.week_progress.pace_state === 'behind_pace'
        ? 'warning'
        : row.week_progress.pace_state === 'complete' || row.today.state === 'completed'
          ? 'success'
          : 'primary';

  return (
    <RallyCard>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <RallyText variant="cardTitle">{row.habit.name}</RallyText>
          <RallyText variant="supporting">
            {displayWeekdays(row.membership.planned_weekdays)} target
          </RallyText>
        </View>
        <View style={styles.inlineChips}>
          <Chip label={isShared ? 'Shared' : 'Private'} tone={isShared ? 'shared' : 'private'} />
          {pendingCheckin ? <Chip label="Pending sync" tone="warning" /> : null}
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressLabelRow}>
          <RallyText variant="supporting">
            {row.week_progress.completed_count} of {row.week_progress.weekly_target} this week
          </RallyText>
          <RallyText variant="supporting">{formatPercent(progress)}</RallyText>
        </View>
        <ProgressBar value={progress} tone={tone} />
      </View>

      <View style={styles.inlineChips}>
        <Chip label={stateLabel(pendingCheckin ? 'pending_sync' : row.today.state)} tone={tone} />
        {row.membership.pending_effective_week_start ? <Chip label="Change scheduled" tone="warning" /> : null}
      </View>

      {row.shared_signal ? (
        <RallyText variant="supporting">
          {row.shared_signal.peer_completed_today_count} friends checked in today
        </RallyText>
      ) : null}

      <View style={styles.cardActions}>
        {row.today.can_record_checkin && !pendingCheckin ? (
          <>
            <RallyButton variant="primary" onPress={onCheckIn}>
              Check in
            </RallyButton>
            <RallyButton variant="secondary" onPress={onSkip}>
              Skip today
            </RallyButton>
          </>
        ) : null}
        {isShared && onOpenShared ? (
          <RallyButton variant="social" onPress={onOpenShared}>
            Open shared habit
          </RallyButton>
        ) : null}
        {!isShared && onShare ? (
          <RallyButton variant="secondary" onPress={onShare}>
            Share habit
          </RallyButton>
        ) : null}
        {onSettings ? (
          <RallyButton variant="ghost" onPress={onSettings}>
            Settings
          </RallyButton>
        ) : null}
      </View>
    </RallyCard>
  );
}

function stateLabel(state: DailyHabitRow['today']['state'] | 'pending_sync') {
  switch (state) {
    case 'completed':
      return 'Completed';
    case 'skipped':
      return 'Skipped';
    case 'missed':
      return 'Missed';
    case 'due':
      return 'Due today';
    case 'pending_sync':
      return 'Pending sync';
    default:
      return 'Upcoming';
  }
}

const styles = StyleSheet.create({
  textBase: {
    letterSpacing: 0,
  },
  screenRoot: {
    flex: 1,
    backgroundColor: rallyColors.bgApp,
  },
  screenScroll: {
    flex: 1,
  },
  screenScrollContent: {
    alignItems: 'center',
    paddingHorizontal: rallySpacing.lg,
  },
  screenStatic: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: rallySpacing.lg,
  },
  screenContent: {
    width: '100%',
    maxWidth: rallyLayout.maxWidth,
    gap: rallySpacing.md,
  },
  screenHeader: {
    gap: rallySpacing.xs,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: rallySpacing.lg,
    paddingTop: rallySpacing.md,
    backgroundColor: rallyColors.bgApp,
    borderTopColor: rallyColors.borderDefault,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerActions: {
    width: '100%',
    maxWidth: rallyLayout.maxWidth,
    alignSelf: 'center',
    gap: rallySpacing.xs,
  },
  card: {
    gap: rallySpacing.md,
    borderRadius: rallyRadius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    backgroundColor: rallyColors.bgSurface,
    padding: rallySpacing.md,
  },
  button: {
    minHeight: rallyLayout.minTouchTarget,
    borderRadius: rallyRadius.control,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rallySpacing.md,
    paddingVertical: rallySpacing.xs,
  },
  buttonText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.72,
  },
  iconButton: {
    width: rallyLayout.minTouchTarget,
    height: rallyLayout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rallyRadius.control,
    borderCurve: 'continuous',
    backgroundColor: rallyColors.bgInput,
  },
  iconButtonText: {
    lineHeight: 22,
  },
  chip: {
    minHeight: 28,
    borderRadius: rallyRadius.control,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rallySpacing.sm,
    paddingVertical: rallySpacing.xxs,
    borderWidth: 1,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: rallyColors.bgInput,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  fieldGroup: {
    gap: rallySpacing.xs,
  },
  input: {
    minHeight: rallyLayout.minTouchTarget,
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    borderRadius: rallyRadius.control,
    borderCurve: 'continuous',
    backgroundColor: rallyColors.bgInput,
    color: rallyColors.textPrimary,
    paddingHorizontal: rallySpacing.md,
    paddingVertical: rallySpacing.xs,
    fontSize: 16,
  },
  switchRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rallySpacing.md,
    padding: rallySpacing.md,
    borderRadius: rallyRadius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    backgroundColor: rallyColors.bgSurface,
  },
  switchCopy: {
    flex: 1,
    gap: rallySpacing.xxs,
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rallySpacing.xs,
  },
  weekdayButton: {
    width: rallyLayout.minTouchTarget,
    height: rallyLayout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rallyRadius.control,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    backgroundColor: rallyColors.bgInput,
  },
  weekdayButtonActive: {
    backgroundColor: rallyColors.actionPrimary,
    borderColor: rallyColors.actionPrimary,
  },
  weekdayText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  statePanel: {
    alignItems: 'flex-start',
  },
  dangerPanel: {
    borderColor: rallyColors.statusDanger,
  },
  loadingState: {
    gap: rallySpacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rallySpacing.xxl,
  },
  section: {
    gap: rallySpacing.sm,
  },
  metricCell: {
    flex: 1,
    minWidth: 96,
    gap: rallySpacing.xxs,
    padding: rallySpacing.md,
    borderRadius: rallyRadius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    backgroundColor: rallyColors.bgInput,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: rallySpacing.md,
  },
  cardTitleGroup: {
    flex: 1,
    gap: rallySpacing.xxs,
  },
  inlineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: rallySpacing.xs,
  },
  progressBlock: {
    gap: rallySpacing.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rallySpacing.md,
  },
  cardActions: {
    gap: rallySpacing.xs,
  },
});

const textVariantStyles = StyleSheet.create({
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  supporting: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

const buttonVariantStyles = StyleSheet.create({
  primary: {
    backgroundColor: rallyColors.actionPrimary,
  },
  secondary: {
    backgroundColor: rallyColors.bgInput,
    borderWidth: 1,
    borderColor: rallyColors.actionPrimary,
  },
  social: {
    backgroundColor: rallyColors.socialShared,
  },
  danger: {
    backgroundColor: rallyColors.bgInput,
    borderWidth: 1,
    borderColor: rallyColors.statusDanger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
  },
});

const chipToneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: rallyColors.bgInput,
    borderColor: rallyColors.borderDefault,
  },
  private: {
    backgroundColor: 'rgba(41, 242, 198, 0.12)',
    borderColor: rallyColors.statusPrivate,
  },
  shared: {
    backgroundColor: 'rgba(255, 61, 242, 0.12)',
    borderColor: rallyColors.socialShared,
  },
  success: {
    backgroundColor: 'rgba(167, 255, 63, 0.12)',
    borderColor: rallyColors.statusSuccess,
  },
  warning: {
    backgroundColor: 'rgba(255, 176, 0, 0.12)',
    borderColor: rallyColors.statusWarning,
  },
  danger: {
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
    borderColor: rallyColors.statusDanger,
  },
  primary: {
    backgroundColor: rallyColors.actionPrimary,
    borderColor: rallyColors.actionPrimary,
  },
});
