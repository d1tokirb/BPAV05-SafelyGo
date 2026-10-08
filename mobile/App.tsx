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
  Brand,
  useReducedMotion,
} from "./src/components/ui";
import { ease } from "./src/components/motion";
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
const filled: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  Home: "home",
  Map: "map",
  Reports: "flag",
  Sharing: "people",
  Help: "call",
};
function TabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: string[];
  active: string;
  onSelect: (tab: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const x = useState(() => new Animated.Value(0))[0];
  const placed = useRef(false);
  const index = tabs.indexOf(active);
  const slot = width ? (width - 16) / tabs.length : 0;
  useEffect(() => {
    if (!slot || index < 0) return;
    if (reduced || !placed.current) {
      placed.current = true;
      x.setValue(index * slot);
      return;
    }
    const animation = Animated.spring(x, {
      toValue: index * slot,
      speed: 18,
      bounciness: 5,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [index, slot, reduced, x]);
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Main navigation"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.tabs}
    >
      {slot > 0 && index >= 0 && (
        <Animated.View
          aria-hidden
          pointerEvents="none"
          style={[
            styles.indicator,
            { width: slot - 12, transform: [{ translateX: x }] },
          ]}
        />
      )}
      {tabs.map((t) => {
        const on = active === t;
        return (
          <FocusPressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            accessibilityLabel={t === "Sharing" ? "Walk" : t}
            onPress={() => onSelect(t)}
            pressScale={0.92}
            style={styles.tab}
          >
            <Ionicons
              name={on ? filled[t] : icons[t]}
              size={22}
              color={on ? C.blue : C.muted}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: on ? "700" : "600",
                color: on ? C.blue : C.muted,
              }}
            >
              {t === "Sharing" ? "Walk" : t}
            </Text>
          </FocusPressable>
        );
      })}
    </View>
  );
}
export default function App() {
  const [fontsReady, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const scroll = useRef<ScrollView>(null);
  const fade = useState(() => new Animated.Value(1))[0];
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
    if (reduceMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    const animation = Animated.timing(fade, {
      toValue: 1,
      duration: 320,
      easing: ease,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    // Never leave a screen invisible if the animation frame loop is paused.
    const failsafe = setTimeout(() => fade.setValue(1), 700);
    return () => {
      animation.stop();
      clearTimeout(failsafe);
    };
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
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
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
                  <Brand size={36} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: C.ink,
                        letterSpacing: -0.4,
                      }}
                    >
                      SafelyGo
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[s.small, { fontSize: 12, lineHeight: 16 }]}
                    >
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
                        accessibilityState={{ selected: tab === "Staff" }}
                        hitSlop={4}
                        onPress={() => {
                          setAdding(false);
                          setTab("Staff");
                        }}
                        style={{
                          height: 38,
                          paddingHorizontal: 12,
                          borderRadius: 19,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          backgroundColor: tab === "Staff" ? C.blue : C.mint,
                        }}
                      >
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={18}
                          color={tab === "Staff" ? C.white : C.blue}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: tab === "Staff" ? C.white : C.blue,
                          }}
                        >
                          Staff
                        </Text>
                      </FocusPressable>
                    )}
                    <FocusPressable
                      accessibilityRole="button"
                      accessibilityLabel="Account"
                      accessibilityState={{ selected: tab === "Account" }}
                      hitSlop={4}
                      onPress={() => {
                        setAdding(false);
                        setTab("Account");
                      }}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: tab === "Account" ? C.blue : C.mint,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          lineHeight: 20,
                          fontWeight: "700",
                          color: tab === "Account" ? C.white : C.blue,
                        }}
                      >
                        {user.name.slice(0, 1).toUpperCase()}
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
                <Animated.View
                  style={{
                    opacity: fade,
                    flexGrow: 1,
                    transform: [
                      {
                        translateY: fade.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 0],
                        }),
                      },
                    ],
                  }}
                >
                  {content}
                  <View style={content ? { display: "none" } : { flexGrow: 1 }}>
                    <Slot />
                  </View>
                </Animated.View>
              </ScrollView>
            </KeyboardAvoidingView>
            {user?.verified && campus && !adding && (
              <TabBar tabs={tabs} active={tab} onSelect={setTab} />
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
    backgroundColor: C.bg,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: C.white,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  indicator: {
    position: "absolute",
    top: 6,
    left: 14,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.mint,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 16,
  },
});
