import Text from "../components/AppText";
import React from "react";
import { View, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp, useLoad, useAction, confirm } from "../state";
import {
  Heading,
  Card,
  Button,
  Notice,
  FocusPressable,
  s,
  Busy,
  IconTile,
  SectionLabel,
  ListGroup,
  EmptyState,
  C,
} from "../components/ui";
import type { DirectoryContact } from "../types";
export default function Help() {
  const { campus } = useApp();
  const contacts = useLoad<DirectoryContact[]>(
    "/campuses/" + campus!.id + "/directory",
    [],
    30000,
  );
  const a = useAction();
  return (
    <View style={s.page}>
      <Heading title="Get help" subtitle="Call campus contacts directly." />
      {campus!.emergency_phone ? (
        <Card
          style={{
            borderColor: "#F0C2CA",
            borderWidth: 1,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <IconTile name="call" tone="red" size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.label, { fontSize: 17 }]}>Urgent help</Text>
              <Text style={s.small}>Emergency number set by your campus</Text>
            </View>
          </View>
          <Button
            danger
            title={"Call " + campus!.emergency_phone}
            icon="call"
            onPress={() =>
              void a.run(async () => {
                if (
                  await confirm(
                    "Call emergency services?",
                    campus!.emergency_phone!,
                    "Call",
                  )
                )
                  await Linking.openURL(
                    "tel:" + campus!.emergency_phone!.replace(/[^+0-9]/g, ""),
                  );
              })
            }
          />
        </Card>
      ) : (
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            padding: 14,
            borderRadius: 14,
            backgroundColor: "#EEF1F6",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={C.muted}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>No campus emergency number is set</Text>
            <Text style={s.small}>
              In immediate danger, use your phone’s Emergency SOS or call your
              local emergency number. Campus staff can add a number in Campus
              settings.
            </Text>
          </View>
        </View>
      )}
      {contacts.loading && <Busy />}
      {!!contacts.error && (
        <Notice
          error
          message={contacts.error}
          onRetry={() => void contacts.reload()}
        />
      )}
      {!!a.error && <Notice error message={a.error} />}
      {!contacts.loading && !contacts.error && !contacts.data.length && (
        <EmptyState
          icon="headset-outline"
          title="No campus contacts yet"
          body="Your campus hasn’t added any. Ask your campus office for the correct numbers."
        />
      )}
      {!!contacts.data.length && <SectionLabel>Campus contacts</SectionLabel>}
      {!!contacts.data.length && (
        <ListGroup>
          {contacts.data.map((c, i) => (
            <FocusPressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={"Call " + c.name + " at " + c.phone}
              accessibilityHint="A confirmation opens before dialing."
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  if (await confirm("Call " + c.name + "?", c.phone, "Call"))
                    await Linking.openURL(
                      "tel:" + c.phone.replace(/[^+0-9]/g, ""),
                    );
                })
              }
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                minHeight: 72,
                backgroundColor: pressed ? C.mint : C.white,
                borderBottomWidth: i === contacts.data.length - 1 ? 0 : 1,
                borderBottomColor: C.line,
                opacity: a.busy ? 0.5 : 1,
              })}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.label}>{c.name}</Text>
                <Text style={[s.small, { color: C.ink }]}>{c.phone}</Text>
                {!!c.description && (
                  <Text style={s.small}>{c.description}</Text>
                )}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 40,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: C.blue,
                }}
              >
                <Ionicons name="call" size={16} color={C.white} />
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: C.white }}
                >
                  Call
                </Text>
              </View>
            </FocusPressable>
          ))}
        </ListGroup>
      )}
      <Text style={s.small}>
        Calls open your phone’s dialer. SafelyGo does not dispatch responders.
      </Text>
    </View>
  );
}
