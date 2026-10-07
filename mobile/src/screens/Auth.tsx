import Text from "../components/AppText";
import React, { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field, Heading, Notice, s, C, Chip } from "../components/ui";
import { api, useAction } from "../state";
import type { User } from "../types";
export default function Auth({
  onLogin,
}: {
  onLogin: (token: string, user: User) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(
    "login",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const a = useAction();
  const [errors, setErrors] = useState<Record<string, string>>({});
  function edit(field: string, value: string, setter: (value: string) => void) {
    setter(value);
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    a.clear();
  }
  function changeMode(next: typeof mode) {
    a.clear();
    setErrors({});
    setCode("");
    setPassword("");
    setMode(next);
  }
  return (
    <View style={s.page}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 8,
        }}
      >
        <Ionicons name="shield-checkmark" size={30} color={C.blue} />
        <Text style={[s.subheading, { letterSpacing: -0.5 }]}>SafelyGo</Text>
      </View>
      <Heading
        title={
          mode === "login"
            ? "Sign in"
            : mode === "register"
              ? "Create your account"
              : mode === "forgot"
                ? "Recover your account"
                : "Set a new password"
        }
        subtitle={
          mode === "register"
            ? "Use your regular email address. We’ll send a code to verify it."
            : mode === "forgot"
              ? "Enter the email you used to create your account."
              : mode === "reset"
                ? "Use the newest code from your email. Codes expire after 15 minutes. Check Spam or Junk if it hasn’t arrived."
                : "Sign in with your regular email address."
        }
      />
      {mode === "register" && (
        <Field
          editable={!a.busy}
          label="Full name"
          error={errors.name || a.fields.name}
          value={name}
          onChangeText={(value) => edit("name", value, setName)}
          autoComplete="name"
        />
      )}
      <Field
        editable={!a.busy}
        label="Email address"
        error={errors.email || a.fields.email}
        value={email}
        onChangeText={(value) => edit("email", value, setEmail)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      {mode === "reset" && (
        <Field
          editable={!a.busy}
          autoComplete="one-time-code"
          label="8-digit reset code"
          error={errors.code || a.fields.code}
          value={code}
          onChangeText={(value) => edit("code", value, setCode)}
          keyboardType="number-pad"
          maxLength={8}
        />
      )}
      {mode !== "forgot" && (
        <Field
          key={mode + "-password"}
          editable={!a.busy}
          label={mode === "reset" ? "New password" : "Password"}
          error={errors.password || a.fields.password}
          hint={mode === "login" ? undefined : "Use at least 12 characters."}
          value={password}
          onChangeText={(value) => edit("password", value, setPassword)}
          secureTextEntry
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      )}

      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      <Button
        disabled={a.busy}
        title={
          a.busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : mode === "forgot"
                  ? "Email reset code"
                  : "Reset password"
        }
        onPress={() => {
          const validation: Record<string, string> = {};
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
            validation.email = "Enter a valid email address.";
          if (mode === "register" && name.trim().length < 2)
            validation.name = "Enter your full name.";
          if (
            mode !== "forgot" &&
            password.length < (mode === "login" ? 1 : 12)
          )
            validation.password =
              mode === "login"
                ? "Enter your password."
                : "Use at least 12 characters.";
          if (mode === "reset" && !/^\d{8}$/.test(code))
            validation.code = "Enter the 8 digits from your email.";
          setErrors(validation);
          if (Object.keys(validation).length) return;
          void a.run(
            async () => {
              const addr = email.trim().toLowerCase();
              if (mode === "forgot") {
                await api.request("/auth/forgot", "POST", { email: addr });
                setMode("reset");
              } else if (mode === "reset") {
                await api.request("/auth/reset", "POST", {
                  email: addr,
                  code,
                  password,
                });
                setMode("login");
                setPassword("");
              } else {
                const result = await api.request<{ token: string; user: User }>(
                  "/auth/" + (mode === "register" ? "register" : "login"),
                  "POST",
                  { name, email: addr, password },
                );
                await onLogin(result.token, result.user);
              }
            },
            mode === "forgot"
              ? "Check your email for a reset code."
              : mode === "reset"
                ? "Password reset. Sign in to continue."
                : "",
          );
        }}
      />
      <View style={s.row}>
        {mode !== "login" && (
          <Chip
            title="Back to sign in"
            disabled={a.busy}
            onPress={() => changeMode("login")}
          />
        )}
        {mode === "login" && (
          <Chip
            title="New here? Sign up"
            disabled={a.busy}
            onPress={() => changeMode("register")}
          />
        )}
        {mode === "login" && (
          <Chip
            title="Forgot password?"
            disabled={a.busy}
            onPress={() => changeMode("forgot")}
          />
        )}
        {mode === "reset" && (
          <Chip
            title="Request a new code"
            disabled={a.busy}
            onPress={() => changeMode("forgot")}
          />
        )}
      </View>
      {__DEV__ &&
        process.env.EXPO_PUBLIC_DEMO_LOGIN === "true" &&
        mode === "login" && (
          <Button
            secondary
            title="Test login — demo student"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                const result = await api.request<{ token: string; user: User }>(
                  "/auth/demo",
                  "POST",
                );
                await onLogin(result.token, result.user);
              })
            }
          />
        )}
      <Text style={s.small}>
        In immediate danger, call your local emergency number.
      </Text>
    </View>
  );
}
