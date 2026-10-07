import Text from "../components/AppText";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useApp, useLoad, usePaged } from "../state";
import {
  Pagination,
  Heading,
  Notice,
  Card,
  Chip,
  s,
  C,
  Button,
  Disclosure,
  Field,
  Busy,
} from "../components/ui";
import MapDetails from "../components/MapDetails";
import SafetyMap from "../components/SafetyMap";
import { walkStatus } from "../walkStatus";
import type { Report, Sharing, MapPin } from "../types";
export default function MapScreen() {
  const { campus } = useApp();
  const reports = usePaged<Report>(
    "/campuses/" + campus!.id + "/reports",
    200,
    10000,
  );
  const sharing = useLoad<Sharing>(
    "/sharing",
    { mine: [], incoming: [] },
    10000,
  );
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const [mapVersion, setMapVersion] = useState(0);
  const [selectedPins, setSelectedPins] = useState<string[]>([]);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const visible = reports.data.filter(
    (r) =>
      (filter === "all" || !["resolved", "dismissed"].includes(r.status)) &&
      (r.title + " " + r.description)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const statusNames: Record<string, string> = {
    submitted: "Received",
    reviewing: "Staff reviewing",
    resolved: "Resolved",
    dismissed: "Closed",
  };
  const severityNames: Record<string, string> = {
    low: "Low concern",
    medium: "Moderate concern",
    high: "Serious concern",
  };
  const pins: MapPin[] = visible.map((r) => ({
    id: r.id,
    latitude: r.latitude,
    longitude: r.longitude,
    title: r.title,
    subtitle: `${severityNames[r.severity]}, ${statusNames[r.status] || r.status}`,
    description: r.description === r.title ? undefined : r.description,
    color: r.severity === "high" ? C.red : C.blue,
  }));
  for (const t of sharing.data.incoming) {
    if (
      !walkStatus(t, now).expired &&
      t.latitude !== null &&
      t.longitude !== null
    )
      pins.push({
        id: t.id,
        latitude: t.latitude,
        longitude: t.longitude,
        title: t.owner_name || "Trusted contact",
        description: t.updated_at
          ? (!walkStatus(t, now).recent
              ? "Location may be stale. Last update "
              : "Last update ") + new Date(t.updated_at).toLocaleTimeString()
          : "Waiting for location",
        color: C.green,
      });
  }
  return (
    <View style={s.page}>
      <MapDetails
        visible={selectedPins.length > 0}
        pins={pins.filter((pin) => selectedPins.includes(pin.id))}
        onClose={() => setSelectedPins([])}
      />
      <Heading
        title="Campus map"
        subtitle="Tap a marker or number for details."
      />
      <View style={s.row}>
        <Chip
          title="Active concerns"
          selected={filter === "active"}
          onPress={() => setFilter("active")}
        />
        <Chip
          title="All reports"
          selected={filter === "all"}
          onPress={() => setFilter("all")}
        />
      </View>
      {!!(reports.error || sharing.error) && (
        <Notice
          error
          message={reports.error || sharing.error}
          onRetry={() => {
            void reports.reload();
            void sharing.reload();
          }}
        />
      )}
      {!!(reports.error || sharing.error) && pins.length > 0 && (
        <Text style={s.small}>
          Showing the last data received. Updates cannot be checked until you
          reconnect.
        </Text>
      )}
      {reports.loading && <Busy />}
      {!reports.loading && !reports.error && !visible.length && (
        <Text style={s.body}>
          {search
            ? "No concerns match your search."
            : filter === "active"
              ? "No active concerns reported."
              : "No reports in this view."}
        </Text>
      )}
      <SafetyMap
        key={campus!.id + mapVersion}
        latitude={campus!.latitude}
        longitude={campus!.longitude}
        radius={campus!.radius_m}
        pins={pins}
        onInspect={(values) => setSelectedPins(values.map((pin) => pin.id))}
        height={320}
      />
      <View style={s.row}>
        {[
          [C.blue, "Concern"],
          [C.red, "Serious"],
          [C.green, "Shared walk"],
        ].map(([color, label]) => (
          <View
            key={label}
            style={{
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              marginRight: 5,
            }}
          >
            <View
              accessible={false}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
              }}
            />
            <Text style={s.small}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            icon="locate-outline"
            title="Center map"
            onPress={() => setMapVersion(mapVersion + 1)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            icon="refresh-outline"
            title="Refresh map"
            onPress={() => {
              void reports.reload();
              void sharing.reload();
            }}
          />
        </View>
      </View>
      <Disclosure
        compact
        title={search ? "Search: " + search : "Search concerns"}
      >
        <Field
          label="Search concerns"
          placeholder="Title or description"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <Button
            secondary
            title="Clear search"
            onPress={() => setSearch("")}
          />
        )}
      </Disclosure>
      {visible.length > 0 && (
        <Disclosure compact title={"Read concerns (" + visible.length + ")"}>
          {visible.map((r) => (
            <Card key={r.id}>
              <Text style={s.subheading}>{r.title}</Text>
              <View style={s.row}>
                <Chip title={statusNames[r.status] || r.status} />
                <Chip title={severityNames[r.severity] || "Campus concern"} />
              </View>
              {r.description !== r.title && (
                <Text style={s.body}>{r.description}</Text>
              )}
            </Card>
          ))}
        </Disclosure>
      )}
      <Disclosure compact title="About this map">
        <Text style={s.small}>
          Reports and locations may be delayed. The map cannot guarantee safety.
        </Text>
      </Disclosure>
      <Pagination page={reports} />
    </View>
  );
}
