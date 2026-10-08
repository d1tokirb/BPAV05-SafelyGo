import Text from "../components/AppText";
import React, { useState } from "react";
import { View, Switch, Linking } from "react-native";
import { useLoad, usePaged, useAction, api, confirm } from "../state";
import {
  Heading,
  Field,
  Button,
  Card,
  Chip,
  Notice,
  Busy,
  Pagination,
  s,
  C,
} from "../components/ui";
import type { Campus } from "../types";
type Application = Campus & {
  owner_name: string;
  owner_email: string;
  owner_verified: boolean;
};
export default function PlatformAdmin() {
  const access = useLoad<{ isOperator: boolean }>("/platform-info", {
    isOperator: false,
  });
  const [status, setStatus] = useState("pending");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [authority, setAuthority] = useState(false);
  const applications = usePaged<Application>(
    "/platform/campuses?status=" + status,
    100,
  );
  const action = useAction();
  if (access.loading) return <Busy />;
  if (!access.data.isOperator)
    return (
      <View style={s.page}>
        <Heading title="Platform administration" />
        <Notice
          error
          message={access.error || "Platform operator access is required."}
        />
      </View>
    );
  const campus = applications.data.find((c) => c.id === selected);
  return (
    <View style={s.page}>
      <Heading
        title="Campus review"
        subtitle="Verify institutional authority before granting campus access."
      />
      {!!applications.error && (
        <Notice
          error
          message={applications.error}
          onRetry={() => void applications.reload()}
        />
      )}
      {!!action.error && <Notice error message={action.error} />}
      {!!action.success && <Notice message={action.success} />}
      {!campus ? (
        <>
          <View style={s.row}>
            {["pending", "active", "suspended"].map((value) => (
              <Chip
                key={value}
                title={
                  {
                    pending: "Awaiting review",
                    active: "Active",
                    suspended: "Suspended",
                  }[value] || value
                }
                selected={value === status}
                onPress={() => {
                  setStatus(value);
                  setSelected(null);
                  action.clear();
                }}
              />
            ))}
          </View>
          <Field
            label="Find an institution"
            value={query}
            onChangeText={setQuery}
            placeholder="Campus name or domain"
          />
          {applications.loading && <Busy />}
          {!applications.loading &&
            !applications.data.length &&
            !applications.error && (
              <Text style={s.body}>No campuses in this queue.</Text>
            )}
          {applications.data
            .filter((c) =>
              (c.name + " " + c.domain)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((c) => (
              <Card key={c.id}>
                <Text style={s.label}>{c.name}</Text>
                <Text style={s.small}>
                  {c.domain} · {c.owner_name}
                </Text>
                <Button
                  secondary
                  title="Review campus application"
                  onPress={() => {
                    setSelected(c.id);
                    setReason("");
                    setAuthority(false);
                    action.clear();
                  }}
                />
              </Card>
            ))}
          <Pagination page={applications} />
        </>
      ) : (
        <>
          <Button
            secondary
            title="Back to review queue"
            onPress={() => setSelected(null)}
          />
          <Card>
            <Text style={s.subheading}>{campus.name}</Text>
            <Text style={s.body}>{campus.owner_name}</Text>
            <Text style={s.small}>
              {campus.owner_email} ·{" "}
              {campus.owner_verified ? "Email verified" : "Email unverified"}
            </Text>
            <Text selectable style={s.small}>
              Registration reference: {campus.id}
            </Text>
            <Button
              secondary
              title="Open official institution website"
              onPress={() =>
                void action.run(async () => {
                  await Linking.openURL(campus.website);
                })
              }
            />
          </Card>
          <Text style={s.body}>
            Verify the applicant’s authority through an independently obtained
            institutional contact. A matching email domain alone does not prove
            authority.
          </Text>
          {campus.status !== "active" && (
            <View style={s.row}>
              <Switch
                accessibilityLabel="Institutional authority independently verified"
                value={authority}
                onValueChange={setAuthority}
                trackColor={{ true: C.blue }}
              />
              <Text style={[s.label, { flex: 1 }]}>
                I independently verified institutional authority
              </Text>
            </View>
          )}
          <Field
            label="Review reason or verification reference"
            value={reason}
            onChangeText={setReason}
            multiline
            hint="At least 10 characters. Saved in the campus activity log."
            error={action.fields.reason}
          />
          <Button
            title={
              campus.status === "pending"
                ? "Approve campus"
                : campus.status === "active"
                  ? "Suspend campus access"
                  : "Reactivate campus"
            }
            danger={campus.status === "active"}
            disabled={
              action.busy ||
              reason.trim().length < 10 ||
              (campus.status !== "active" && !authority)
            }
            onPress={() =>
              void action.run(async () => {
                const reviewAction =
                  campus.status === "pending"
                    ? "approve"
                    : campus.status === "active"
                      ? "suspend"
                      : "reactivate";
                if (
                  !(await confirm(
                    "Save this campus decision?",
                    "This changes access for the institution and emails its owner. Your review reason is recorded.",
                    "Save decision",
                  ))
                )
                  return;
                await api.request(
                  "/platform/campuses/" + campus.id + "/review",
                  "POST",
                  {
                    action: reviewAction,
                    reason,
                    authorityConfirmed: authority,
                  },
                );
                await applications.reload();
                setSelected(null);
              }, "Review saved. The owner has been notified through the email queue.")
            }
          />
        </>
      )}
    </View>
  );
}
