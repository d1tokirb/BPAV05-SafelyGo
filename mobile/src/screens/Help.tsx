import Text from "../components/AppText";
import React from "react";
import { View, Linking } from "react-native";
import { useApp, useLoad, useAction, confirm } from "../state";
import {
  Heading,
  Card,
  Button,
  Notice,
  FocusPressable,
  s,
  Busy,
  C,
} from "../components/ui";
import { Ionicons } from "@expo/vector-icons";
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
      <Heading title="Get help" subtitle="Tap a contact to call." />
      <Card
        style={{
          backgroundColor: C.white,
          borderColor: "#E9B9C2",
          borderWidth: 1,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#FBE1E6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="call" size={22} color={C.red} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[s.label, { fontSize: 18 }]}>Need urgent help?</Text>
            <Text style={s.small}>Call emergency services directly.</Text>
          </View>
        </View>

        {!!campus!.emergency_phone && (
          <>
            <Text style={s.label}>{campus!.emergency_phone}</Text>
            <Button
              danger
              title={"Call emergency services · " + campus!.emergency_phone}
              icon="call-outline"
              onPress={() =>
                void a.run(async () => {
                  if (
                    await confirm(
                      "Call emergency services?",
                      campus!.emergency_phone!,
                    )
                  )
                    await Linking.openURL(
                      "tel:" + campus!.emergency_phone!.replace(/[^+0-9]/g, ""),
                    );
                })
              }
            />
          </>
        )}
        {!campus!.emergency_phone && (
          <Text style={s.small}>
            Use your phone’s Emergency SOS or call your local emergency number.
            No campus emergency number is configured.
          </Text>
        )}
      </Card>
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
        <Notice message="Your campus has not added emergency contacts yet. Contact your campus office for the correct numbers." />
      )}
      {!!contacts.data.length && (
        <Text accessibilityRole="header" style={s.subheading}>
          Campus contacts
        </Text>
      )}
      {contacts.data.map((c) => (
        <FocusPressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={"Call " + c.name}
          accessibilityHint={c.phone + ". A confirmation opens before dialing."}
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              if (await confirm("Call " + c.name + "?", c.phone))
                await Linking.openURL("tel:" + c.phone.replace(/[^+0-9]/g, ""));
            })
          }
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 18,
            minHeight: 96,
            borderRadius: 16,
            backgroundColor: pressed ? C.mint : "#EEF4FF",
            opacity: a.busy ? 0.5 : 1,
          })}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: C.white,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="headset-outline" size={25} color={C.blue} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>{c.name}</Text>
            <Text style={[s.small, { color: C.blue }]}>{c.phone}</Text>
            {!!c.description && <Text style={s.small}>{c.description}</Text>}
          </View>
          <Ionicons name="call-outline" size={22} color={C.blue} />
        </FocusPressable>
      ))}
      <Text style={s.small}>
        Calls open your phone’s dialer. SafelyGo does not dispatch responders.
      </Text>
      <Button
        secondary
        title="Refresh directory"
        onPress={() => void contacts.reload()}
      />
    </View>
  );
}
