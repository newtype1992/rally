import { Link, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
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

import { rallyColors, rallyLayout, rallyRadius, rallySpacing } from '@/constants/rally';
import { formatPercent } from '@/lib/date';
import type { HabitSummary } from '@/types/rally';

type TextVariant = 'title' | 'heading' | 'cardTitle' | 'body' | 'supporting' | 'micro' | 'code';
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ChipTone = 'neutral' | 'success' | 'danger' | 'primary';
type RallyIconName = 'add' | 'chevron-back' | 'close';
type RallyHref = ComponentProps<typeof Link>['href'];
type RallyIconButtonAppearance = 'framed' | 'quiet';

type RallyHeaderAction = {
  icon: Extract<RallyIconName, 'add' | 'close'>;
  accessibilityLabel: string;
  href?: RallyHref;
  onPress?: PressableProps['onPress'];
  testID?: string;
  tone?: 'default' | 'primary' | 'muted';
  appearance?: RallyIconButtonAppearance;
};

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
        { color: color ?? (variant === 'supporting' || variant === 'micro' ? rallyColors.textSecondary : rallyColors.textPrimary) },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function RallyScreen({
  title,
  subtitle,
  backHref,
  onBack,
  rightAction,
  children,
  footer,
  scroll = true,
  contentStyle,
}: {
  title?: string;
  subtitle?: string;
  backHref?: RallyHref;
  onBack?: PressableProps['onPress'];
  rightAction?: RallyHeaderAction;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomPadding = footer ? rallySpacing.xl + 116 : rallySpacing.xl + insets.bottom;
  const hasNavigationControls = Boolean(backHref || onBack || rightAction);
  const handleBack =
    onBack ??
    (backHref
      ? () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(backHref);
          }
        }
      : undefined);
  const header = title || subtitle || hasNavigationControls ? (
    <View style={styles.screenHeader}>
      {handleBack ? (
        <View style={styles.headerControlRow}>
          <RallyIconButton
            icon="chevron-back"
            accessibilityLabel="Back"
            onPress={handleBack}
            appearance="quiet"
            tone="muted"
          />
          {rightAction ? (
            <RallyIconButton
              icon={rightAction.icon}
              accessibilityLabel={rightAction.accessibilityLabel}
              href={rightAction.href}
              onPress={rightAction.onPress}
              testID={rightAction.testID}
              tone={rightAction.tone}
              appearance={rightAction.appearance ?? 'quiet'}
            />
          ) : null}
        </View>
      ) : null}
      {title || subtitle ? (
        <View style={styles.screenHeaderRow}>
        <View style={styles.headerTitleGroup}>
          {title ? (
            <RallyText variant="title" style={styles.headerTitle}>
              {title}
            </RallyText>
          ) : null}
          {subtitle ? (
            <RallyText variant="supporting" style={styles.headerSubtitle}>
              {subtitle}
            </RallyText>
          ) : null}
        </View>
        {!handleBack && rightAction ? (
            <RallyIconButton
              icon={rightAction.icon}
              accessibilityLabel={rightAction.accessibilityLabel}
              href={rightAction.href}
              onPress={rightAction.onPress}
              testID={rightAction.testID}
              tone={rightAction.tone}
              appearance={rightAction.appearance ?? 'quiet'}
            />
          ) : null}
        </View>
      ) : null}
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
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
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

export function RallyCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function RallyButton({
  children,
  variant = 'primary',
  disabled,
  loading,
  onPress,
  href,
  accessibilityLabel,
  testID,
  style,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: PressableProps['onPress'];
  href?: ComponentProps<typeof Link>['href'];
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        buttonVariantStyles[variant],
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading ? styles.pressed : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? rallyColors.bgApp : rallyColors.actionPrimary} />
      ) : (
        <RallyText selectable={false} variant="body" color={buttonTextColor(variant)} style={styles.buttonText}>
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

export function RallyIconButton({
  icon,
  accessibilityLabel,
  href,
  onPress,
  testID,
  tone = 'default',
  appearance = 'framed',
}: {
  icon: RallyIconName;
  accessibilityLabel: string;
  href?: RallyHref;
  onPress?: PressableProps['onPress'];
  testID?: string;
  tone?: 'default' | 'primary' | 'muted';
  appearance?: RallyIconButtonAppearance;
}) {
  const iconColor =
    tone === 'primary'
      ? rallyColors.actionPrimary
      : tone === 'muted'
        ? rallyColors.textSecondary
        : rallyColors.textPrimary;
  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      hitSlop={rallySpacing.xs}
      style={({ pressed }) => [styles.iconButton, appearance === 'quiet' ? styles.iconButtonQuiet : null, pressed ? styles.pressed : null]}>
      <RallyText
        selectable={false}
        color={iconColor}
        style={[styles.iconButtonText, icon === 'chevron-back' ? styles.backIconText : null]}>
        {iconGlyph(icon)}
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

function iconGlyph(icon: RallyIconName) {
  if (icon === 'chevron-back') {
    return '\u2039';
  }
  if (icon === 'close') {
    return '\u00d7';
  }
  return '+';
}

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  return (
    <View style={[styles.chip, chipToneStyles[tone]]}>
      <RallyText selectable={false} variant="micro" color={chipTextColor(tone)}>
        {label}
      </RallyText>
    </View>
  );
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: ChipTone }) {
  return (
    <View accessibilityLabel={`Progress ${formatPercent(value)}`} accessibilityRole="progressbar" style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: tone === 'success' ? rallyColors.statusSuccess : rallyColors.actionPrimary,
          },
        ]}
      />
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'none',
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  testID?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <RallyText variant="micro">{label}</RallyText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={rallyColors.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        testID={testID}
        style={styles.input}
      />
      {error ? (
        <RallyText selectable variant="supporting" color={rallyColors.statusDanger}>
          {error}
        </RallyText>
      ) : helper ? (
        <RallyText variant="supporting">{helper}</RallyText>
      ) : null}
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
    <RallyCard style={tone === 'danger' ? styles.dangerPanel : null}>
      <Chip label={tone === 'danger' ? 'Needs attention' : 'Rally'} tone={tone} />
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

export function LoadingState({ label = 'Loading habits...' }: { label?: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color={rallyColors.actionPrimary} />
      <RallyText variant="supporting">{label}</RallyText>
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: PressableProps['onPress'];
}) {
  return <StatePanel title={title} message={message} tone="danger" actionLabel={onRetry ? 'Try again' : undefined} onAction={onRetry} />;
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

export function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <RallyText variant="micro">{label}</RallyText>
      <RallyText variant="cardTitle" color={rallyColors.actionPrimary}>
        {value}
      </RallyText>
    </View>
  );
}

export function HabitCard({
  habit,
  onMarkDone,
  onUndo,
  onOpen,
  busy,
}: {
  habit: HabitSummary;
  onMarkDone?: () => void;
  onUndo?: () => void;
  onOpen?: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [pressed ? styles.pressed : null]}>
      <RallyCard>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <RallyText variant="cardTitle">{habit.name}</RallyText>
            <RallyText variant="supporting">
              {habit.completed_this_week} / {habit.weekly_target} this week
            </RallyText>
          </View>
          <RallyText variant="code" color={rallyColors.actionPrimary}>
            {Math.round(habit.progress_percentage)}%
          </RallyText>
        </View>
        <ProgressBar value={habit.progress_percentage} tone={habit.done_today ? 'success' : 'primary'} />
        <View style={styles.cardActions}>
          {habit.done_today ? (
            <>
              <Chip label="Done today" tone="success" />
              <RallyButton variant="secondary" loading={busy} onPress={onUndo}>
                Undo
              </RallyButton>
            </>
          ) : (
            <RallyButton loading={busy} onPress={onMarkDone}>
              Mark done
            </RallyButton>
          )}
        </View>
      </RallyCard>
    </Pressable>
  );
}

