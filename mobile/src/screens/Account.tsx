import Text from "../components/AppText";
import { router } from "expo-router";
import React, { useState } from "react";
import { View, Linking } from "react-native";
import { API_URL } from "../api";
import { Ionicons } from "@expo/vector-icons";
import { draftStorage } from "../drafts";
import { useApp, useAction, useLoad, api, confirm } from "../state";
import {
  Heading,
  SummaryRow,
  Field,
  Card,
  Button,
  Notice,
  C,
  s,
  Disclosure,
} from "../components/ui";
export default function Account({ onAddCampus }: { onAddCampus: () => void }) {
  const { user, campuses, campus, selectCampus, refresh, logout } = useApp();
  const ownedCampuses = campuses.filter((c) => c.role === "owner");
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const platform = useLoad<{ isOperator: boolean; supportEmail: string }>(
    "/platform-info",
    { isOperator: false, supportEmail: "" },
  );
  const a = useAction();
  return (
    <View style={s.page}>
      <Heading title="Your account" />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingBottom: 8,
        }}
      >
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 20,
            backgroundColor: C.navy,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.white, fontSize: 25, fontWeight: "700" }}>
            {user.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[s.label, { fontSize: 20 }]}>{user.name}</Text>
          <Text style={s.small}>{user.email}</Text>
        </View>
      </View>
      {platform.data.isOperator && (
        <Button
          secondary
          title="Platform campus review"
          icon="shield-checkmark-outline"
          onPress={() => router.navigate("/platform")}
        />
      )}
      <Disclosure icon="person-outline" title="Edit your name">
        <Card>
          <Field
            label="Your name"
            error={a.fields.name}
            value={name}
            onChangeText={setName}
          />
          <Button
            title="Save profile"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                await api.request("/me", "PATCH", { name });
                await refresh();
              }, "Profile saved.")
            }
          />
        </Card>
      </Disclosure>
      <Disclosure icon="school-outline" title="Your campuses" initiallyOpen>
        {campuses.map((c) => (
          <Card key={c.id}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: C.mint,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="school-outline" size={22} color={C.blue} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.label}>{c.name}</Text>
                <Text style={s.small}>
                  {
                    {
                      student: "Student",
                      staff: "Staff",
                      owner: "Campus owner",
                    }[c.role]
                  }{" "}
                  ·{" "}
                  {
                    {
                      active: "Active",
                      pending: "Awaiting approval",
                      suspended: "Access paused",
                    }[c.status]
                  }
                </Text>
              </View>
            </View>
            {campus?.id === c.id ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="checkmark-circle" size={16} color={C.blue} />
                <Text style={[s.small, { color: C.blue, fontSize: 13 }]}>
                  Current campus
                </Text>
              </View>
            ) : (
              <Button
                secondary={campus?.id !== c.id}
                title={
                  campus?.id === c.id
                    ? "Current campus"
                    : "Switch to this campus"
                }
                onPress={() => selectCampus(c.id)}
              />
            )}
          </Card>
        ))}
        <Button
          secondary
          title="Join or register another campus"
          onPress={onAddCampus}
        />
      </Disclosure>
      <Disclosure icon="lock-closed-outline" title="Privacy and safety">
        <Button
          secondary
          title="Privacy notice"
          icon="document-text-outline"
          onPress={() =>
            void a.run(() => Linking.openURL(API_URL + "/privacy"))
          }
        />
        <Button
          secondary
          title="Support and deletion help"
          icon="help-circle-outline"
          onPress={() =>
            void a.run(() => Linking.openURL(API_URL + "/support"))
          }
        />
        <Card>
          <SummaryRow
            icon="document-text-outline"
            label="Reports"
            value="Full details stay with you and staff."
          />
          <SummaryRow
            icon="location-outline"
            label="Location"
            value="Selected people only. Latest position only."
          />
          <SummaryRow
            icon="hand-left-outline"
            label="Control"
            value="Stop sharing or remove a person anytime."
          />
          <SummaryRow
            icon="save-outline"
            label="Drafts"
            value="Saved on this device until sent or discarded."
          />
          <SummaryRow
            icon="call-outline"
            label="Urgent help"
            value="Use Help to call. SafelyGo does not dispatch responders."
          />
        </Card>
      </Disclosure>
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      <Button
        secondary
        title="Sign out and stop sharing"
        onPress={() => void a.run(logout)}
      />
      <Disclosure icon="trash-outline" title="Delete your account">
        <Card>
          <Text style={s.body}>
            Deletes your memberships, contacts and shared locations. Reports
            remain with your campus without your account identity.
          </Text>
          {ownedCampuses.length > 0 && (
            <>
              <Notice
                message={
                  "Transfer ownership of " +
                  ownedCampuses.map((c) => c.name).join(", ") +
                  " before deleting your account."
                }
              />
              <Button
                secondary
                title="Manage campus ownership"
                onPress={() => {
                  selectCampus(ownedCampuses[0].id);
                  router.navigate("/staff");
                }}
              />
            </>
          )}
          <Field
            editable={!ownedCampuses.length}
            label="Confirm your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            danger
            title="Permanently delete account"
            disabled={a.busy || !password || !!ownedCampuses.length}
            onPress={() =>
              void a.run(async () => {
                if (
                  await confirm(
                    "Delete your account permanently?",
                    "Your account cannot be recovered. Campus reports are retained without your account identity.",
                  )
                ) {
                  await api.request("/me", "DELETE", { password });
                  try {
                    await draftStorage.removeUser(user.id);
                    await Promise.all(
                      campuses.map((c) =>
                        draftStorage.remove(
                          "report-draft-" + user.id + "-" + c.id,
                        ),
                      ),
                    );
                  } finally {
                    await logout();
                  }
                }
              })
            }
          />
        </Card>
      </Disclosure>
      <Text style={s.small}>SafelyGo 1.0 · Student Campus Safety App</Text>
    </View>
  );
}
