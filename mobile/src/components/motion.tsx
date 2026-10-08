import React, { forwardRef, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const native = Platform.OS !== "web";

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

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Pressable with a soft spring scale, so every tap has tactile feedback.
export const SpringPressable = forwardRef<
  React.ComponentRef<typeof Pressable>,
  React.ComponentProps<typeof Pressable> & { pressScale?: number }
>(function SpringPressable(
  { style, onPressIn, onPressOut, pressScale = 0.97, disabled, ...props },
  ref,
) {
  const scale = useState(() => new Animated.Value(1))[0];
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const to = (value: number) => {
    if (reduced) return;
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 4,
      useNativeDriver: native,
    }).start();
  };
  const resolved =
    typeof style === "function"
      ? style({ pressed, hovered: false } as never)
      : style;
  return (
    <AnimatedPressable
      {...props}
      ref={ref as never}
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        if (!disabled) to(pressScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        to(1);
        onPressOut?.(event);
      }}
      style={[resolved as StyleProp<ViewStyle>, { transform: [{ scale }] }]}
    />
  );
});

// Fade and rise into place. Stagger siblings with `index`.
export function Reveal({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index, 8) * 55,
      easing: ease,
      useNativeDriver: native,
    });
    animation.start();
    const failsafe = setTimeout(
      () => progress.setValue(1),
      420 + Math.min(index, 8) * 55 + 300,
    );
    return () => {
      animation.stop();
      clearTimeout(failsafe);
    };
  }, [index, reduced, progress]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Gentle pulse for loading placeholders.
export function Pulse({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const value = useState(() => new Animated.Value(0.55))[0];
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.timing(value, {
          toValue: 0.55,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: native,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, value]);
  return (
    <Animated.View
      accessible={false}
      style={[
        { backgroundColor: "#DCE5F3", borderRadius: 10 },
        style,
        { opacity: value },
      ]}
    />
  );
}
