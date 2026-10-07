import React, { forwardRef } from "react";
import { Text as NativeText, StyleSheet, type TextProps } from "react-native";
import { isLoaded } from "expo-font";
// Explicit font faces keep weight rendering consistent on iOS, Android and web.
const AppText = forwardRef<NativeText, TextProps>(function AppText(
  { style, ...props },
  ref,
) {
  const flattened = StyleSheet.flatten(style) || {};
  const weight = flattened.fontWeight;
  const face =
    weight === "800" || weight === "900"
      ? "Manrope_800ExtraBold"
      : weight === "700" || weight === "bold"
        ? "Manrope_700Bold"
        : weight === "500" || weight === "600"
          ? "Manrope_600SemiBold"
          : "Manrope_400Regular";
  return (
    <NativeText
      {...props}
      ref={ref}
      style={[
        style,
        isLoaded(face) && { fontFamily: face, fontWeight: "normal" },
      ]}
    />
  );
});
export default AppText;
