import Text from "./AppText";
import React, { useState, useEffect } from "react";
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  AccessibilityInfo,
  Platform,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../state";
import GuideIcon, { type GuideKind } from "./GuideIcon";
export const C = {
  blue: "#285CC4",
  navy: "#18243B",
  mint: "#EEF4FF",
  accent: "#CBD7F1",
  lavender: "#8D8CC2",
  ink: "#18243B",
  muted: "#56627A",
  sky: "#FFFFFF",
  white: "#FFFFFF",
  line: "#E9EDF4",
  control: "#7A89A0",
  red: "#B42335",
  green: "#167253",
  amber: "#8A5100",
};
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => listener.remove();
  }, []);
  return reduced;
}
function useControlFocus(color = C.blue, inset = false) {
  const [focused, setFocused] = useState(false);
  return {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      outlineColor: color,
      outlineStyle: "solid" as const,
      outlineWidth: focused ? 2 : 0,
      outlineOffset: inset ? -3 : 3,
    },
  };
}
export function FocusPressable({
  style,
  onFocus,
  onBlur,
  focusColor = C.blue,
  ...props
}: React.ComponentProps<typeof Pressable> & { focusColor?: string }) {
  const focus = useControlFocus(focusColor, true);
  return (
    <Pressable
      {...props}
      onFocus={(event) => {
        focus.onFocus();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focus.onBlur();
        onBlur?.(event);
      }}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        focus.style,
      ]}
    />
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  icon,
  highlight = false,
  light = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  highlight?: boolean;
  light?: boolean;
}) {
  const focus = useControlFocus(light ? C.accent : C.blue);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [
        s.button,
        focus.style,
        {
          backgroundColor: danger
            ? C.red
            : light
              ? C.white
              : highlight
                ? C.accent
                : secondary
                  ? C.white
                  : C.blue,
          borderWidth: secondary ? 1 : 0,
          borderColor: danger ? C.red : C.control,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={20}
          color={
            light || highlight
              ? C.navy
              : secondary && !danger
                ? C.blue
                : C.white
          }
        />
      )}
      <Text
        style={[
          s.buttonText,
          {
            color:
              light || highlight
                ? C.navy
                : secondary && !danger
                  ? C.blue
                  : C.white,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const eyeFocus = useControlFocus();
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ position: "relative" }}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          placeholderTextColor={C.muted}
          autoCorrect={
            props.keyboardType === "email-address" || props.secureTextEntry
              ? false
              : undefined
          }
          {...props}
          secureTextEntry={props.secureTextEntry && !visible}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            s.input,
            focused && { borderColor: C.blue, backgroundColor: "#EEF5FB" },
            props.multiline && { minHeight: 105, textAlignVertical: "top" },
            props.secureTextEntry && { paddingRight: 62 },
            error && { borderColor: C.red },
            props.style,
          ]}
        />
        {props.secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            onPress={() => setVisible(!visible)}
            onFocus={eyeFocus.onFocus}
            onBlur={eyeFocus.onBlur}
            style={{
              ...eyeFocus.style,
              position: "absolute",
              right: 0,
              top: 0,
              width: 52,
              minHeight: 50,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={C.blue}
            />
          </Pressable>
        )}
      </View>
      {!!(error || hint) && (
        <Text
          accessibilityLiveRegion="polite"
          style={[s.small, error ? { color: C.red } : null]}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function StepProgress({
  step,
  labels,
}: {
  step: number;
  labels: string[];
}) {
  const current = Math.max(0, Math.min(step, labels.length - 1));
  const kinds: Record<string, GuideKind> = {
    People: "people",
    Time: "time",
    Review: "review",
    Details: "details",
    Type: "type",
    Location: "location",
    "Campus details": "campus",
    Boundary: "boundary",
  };
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Setup progress"
      accessibilityValue={{
        min: 1,
        max: labels.length,
        now: current + 1,
        text: `Step ${current + 1} of ${labels.length}: ${labels[current]}`,
      }}
      aria-valuemin={1}
      aria-valuemax={labels.length}
      aria-valuenow={current + 1}
      aria-valuetext={`Step ${current + 1} of ${labels.length}: ${labels[current]}`}
      style={{ gap: 9 }}
    >
      <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
        {labels.map((label, index) => (
          <View key={label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            {index < labels.length - 1 && (
              <View
                aria-hidden
                style={{
                  position: "absolute",
                  top: 17,
                  left: "70%",
                  width: "60%",
                  height: 1,
                  backgroundColor: index < current ? C.blue : C.line,
                }}
              />
            )}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  index === current ? C.navy : index < current ? C.mint : C.sky,
              }}
            >
              {index < current ? (
                <Ionicons name="checkmark" size={23} color={C.blue} />
              ) : (
                <GuideIcon
                  kind={kinds[label] || "details"}
                  color={index === current ? C.white : C.muted}
                  size={22}
                />
              )}
            </View>
            <Text
              style={{
                fontSize: 12,
                color: index === current ? C.ink : C.muted,
                fontWeight: index === current ? "700" : "400",
                textAlign: "center",
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
export function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <Ionicons
        name={icon}
        size={23}
        color={C.blue}
        accessible={false}
        aria-hidden
      />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.small}>{label}</Text>
        <Text style={s.label}>{value}</Text>
      </View>
    </View>
  );
}
export function ChoiceRow({
  title,
  subtitle,
  checked,
  onPress,
  disabled = false,
  avatar,
}: {
  title: string;
  subtitle?: string;
  avatar?: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const focus = useControlFocus();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
      onPress={onPress}
      disabled={disabled}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => ({
        ...focus.style,
        minHeight: 64,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: checked ? C.blue : "#DCE4F0",
        backgroundColor: checked ? C.mint : C.white,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {!!avatar && (
        <View
          aria-hidden
          accessible={false}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: checked ? C.blue : "#EEF4FF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: checked ? C.white : C.blue,
            }}
          >
            {avatar}
          </Text>
        </View>
      )}
      {!avatar && (
        <Ionicons
          name={checked ? "checkbox" : "square-outline"}
          size={24}
          color={C.blue}
        />
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.label}>{title}</Text>
        {!!subtitle && <Text style={s.small}>{subtitle}</Text>}
      </View>
      {!!avatar && (
        <Ionicons
          name={checked ? "checkmark-circle" : "ellipse-outline"}
          size={25}
          color={checked ? C.blue : C.control}
        />
      )}
    </Pressable>
  );
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 8, marginBottom: 6 }}>
      <Text accessibilityRole="header" style={s.heading}>
        {title}
      </Text>
      {!!subtitle && <Text style={s.body}>{subtitle}</Text>}
    </View>
  );
}
export function Notice({
  message,
  error = false,
  onRetry,
  global = false,
}: {
  message: string;
  error?: boolean;
  onRetry?: () => void;
  global?: boolean;
}) {
  const app = useApp();
  if (!global && app?.connectionError === message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        s.notice,
        { backgroundColor: error ? "#FFF0F1" : C.sky, flexWrap: "wrap" },
      ]}
    >
      <Ionicons
        name={error ? "alert-circle-outline" : "information-circle-outline"}
        size={20}
        color={error ? C.red : C.blue}
      />
      <Text style={[s.body, { flex: 1, color: error ? C.red : C.ink }]}>
        {message}
      </Text>
      {onRetry && (
        <FocusPressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={{
            minHeight: 44,
            width: "100%",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <Text style={[s.label, { color: C.blue }]}>Try again</Text>
        </FocusPressable>
      )}
    </View>
  );
}
export function Chip({
  title,
  selected,
  onPress,
  disabled = false,
}: {
  title: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const focus = useControlFocus();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={title}
      accessibilityState={{
        selected,
        disabled: onPress ? disabled : undefined,
      }}
      {...(Platform.OS === "web" && onPress && selected !== undefined
        ? { "aria-pressed": selected }
        : {})}
      aria-disabled={onPress ? disabled : undefined}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      disabled={!onPress || disabled}
      style={[
        s.chip,
        focus.style,
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: selected ? C.blue : C.sky,
          borderWidth: 1,
          borderColor: selected ? C.blue : onPress ? C.control : "transparent",
          minHeight: onPress ? 44 : 30,
          paddingVertical: onPress ? 12 : 5,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {!!onPress && selected && (
        <Ionicons name="checkmark" size={17} color={C.white} />
      )}
      <Text
        style={{
          flexShrink: 1,
          fontSize: 14,
          fontWeight: "600",
          color: selected ? C.white : C.ink,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Pagination({
  page,
}: {
  page: {
    offset: number;
    pageSize: number;
    data: unknown[];
    loading: boolean;
    previous: () => void;
    next: () => void;
  };
}) {
  if (!page.offset && page.data.length < page.pageSize) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.small}>
        Page {Math.floor(page.offset / page.pageSize) + 1}
      </Text>
      <View style={s.row}>
        <Button
          secondary
          title="Previous page"
          disabled={page.loading || !page.offset}
          onPress={page.previous}
        />
        <Button
          secondary
          title="Next page"
          disabled={page.loading || page.data.length < page.pageSize}
          onPress={page.next}
        />
      </View>
    </View>
  );
}
export function Busy() {
  return (
    <ActivityIndicator
      accessibilityLabel="Loading"
      color={C.blue}
      style={{ padding: 16 }}
    />
  );
}
export function Disclosure({
  title,
  children,
  initiallyOpen = false,
  compact = false,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
  compact?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const focus = useControlFocus();
  return (
    <View style={{ gap: 14 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        style={({ pressed }) => ({
          ...focus.style,
          minHeight: compact ? 44 : 56,
          paddingVertical: compact ? 10 : 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          opacity: pressed ? 0.6 : 1,
          backgroundColor: compact ? "transparent" : "#F5F7FB",
          borderRadius: 12,
          paddingHorizontal: compact ? 0 : 18,
          borderWidth: 0,
          borderColor: C.line,
        })}
      >
        {!!icon && (
          <Ionicons
            name={icon}
            size={21}
            color={C.blue}
            accessible={false}
            aria-hidden
          />
        )}
        <Text
          style={[
            s.label,
            {
              flex: 1,
              fontSize: compact ? 14 : 16,
              color: compact ? C.blue : C.ink,
            },
          ]}
        >
          {title}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={C.blue}
        />
      </Pressable>
      {open ? children : null}
    </View>
  );
}
export function ActionRow({
  title,
  subtitle,
  icon,
  onPress,
  last = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  last?: boolean;
}) {
  const focus = useControlFocus(C.blue, true);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => ({
        ...focus.style,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 18,
        paddingHorizontal: 18,
        backgroundColor: pressed ? "#EAF0F2" : "transparent",
        borderBottomWidth: last ? 0 : 1,
        borderColor: C.line,
      })}
    >
      <View
        style={{
          width: 36,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={24} color={C.blue} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.label}>{title}</Text>
        <Text style={s.small}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.muted} />
    </Pressable>
  );
}
export const s = StyleSheet.create({
  page: { gap: 18, padding: 20, paddingBottom: 36 },
  heading: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.3,
  },
  subheading: { fontSize: 20, fontWeight: "700", color: C.ink },
  body: { fontSize: 16, lineHeight: 25, color: C.muted },
  small: { fontSize: 14, lineHeight: 21, color: C.muted },
  label: { fontSize: 16, fontWeight: "600", color: C.ink },
  input: {
    fontFamily: "Manrope_400Regular",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.control,
    borderRadius: 14,
    padding: 14,
    minHeight: 50,
    fontSize: 16,
    color: C.ink,
  },
  button: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 9,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#F5F7FB",
    borderWidth: 0,
    borderColor: C.line,
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  notice: {
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 14,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 9, alignItems: "center" },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 5 },
});
