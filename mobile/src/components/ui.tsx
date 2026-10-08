import Text from "./AppText";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useApp } from "../state";
import GuideIcon, { type GuideKind } from "./GuideIcon";
import { SpringPressable, useReducedMotion } from "./motion";
export const C = {
  blue: "#1F58C7",
  blueDark: "#173F94",
  navy: "#0F1E3A",
  mint: "#EAF1FD",
  accent: "#C8D9F6",
  lavender: "#8D8CC2",
  ink: "#0F1E3A",
  muted: "#53607A",
  sky: "#FFFFFF",
  white: "#FFFFFF",
  bg: "#F4F6FA",
  line: "#E1E7F0",
  control: "#7D8BA3",
  red: "#B42335",
  green: "#167253",
  amber: "#8A5100",
};
export { useReducedMotion, SpringPressable, Reveal, Pulse } from "./motion";
// Focus rings should follow keyboard users, not mouse or touch taps on web.
let keyboardMode = false;
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.addEventListener("keydown", () => (keyboardMode = true), true);
  document.addEventListener("pointerdown", () => (keyboardMode = false), true);
}
function useControlFocus(color = C.blue, inset = false) {
  const [focused, setFocused] = useState(false);
  return {
    onFocus: () => setFocused(Platform.OS !== "web" || keyboardMode),
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
}: React.ComponentProps<typeof Pressable> & {
  focusColor?: string;
  pressScale?: number;
}) {
  const focus = useControlFocus(focusColor, true);
  return (
    <SpringPressable
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
    <SpringPressable
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
                  ? pressed
                    ? C.accent
                    : C.mint
                  : pressed
                    ? C.blueDark
                    : C.blue,
          borderWidth: 0,
          opacity: disabled ? 0.45 : 1,
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
    </SpringPressable>
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
      <Text style={[s.label, { fontSize: 14 }]}>{label}</Text>
      <View style={{ position: "relative" }}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          placeholderTextColor="#7D8BA3"
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
            focused && {
              borderColor: C.blue,
              borderWidth: 2,
              paddingHorizontal: 13,
              paddingVertical: 12,
            },
            props.multiline && { minHeight: 105, textAlignVertical: "top" },
            props.secureTextEntry && { paddingRight: 62 },
            error && { borderColor: C.red },
            props.style,
          ]}
        />
        {props.secureTextEntry && (
          <SpringPressable
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
          </SpringPressable>
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
                  index === current ? C.blue : index < current ? C.mint : C.white,
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <IconTile name={icon} size={36} />
      <View style={{ flex: 1, gap: 1 }}>
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
    <SpringPressable
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
        borderRadius: 14,
        borderWidth: checked ? 2 : 1,
        borderColor: checked ? C.blue : C.line,
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
    </SpringPressable>
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
        {
          backgroundColor: error ? "#FDECEE" : C.mint,
          flexWrap: "wrap",
        },
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
    <SpringPressable
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
          backgroundColor: selected ? C.blue : onPress ? C.white : C.mint,
          borderWidth: 1,
          borderColor: selected ? C.blue : onPress ? "#C5CEDD" : "transparent",
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
    </SpringPressable>
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
  danger = false,
}: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
  compact?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  danger?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const focus = useControlFocus();
  return (
    <View style={{ gap: 14 }}>
      <SpringPressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        style={({ pressed }) => ({
          ...focus.style,
          minHeight: compact ? 44 : 60,
          paddingVertical: compact ? 6 : 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          opacity: pressed ? 0.6 : 1,
          backgroundColor: compact ? "transparent" : C.white,
          borderRadius: 12,
          paddingHorizontal: compact ? 0 : 16,
          borderWidth: compact ? 0 : 1,
          borderColor: C.line,
        })}
      >
        {!!icon &&
          (compact ? (
            <Ionicons
              name={icon}
              size={21}
              color={C.blue}
              accessible={false}
              aria-hidden
            />
          ) : (
            <IconTile name={icon} tone={danger ? "red" : "blue"} />
          ))}
        <Text
          style={[
            s.label,
            {
              flex: 1,
              fontSize: compact ? 14 : 15,
              color: compact ? C.blue : danger ? C.red : C.ink,
            },
          ]}
        >
          {title}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={compact ? C.blue : C.muted}
        />
      </SpringPressable>
      {open ? children : null}
    </View>
  );
}
export function ListGroup({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}
// One row in a ListGroup: icon tile, title, optional detail, trailing chevron.
export function ActionRow({
  title,
  subtitle,
  icon,
  onPress,
  last = false,
  danger = false,
  selected,
  trailing,
  external = false,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  last?: boolean;
  danger?: boolean;
  selected?: boolean;
  trailing?: React.ReactNode;
  external?: boolean;
  disabled?: boolean;
}) {
  const focus = useControlFocus(C.blue, true);
  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      pressScale={0.99}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => ({
        ...focus.style,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 64,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: pressed ? C.mint : C.white,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <IconTile name={icon} tone={danger ? "red" : "blue"} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[s.label, danger && { color: C.red }]}>{title}</Text>
        {!!subtitle && <Text style={s.small}>{subtitle}</Text>}
      </View>
      {trailing ?? (
        <Ionicons
          name={external ? "open-outline" : "chevron-forward"}
          size={external ? 18 : 20}
          color={C.muted}
        />
      )}
    </SpringPressable>
  );
}
export function Brand({
  size = 32,
  plain = false,
}: {
  size?: number;
  plain?: boolean;
}) {
  if (plain)
    return (
      <Ionicons
        name="shield-checkmark"
        size={size}
        color={C.blue}
        accessible={false}
        aria-hidden
      />
    );
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: Math.round(size * 1.1),
        borderRadius: 14,
        backgroundColor: C.blue,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name="shield-checkmark"
        size={Math.round(size * 0.6)}
        color={C.mint}
      />
    </View>
  );
}
// Concentric rings: a quiet reference to a location being shared.
export function Rings({
  size = 220,
  opacity = 0.14,
}: {
  size?: number;
  opacity?: number;
}) {
  return (
    <View
      aria-hidden
      pointerEvents="none"
      style={{
        position: "absolute",
        right: -size * 0.28,
        top: -size * 0.22,
        width: size,
        height: size,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {[24, 48, 72, 96].map((r) => (
          <Circle
            key={r}
            cx={100}
            cy={100}
            r={r}
            stroke="#fff"
            strokeOpacity={opacity * (1.2 - r / 120)}
            strokeWidth={1.5}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  label,
}: {
  options: { key: T; title: string }[];
  value: T;
  onChange: (key: T) => void;
  disabled?: boolean;
  label: string;
}) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const x = useState(() => new Animated.Value(0))[0];
  const placed = useRef(false);
  const index = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  const slot = width ? (width - 8) / options.length : 0;
  useEffect(() => {
    if (!slot) return;
    if (reduced || !placed.current) {
      placed.current = true;
      x.setValue(index * slot);
      return;
    }
    const animation = Animated.spring(x, {
      toValue: index * slot,
      speed: 22,
      bounciness: 4,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [index, slot, reduced, x]);
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        padding: 4,
        borderRadius: 14,
        backgroundColor: "#E6ECF6",
      }}
    >
      {slot > 0 && (
        <Animated.View
          aria-hidden
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            width: slot,
            height: 44,
            borderRadius: 10,
            backgroundColor: C.white,
            borderWidth: 1,
            borderColor: C.line,
            transform: [{ translateX: x }],
          }}
        />
      )}
      {options.map((o) => (
        <FocusPressable
          key={o.key}
          accessibilityRole="radio"
          accessibilityLabel={o.title}
          accessibilityState={{ checked: o.key === value, disabled }}
          aria-checked={o.key === value}
          aria-disabled={disabled}
          disabled={disabled}
          onPress={() => onChange(o.key)}
          pressScale={0.97}
          style={{
            flex: 1,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 6,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              fontWeight: o.key === value ? "700" : "600",
              color: o.key === value ? C.blue : C.muted,
            }}
          >
            {o.title}
          </Text>
        </FocusPressable>
      ))}
    </View>
  );
}
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontSize: 13,
        fontWeight: "700",
        color: C.muted,
        letterSpacing: 0.2,
        marginTop: 8,
        marginBottom: -4,
      }}
    >
      {children}
    </Text>
  );
}
export function IconTile({
  name,
  tone = "blue",
  size = 40,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  tone?: "blue" | "solid" | "red";
  size?: number;
}) {
  const bg = tone === "solid" ? C.blue : tone === "red" ? "#FDECEE" : C.mint;
  const fg = tone === "solid" ? C.white : tone === "red" ? C.red : C.blue;
  return (
    <View
      aria-hidden
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={Math.round(size * 0.55)} color={fg} />
    </View>
  );
}
export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body?: string;
}) {
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
      <IconTile name={icon} size={52} />
      <Text style={[s.label, { textAlign: "center" }]}>{title}</Text>
      {!!body && <Text style={[s.small, { textAlign: "center" }]}>{body}</Text>}
    </View>
  );
}
export const s = StyleSheet.create({
  page: { gap: 16, padding: 20, paddingBottom: 32 },
  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.3,
  },
  subheading: { fontSize: 20, fontWeight: "700", color: C.ink },
  body: { fontSize: 15, lineHeight: 22, color: C.muted },
  small: { fontSize: 13, lineHeight: 19, color: C.muted },
  label: { fontSize: 15, fontWeight: "600", color: C.ink },
  input: {
    fontFamily: "Manrope_400Regular",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.control,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 52,
    fontSize: 16,
    color: C.ink,
  },
  button: {
    minHeight: 52,
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
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 16,
    gap: 14,
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
    borderRadius: 22,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 9, alignItems: "center" },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 5 },
});
