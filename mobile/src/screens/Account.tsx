import Text from "../components/AppText";
import { router } from "expo-router";
import React, { useState } from "react";
import { View, Linking, StyleSheet } from "react-native";
import { API_URL } from "../api";
import { Ionicons } from "@expo/vector-icons";
import { draftStorage } from "../drafts";
import { useApp, useAction, useLoad, api, confirm } from "../state";
import {
  Heading,
  SummaryRow,
  ActionRow,
  ListGroup,
  SectionLabel,
  Reveal,
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
  const roleName = { student: "Student", staff: "Staff", owner: "Campus owner" };
  const statusName = {
    active: "Active",
    pending: "Awaiting approval",
    suspended: "Access paused",
  };
  return (
    <View style={s.page}>
      <Heading title="Settings" />
      <Reveal index={0}>
        <View style={acct.profile}>
          <View style={acct.avatar}>
            <Text style={acct.avatarText}>
              {user.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={2} style={acct.name}>
              {user.name}
            </Text>
            <Text numberOfLines={1} style={s.small}>
              {user.email}
            </Text>
            {!!campus && (
              <Text numberOfLines={1} style={[s.small, { color: C.blue }]}>
                {roleName[campus.role]} · {campus.name}
              </Text>
            )}
          </View>
        </View>
      </Reveal>
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      {platform.data.isOperator && (
        <>
          <SectionLabel>Platform</SectionLabel>
          <ListGroup>
            <ActionRow
              last
              icon="shield-checkmark-outline"
              title="Platform campus review"
              subtitle="Approve or reject campus requests"
              onPress={() => router.navigate("/platform")}
            />
          </ListGroup>
        </>
      )}
      <SectionLabel>Profile</SectionLabel>
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
      <SectionLabel>Campuses</SectionLabel>
      <ListGroup>
        {campuses.map((c) => {
          const current = campus?.id === c.id;
          return (
            <ActionRow
              key={c.id}
              icon="school-outline"
              title={c.name}
              subtitle={roleName[c.role] + " · " + statusName[c.status]}
              selected={current}
              onPress={() => {
                if (!current) selectCampus(c.id);
              }}
              trailing={
                current ? (
                  <View style={acct.currentPill}>
                    <Ionicons name="checkmark" size={14} color={C.blue} />
                    <Text style={acct.currentText}>Current</Text>
                  </View>
                ) : (
                  <Text style={acct.switchText}>Switch</Text>
                )
              }
            />
          );
        })}
        <ActionRow
          last
          icon="add-circle-outline"
          title="Join or register a campus"
          onPress={onAddCampus}
        />
      </ListGroup>
      <SectionLabel>Privacy and safety</SectionLabel>
      <ListGroup>
        <ActionRow
          external
          icon="document-text-outline"
          title="Privacy notice"
          subtitle="Full policy, in your browser"
          onPress={() =>
            void a.run(() => Linking.openURL(API_URL + "/privacy"))
          }
        />
        <ActionRow
          last
          external
          icon="help-circle-outline"
          title="Get support"
          subtitle="Help if you can’t sign in or delete in the app"
          onPress={() =>
            void a.run(() => Linking.openURL(API_URL + "/support"))
          }
        />
      </ListGroup>
      <Disclosure
        icon="information-circle-outline"
        title="How SafelyGo uses your data"
      >
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
      <SectionLabel>Account</SectionLabel>
      <ListGroup>
        <ActionRow
          last
          icon="log-out-outline"
          title="Sign out"
          subtitle="Also stops any location sharing"
          disabled={a.busy}
          onPress={() => void a.run(logout)}
        />
      </ListGroup>
      <Disclosure danger icon="trash-outline" title="Delete your account">
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
                    "Delete account",
                    true,
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
      <Text style={[s.small, { textAlign: "center", marginTop: 8 }]}>
        SafelyGo 1.0 · Student Campus Safety App
      </Text>
    </View>
  );
}

const acct = StyleSheet.create({
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: C.white, fontSize: 24, lineHeight: 30, fontWeight: "700" },
  name: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: C.ink },
  currentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.mint,
  },
  currentText: { fontSize: 12, fontWeight: "700", color: C.blue },
  switchText: { fontSize: 14, fontWeight: "700", color: C.blue },
});