export function RallySheetScreen({
  backgroundTitle,
  sheetTitle,
  onClose,
  children,
}: {
  backgroundTitle: string;
  sheetTitle: string;
  onClose?: PressableProps['onPress'];
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.sheetScreenRoot}>
      <View style={[styles.sheetGhostContent, { paddingTop: rallySpacing.lg + insets.top }]}>
        <RallyText variant="title" style={styles.sheetGhostText}>
          {backgroundTitle}
        </RallyText>
      </View>
      <View style={styles.sheetScrim} />
      <View style={[styles.sheetPanel, { paddingBottom: Math.max(insets.bottom, rallySpacing.sm) }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeaderRow}>
          <RallyText variant="heading" style={styles.sheetTitle}>
            {sheetTitle}
          </RallyText>
          {onClose ? (
            <RallyIconButton
              icon="close"
              accessibilityLabel="Close"
              onPress={onClose}
              appearance="quiet"
              tone="muted"
            />
          ) : null}
        </View>
        <View style={styles.sheetBody}>{children}</View>
      </View>
    </View>
  );
}

function buttonTextColor(variant: ButtonVariant) {
  if (variant === 'primary' || variant === 'success') {
    return rallyColors.bgApp;
  }
  if (variant === 'danger') {
    return rallyColors.statusDanger;
  }
  if (variant === 'ghost') {
    return rallyColors.textSecondary;
  }
  return rallyColors.textPrimary;
}

