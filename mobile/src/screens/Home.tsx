import Text from "../components/AppText";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useApp, useLoad } from "../state";
import {
  Card,
  Notice,
  FocusPressable,
  Disclosure,
  IconTile,
  Rings,
  SectionLabel,
  s,
  C,
  Pulse,
  Reveal,
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
  const walkLive = !!activeWalk;
  const loadingHome = alerts.loading && sharing.loading;
  return (
    <View style={s.page}>
      <Reveal index={0} style={home.greeting}>
        <Text accessibilityRole="header" style={home.title}>
          {"Hi, " + user.name.split(" ")[0]}
        </Text>
      </Reveal>
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
        <Reveal index={1}>
          <FocusPressable
            accessibilityRole="button"
            accessibilityLabel={
              incoming
                .map((w) => w.owner_name || "A trusted person")
                .join(", ") +
              (incoming.length === 1 ? " is" : " are") +
              " sharing with you. View shared walks."
            }
            onPress={() => navigate("Sharing")}
            style={home.incoming}
          >
            <View style={home.liveDot} />
            <Text style={[s.label, { flex: 1 }]} numberOfLines={2}>
              {incoming
                .map((w) => w.owner_name || "A trusted person")
                .join(", ")}{" "}
              {incoming.length === 1 ? "is" : "are"} sharing with you
            </Text>
            <Ionicons name="chevron-forward" size={20} color={C.blue} />
          </FocusPressable>
        </Reveal>
      )}
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
      <Reveal index={1}>
        <FocusPressable
          accessibilityRole="button"
          focusColor={C.white}
          accessibilityLabel={
            walkLive ? "Open your shared walk" : "Share a walk"
          }
          accessibilityHint="Choose who sees your location and for how long."
          onPress={() => navigate("Sharing")}
          pressScale={0.98}
          style={[home.hero, narrow && { padding: 18 }]}
        >
          <Rings size={narrow ? 200 : 240} />
          <View style={home.heroTop}>
            <View style={home.heroIcon}>
              <Ionicons name="footsteps" size={22} color={C.white} />
            </View>
            {walkLive && (
              <View style={home.livePill}>
                <View style={[home.liveDot, { backgroundColor: C.white }]} />
                <Text style={home.livePillText}>Sharing now</Text>
              </View>
            )}
          </View>
          <View style={{ gap: 4 }}>
            <Text style={home.heroTitle}>
              {walkLive ? "Your shared walk" : "Share a walk"}
            </Text>
            <Text style={home.heroHint}>
              {walkLive
                ? "See who can follow you and stop any time."
                : "Pick trusted people and a time limit. Nothing is shared until you confirm."}
            </Text>
          </View>
          <View style={home.heroCta}>
            <Text style={home.heroCtaText}>
              {walkLive ? "Manage walk" : "Start"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={C.blue} />
          </View>
        </FocusPressable>
      </Reveal>
      <Reveal index={2} style={home.actionGrid}>
        {[
          {
            title: "Report a concern",
            hint: "Tell campus staff",
            icon: "flag" as const,
            route: "Reports",
            tone: "blue" as const,
          },
          {
            title: "Get help",
            hint: "Call someone now",
            icon: "call" as const,
            route: "Help",
            tone: "red" as const,
          },
        ].map((action) => (
          <FocusPressable
            key={action.route}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            onPress={() => navigate(action.route)}
            style={home.tile}
          >
            <IconTile name={action.icon} tone={action.tone} />
            <View style={{ gap: 2 }}>
              <Text style={home.tileTitle}>{action.title}</Text>
              <Text style={home.small}>{action.hint}</Text>
            </View>
          </FocusPressable>
        ))}
      </Reveal>
      <Reveal index={3} style={{ gap: 10 }}>
        <SectionLabel>Around campus</SectionLabel>
        <FocusPressable
          accessibilityRole="button"
          accessibilityLabel="Open campus map"
          accessibilityHint="View reported concerns and map details."
          onPress={() => navigate("Map")}
          pressScale={0.985}
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
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.label}>Campus map</Text>
              <Text style={home.small}>
                {reports.error
                  ? "Preview updates unavailable"
                  : reports.loading
                    ? "Loading reports…"
                    : previewPins.length
                      ? previewPins.length +
                        (previewPins.length === 1
                          ? " open concern"
                          : " open concerns")
                      : "No open concerns reported"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.blue} />
          </View>
        </FocusPressable>
      </Reveal>
      {loadingHome && <Pulse style={{ height: 44 }} />}
      {!!activeWalk && !walkStatus(activeWalk, now).recent && (
        <Notice message="Your shared position may be outdated. Open your walk to check updates." />
      )}
      {currentAlerts.length > 0 && (
        <Disclosure
          icon="megaphone-outline"
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
      <Text style={[s.small, { marginTop: 4 }]}>
        In immediate danger? Call your local emergency number. SafelyGo does not
        dispatch help.
      </Text>
    </View>
  );
}

const home = StyleSheet.create({
  greeting: { gap: 2, marginBottom: 2 },
  campusName: { fontSize: 13, fontWeight: "600", color: C.muted },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: C.ink,
  },
  hero: {
    backgroundColor: C.blue,
    borderRadius: 22,
    padding: 22,
    gap: 18,
    overflow: "hidden",
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  livePillText: { fontSize: 12, fontWeight: "700", color: C.white },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: C.white,
  },
  heroHint: { fontSize: 14, lineHeight: 20, color: "#DCE7FB", maxWidth: 300 },
  heroCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: C.white,
  },
  heroCtaText: { fontSize: 15, fontWeight: "700", color: C.blue },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.blue,
  },
  incoming: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: C.mint,
    borderWidth: 1,
    borderColor: C.accent,
  },
  actionGrid: { flexDirection: "row", gap: 12 },
  tile: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    gap: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 124,
  },
  tileTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: C.ink },
  mapPreview: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
  },
  mapFooter: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.white,
  },
  small: { fontSize: 12, lineHeight: 17, color: C.muted },
});
