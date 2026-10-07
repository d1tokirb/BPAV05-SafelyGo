import Text from "../components/AppText";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useApp, useLoad } from "../state";
import {
  Card,
  Button,
  Notice,
  FocusPressable,
  Disclosure,
  s,
  C,
  Busy,
} from "../components/ui";
import { walkStatus } from "../walkStatus";
import SafetyMap from "../components/SafetyMap";
import { Ionicons } from "@expo/vector-icons";
import type { CampusAlert, Sharing, Report } from "../types";
export default function Home({
  navigate,
}: {
  navigate: (tab: string) => void;
}) {
  const { user, campus } = useApp();
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const sharing = useLoad<Sharing>(
    "/sharing",
    { mine: [], incoming: [] },
    10000,
  );
  const reports = useLoad<Report[]>(
    campus!.status === "active"
      ? "/campuses/" + campus!.id + "/reports?offset=0"
      : null,
    [],
    10000,
  );
  const previewPins = reports.data
    .filter((report) => !["resolved", "dismissed"].includes(report.status))
    .map((report) => ({
      id: report.id,
      latitude: report.latitude,
      longitude: report.longitude,
      title: report.title,
      color: report.severity === "high" ? C.red : C.blue,
    }));
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const activeWalk = sharing.data.mine.find(
    (walk) => !walkStatus(walk, now).expired,
  );
  const incoming = sharing.data.incoming.filter(
    (walk) => !walkStatus(walk, now).expired,
  );
  const alerts = useLoad<CampusAlert[]>(
    "/campuses/" + campus!.id + "/alerts",
    [],
    10000,
  );
  const currentAlerts = alerts.data.filter(
    (alert) => Date.parse(alert.expires_at) > now,
  );
  return (
    <View style={[s.page, { gap: 16 }]}>
      <View style={home.greeting}>
        <Text accessibilityRole="header" style={home.title}>
          {"Hi, " + user.name.split(" ")[0] + "."}
        </Text>
        <Text style={s.body}>Choose what you need.</Text>
      </View>
      {campus!.status !== "active" && (
        <Notice
          message={
            campus!.status === "suspended"
              ? "Campus access is paused. Contact your campus office for help."
              : campus!.role === "student"
                ? "Your campus is awaiting approval. You can still share walks with trusted people."
                : "Your campus is awaiting approval. Finish campus setup in Staff."
          }
        />
      )}
      {incoming.length > 0 && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: C.blue }}>
          <Text style={s.label}>
            {incoming.map((w) => w.owner_name || "A trusted person").join(", ")}{" "}
            {incoming.length === 1 ? "is" : "are"} sharing with you
          </Text>
          <Button
            secondary
            title="View shared walks"
            onPress={() => navigate("Sharing")}
          />
        </Card>
      )}
      {alerts.loading && <Busy />}
      {!!(alerts.error || sharing.error) && (
        <Notice
          error
          message={alerts.error || sharing.error}
          onRetry={() => {
            void alerts.reload();
            void sharing.reload();
          }}
        />
      )}
      <FocusPressable
        accessibilityRole="button"
        focusColor={C.blue}
        accessibilityLabel={activeWalk ? "Open your walk" : "Share a walk"}
        accessibilityHint="Choose who sees your location and for how long."
        onPress={() => navigate("Sharing")}
        style={({ pressed }) => [
          home.walkAction,
          narrow && { padding: 14, gap: 10 },
          { opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <View style={[home.walkIcon, narrow && { width: 44, height: 44 }]}>
          <Ionicons name="footsteps-outline" size={32} color={C.white} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text
            style={[home.walkTitle, narrow && { fontSize: 18, lineHeight: 25 }]}
          >
            {activeWalk ? "Your shared walk" : "Share a walk"}
          </Text>
          <Text style={home.walkHint}>
            {activeWalk ? "Manage your sharing" : "Choose people. Set a time."}
          </Text>
        </View>
        <View style={[home.walkArrow, narrow && { width: 36, height: 36 }]}>
          <Ionicons name="arrow-forward" size={22} color={C.white} />
        </View>
      </FocusPressable>
      <View style={home.actionGrid}>
        {[
          {
            title: "Report a concern",
            hint: "Tell campus staff",
            icon: "flag-outline" as const,
            route: "Reports",
          },
          {
            title: "Get help",
            hint: "Find someone to call",
            icon: "call-outline" as const,
            route: "Help",
          },
        ].map((action) => (
          <FocusPressable
            key={action.route}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            onPress={() => navigate(action.route)}
            style={({ pressed }) => [
              home.utilityAction,
              action.route === "Help" && home.helpAction,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={home.utilityIcon}>
              <Ionicons name={action.icon} size={30} color={C.blue} />
            </View>
            <Text style={home.utilityTitle}>{action.title}</Text>
            <Text style={home.small}>{action.hint}</Text>
          </FocusPressable>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        <View style={home.sectionHeading}>
          <Text style={home.sectionTitle}>Around campus</Text>
          <Ionicons name="location-outline" size={19} color={C.muted} />
        </View>
        <FocusPressable
          accessibilityRole="button"
          accessibilityLabel="Open campus map"
          accessibilityHint="View reported concerns and map details."
          onPress={() => navigate("Map")}
          style={home.mapPreview}
        >
          <View
            pointerEvents="none"
            aria-hidden
            importantForAccessibility="no-hide-descendants"
          >
            <SafetyMap
              preview
              key={campus!.id}
              height={150}
              latitude={campus!.latitude}
              longitude={campus!.longitude}
              radius={campus!.radius_m}
              pins={previewPins}
            />
          </View>
          <View style={home.mapFooter}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.label}>Campus map</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: C.blue,
                  }}
                />
                <Text style={home.small}>
                  {reports.error
                    ? "Preview updates unavailable"
                    : reports.loading
                      ? "Loading reports…"
                      : "Reported concerns"}
                </Text>
              </View>
            </View>
            <View style={home.mapArrow}>
              <Ionicons name="arrow-forward" size={20} color={C.blue} />
            </View>
          </View>
        </FocusPressable>
      </View>
      {!!activeWalk && !walkStatus(activeWalk, now).recent && (
        <Notice message="Your shared position may be outdated. Open your walk to check updates." />
      )}
      {currentAlerts.length > 0 && (
        <Disclosure
          compact
          title={"Campus updates (" + currentAlerts.length + ")"}
        >
          {currentAlerts.map((a) => (
            <Card key={a.id}>
              <Text style={s.subheading}>{a.title}</Text>
              <Text style={s.body}>{a.body}</Text>
              <Text style={s.small}>
                Until {new Date(a.expires_at).toLocaleString()}
              </Text>
            </Card>
          ))}
        </Disclosure>
      )}
      <Text style={s.small}>
        In immediate danger? Call your local emergency number. SafelyGo does not
        dispatch help.
      </Text>
    </View>
  );
}

const home = StyleSheet.create({
  greeting: { gap: 6, marginBottom: 2 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: C.ink,
  },
  walkAction: {
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#DCE7FA",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 108,
  },
  walkIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  walkTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "700",
    color: C.ink,
  },
  walkHint: { fontSize: 13, lineHeight: 20, color: C.muted },
  walkArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "700",
    color: C.ink,
  },
  mapPreview: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.line,
  },
  mapFooter: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.white,
  },
  mapArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  actionGrid: { flexDirection: "row", gap: 12 },
  utilityAction: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 120,
  },
  helpAction: { backgroundColor: C.white },
  utilityIcon: { height: 36, justifyContent: "center" },
  utilityTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    color: C.ink,
  },
  small: { fontSize: 12, lineHeight: 18, color: C.muted },
});