function chipTextColor(tone: ChipTone) {
  if (tone === 'success') {
    return rallyColors.statusSuccess;
  }
  if (tone === 'danger') {
    return rallyColors.statusDanger;
  }
  if (tone === 'primary') {
    return rallyColors.actionPrimary;
  }
  return rallyColors.textSecondary;
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
    paddingHorizontal: 28,
  },
  screenStatic: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  screenContent: {
    width: '100%',
    maxWidth: 420,
    gap: rallySpacing.md,
  },
  screenHeader: {
    gap: rallySpacing.xs,
    paddingBottom: rallySpacing.sm,
  },
  screenHeaderRow: {
    minHeight: rallyLayout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rallySpacing.xs,
  },
  headerControlRow: {
    minHeight: rallyLayout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flex: 1,
    alignItems: 'flex-start',
    gap: rallySpacing.xxs,
  },
  headerTitle: {
    textAlign: 'left',
  },
  headerSubtitle: {
    textAlign: 'left',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: rallySpacing.md,
    backgroundColor: rallyColors.bgApp,
    borderTopColor: rallyColors.borderDefault,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerActions: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: rallySpacing.xs,
  },
  card: {
    gap: rallySpacing.sm,
    borderRadius: rallyRadius.card,
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    backgroundColor: rallyColors.bgSurface,
    padding: rallySpacing.md,
  },
  button: {
    minHeight: 48,
    borderRadius: rallyRadius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rallySpacing.md,
    paddingVertical: 13,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  iconButton: {
    width: rallyLayout.minTouchTarget,
    height: rallyLayout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rallyRadius.control,
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    backgroundColor: rallyColors.bgSurface,
  },
  iconButtonText: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconButtonQuiet: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  backIconText: {
    fontSize: 32,
    lineHeight: 38,
  },
  pressed: {
    opacity: 0.72,
  },
  chip: {
    minHeight: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: rallySpacing.xxs,
    borderWidth: 1,
    alignSelf: 'flex-start',
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
    minHeight: 48,
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    borderRadius: rallyRadius.control,
    backgroundColor: rallyColors.bgInput,
    color: rallyColors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: rallySpacing.xs,
    fontSize: 15,
    lineHeight: 21,
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
    minWidth: 132,
    gap: rallySpacing.xxs,
    padding: rallySpacing.md,
    borderRadius: rallyRadius.card,
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
  cardActions: {
    gap: rallySpacing.xs,
  },
  sheetScreenRoot: {
    flex: 1,
    backgroundColor: rallyColors.bgApp,
  },
  sheetGhostContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    opacity: 0.36,
  },
  sheetGhostText: {
    width: '100%',
    maxWidth: rallyLayout.maxWidth,
  },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: rallyColors.scrim,
  },
  sheetPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: rallySpacing.sm,
    borderTopLeftRadius: rallyRadius.sheet,
    borderTopRightRadius: rallyRadius.sheet,
    borderWidth: 1,
    borderColor: rallyColors.borderDefault,
    backgroundColor: rallyColors.bgElevated,
    paddingHorizontal: 28,
    paddingTop: 14,
  },
  sheetHandle: {
    width: 52,
    height: 4,
    borderRadius: 999,
    backgroundColor: rallyColors.textMuted,
  },
  sheetHeaderRow: {
    minHeight: rallyLayout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rallySpacing.sm,
  },
  sheetTitle: {
    flex: 1,
  },
  sheetBody: {
    gap: rallySpacing.xs,
  },
});

const textVariantStyles = StyleSheet.create({
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  supporting: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  code: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
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
    borderColor: rallyColors.borderDefault,
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
  success: {
    backgroundColor: rallyColors.statusSuccess,
  },
});

const chipToneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: rallyColors.bgInput,
    borderColor: rallyColors.borderDefault,
  },
  success: {
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
    borderColor: rallyColors.statusSuccess,
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: rallyColors.statusDanger,
  },
  primary: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: rallyColors.actionPrimary,
  },
});
