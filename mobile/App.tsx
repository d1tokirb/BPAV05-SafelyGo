import Text from "./src/components/AppText";
import "./src/location";
import { useFonts } from "expo-font";
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Slot, router, usePathname } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  AppState as NativeAppState,
  Animated,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { StateContext, api, ApiError, storage, message } from "./src/state";
import { stopTracking } from "./src/location";
import {
  C,
  s,
  Notice,
  Button,
  FocusPressable,
  Busy,
  useReducedMotion,
} from "./src/components/ui";
import type { User, Campus } from "./src/types";
import ConfirmationHost from "./src/components/Confirmation";
import Auth from "./src/screens/Auth";
import Onboarding, { Verification } from "./src/screens/Onboarding";
import Sharing from "./src/screens/Sharing";
import Account from "./src/screens/Account";
const icons: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  Home: "home-outline",
  Map: "map-outline",
  Reports: "flag-outline",
  Sharing: "people-outline",
  Help: "call-outline",
  Staff: "shield-outline",
  Account: "person-circle-outline",
};
export default function App() {
  const [fontsReady, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const scroll = useRef<ScrollView>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();
  const scrollToTop = useCallback(() => {
    scroll.current?.scrollTo({ y: 0, animated: !reduceMotion });
  }, [reduceMotion]);
  const [user, setUser] = useState<User | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selected, setSelected] = useState("");
  const pathname = usePathname();
  const tab =
    (
      {
        "/map": "Map",
        "/reports": "Reports",
        "/walk": "Sharing",
        "/help": "Help",
        "/staff": "Staff",
        "/account": "Account",
        "/platform": "Platform",
      } as Record<string, string>
    )[pathname] || "Home";
  const setTab = (next: string) => {
    const paths = {
      Home: "/",
      Map: "/map",
      Reports: "/reports",
      Sharing: "/walk",
      Help: "/help",
      Staff: "/staff",
      Account: "/account",
      Platform: "/platform",
    } as const;
    router.navigate(paths[next as keyof typeof paths] || "/");
  };
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (reduceMotion || Platform.OS === "web") {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    const animation = Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [tab, adding, reduceMotion, fade]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const campus = campuses.find((c) => c.id === selected) || campuses[0] || null;
  async function refresh() {
    const r = await api.request<{ user: User; campuses: Campus[] }>("/me");
    setUser(r.user);
    setCampuses(r.campuses);
    setError("");
  }
  async function localLogout() {
    const cleanup = await Promise.allSettled([
      stopTracking(),
      storage.remove("session"),
    ]);
    api.token = null;
    setUser(null);
    setCampuses([]);
    setSelected("");
    setTab("Home");
    setAdding(false);
    if (cleanup.some((result) => result.status === "rejected"))
      setError(
        "Signed out. Some device data could not be cleared, but this session no longer has server access.",
      );
  }
  async function logout() {
    try {
      await api.request("/auth/logout", "POST");
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401))
        throw new Error(
          "Sign out needs a connection to revoke sharing. Stop sharing first or reconnect and try again.",
        );
    }
    await localLogout();
  }
  async function onLogin(value: string, u: User) {
    api.token = value;
    await storage.set("session", value);
    setUser(u);
    if (tab !== "Sharing") setTab("Home");
    await refresh();
  }
  useEffect(() => {
    void (async () => {
      try {
        const value = await storage.get("session");
        const chosen = await storage.get("campus");
        if (chosen) setSelected(chosen);
        if (value) {
          api.token = value;
          await refresh();
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await localLogout();
        else setError(message(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    if (!user) return;
    const reload = () =>
      void refresh().catch(async (e) => {
        if (e instanceof ApiError && e.status === 401) await localLogout();
        else setError(message(e));
      });
    const timer = setInterval(reload, 30000);
    const sub = NativeAppState.addEventListener("change", (state) => {
      if (state === "active") reload();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [user?.id]);
  function selectCampus(id: string) {
    setSelected(id);
    void storage.set("campus", id);
    setAdding(false);
    setTab("Home");
  }
  const allowedStaff = campus && ["staff", "owner"].includes(campus.role);
  const tabs = ["Home", "Map", "Reports", "Sharing", "Help"];
  let content: React.ReactNode;
  if (loading || (!fontsReady && !fontError)) content = <Busy />;
  else if (!user) content = <Auth onLogin={onLogin} />;
  else if (!user.verified) content = <Verification />;
  else if (!campus && tab === "Platform" && !adding) content = null;
  else if (!campus && tab === "Sharing" && !adding)
    content = (
      <>
        <Sharing />
        <View style={s.page}>
          <Button
            secondary
            title="Find my campus"
            onPress={() => setTab("Home")}
          />
        </View>
      </>
    );
  else if (!campus && tab === "Account" && !adding)
    content = <Account onAddCampus={() => setTab("Home")} />;
  else if (!campus || adding)
    content = (
      <>
        <Onboarding />
        {adding && (
          <View style={s.page}>
            <Button
              secondary
              title="Back to my campus"
              onPress={() => setAdding(false)}
            />
          </View>
        )}
        {!campus && (
          <View style={s.page}>
            <Button
              secondary
              title="Account and privacy"
              onPress={() => setTab(tab === "Account" ? "Home" : "Account")}
            />
            {tab === "Account" && (
              <Account onAddCampus={() => setTab("Home")} />
            )}
          </View>
        )}
      </>
    );
  else content = null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.sky }}>
        <StateContext.Provider
          value={{
            connectionError: error,
            user: user!,
            campuses,
            campus,
            selectCampus,
            refresh,
            logout,
            scrollToTop,
            addCampus: () => setAdding(true),
          }}
        >
          <View style={styles.frame}>
            <ConfirmationHost />
            {user && (
              <View style={styles.header}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: C.blue,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      color={C.mint}
                      size={23}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "800",
                        color: C.ink,
                        letterSpacing: -0.6,
                      }}
                    >
                      SafelyGo
                    </Text>
                    <Text numberOfLines={1} style={[s.small, { fontSize: 12 }]}>
                      {campus?.name || "Campus safety"}
                    </Text>
                  </View>
                </View>
                {user.verified && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    {allowedStaff && (
                      <FocusPressable
                        accessibilityRole="button"
                        accessibilityLabel="Staff"
                        onPress={() => {
                          setAdding(false);
                          setTab("Staff");
                        }}
                        style={{
                          minHeight: 48,
                          minWidth: 48,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="shield-outline"
                          size={24}
                          color={C.blue}
                        />
                        <Text style={{ fontSize: 11, color: C.muted }}>
                          Staff
                        </Text>
                      </FocusPressable>
                    )}
                    <FocusPressable
                      accessibilityRole="button"
                      accessibilityLabel="Account"
                      accessibilityState={{ selected: tab === "Account" }}
                      onPress={() => {
                        setAdding(false);
                        setTab("Account");
                      }}
                      style={({ pressed }) => ({
                        width: 54,
                        minHeight: 54,
                        gap: 3,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: tab === "Account" ? C.blue : C.mint,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: tab === "Account" ? C.white : C.blue,
                          }}
                        >
                          {user.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: C.muted }}>
                        Account
                      </Text>
                    </FocusPressable>
                  </View>
                )}
              </View>
            )}
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <ScrollView
                ref={scroll}
                showsVerticalScrollIndicator={false}
                key={tab + campus?.id + adding}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
              >
                {!!error && (
                  <View style={{ padding: 20 }}>
                    <Notice global error message={error} />
                    <Button
                      secondary
                      title="Retry connection"
                      onPress={() =>
                        void refresh().catch((e) => setError(message(e)))
                      }
                    />
                  </View>
                )}
                <Animated.View style={{ opacity: fade, flexGrow: 1 }}>
                  {content}
                  <View style={content ? { display: "none" } : { flexGrow: 1 }}>
                    <Slot />
                  </View>
                </Animated.View>
              </ScrollView>
            </KeyboardAvoidingView>
            {user?.verified && campus && !adding && (
              <View
                accessibilityRole="tablist"
                accessibilityLabel="Main navigation"
                style={styles.tabs}
              >
                {tabs.map((t) => (
                  <FocusPressable
                    key={t}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === t }}
                    aria-selected={tab === t}
                    accessibilityLabel={t === "Sharing" ? "Walk" : t}
                    onPress={() => setTab(t)}
                    style={({ pressed }) => [
                      styles.tab,
                      {
                        backgroundColor: pressed ? C.mint : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 30,
                        borderRadius: 15,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: tab === t ? C.mint : "transparent",
                      }}
                    >
                      <Ionicons
                        name={
                          (tab === t
                            ? icons[t].replace("-outline", "")
                            : icons[t]) as React.ComponentProps<
                            typeof Ionicons
                          >["name"]
                        }
                        size={22}
                        color={tab === t ? C.blue : C.muted}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: tab === t ? "700" : "500",
                        color: tab === t ? C.blue : C.muted,
                      }}
                    >
                      {t === "Sharing" ? "Walk" : t}
                    </Text>
                  </FocusPressable>
                ))}
              </View>
            )}
          </View>
        </StateContext.Provider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    backgroundColor: C.sky,
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.sky,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: C.white,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  tab: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 10,
  },
});
