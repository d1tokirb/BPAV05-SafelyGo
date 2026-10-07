import Text from "../components/AppText";
import React, { useState } from "react";
import { View, Share, Linking } from "react-native";
import { useApp, useLoad, usePaged, useAction, api, confirm } from "../state";
import {
  Pagination,
  FocusPressable,
  ActionRow,
  SummaryRow,
  Busy,
  Heading,
  Card,
  Field,
  Button,
  Notice,
  Chip,
  s,
  C,
  Disclosure,
} from "../components/ui";
import { useFormDraft } from "../useFormDraft";
import CampusPlaceSearch from "../components/CampusPlaceSearch";
import SafetyMap from "../components/SafetyMap";
import type {
  Report,
  DirectoryContact,
  Member,
  CampusAlert,
  Audit,
} from "../types";
function ReportEditor({
  report,
  base,
  onSaved,
}: {
  report: Report;
  base: string;
  onSaved: () => Promise<void>;
}) {
  const { user } = useApp();
  const [status, setStatus] = useState(report.status);
  const [summary, setSummary] = useState(report.public_summary || "");
  const [note, setNote] = useState(report.staff_note || "");
  const a = useAction();
  const draft = useFormDraft(
    "staff-report-" + user.id + "-" + base.split("/").pop() + "-" + report.id,
    { status, summary, note },
    (value) => {
      setStatus(value.status);
      setSummary(value.summary);
      setNote(value.note);
    },
  );
  if (!draft.ready) return <Busy />;
  return (
    <Card>
      {!!draft.error && <Notice error message={draft.error} />}
      <Text style={s.subheading}>{report.title}</Text>
      <Text style={s.body}>{report.description}</Text>
      <Text style={s.small}>
        {
          (
            {
              lighting: "Poor lighting",
              hazard: "Hazard",
              suspicious: "Suspicious activity",
              harassment: "Harassment",
              theft: "Theft",
              other: "Other concern",
            } as Record<string, string>
          )[report.category]
        }{" "}
        /{" "}
        {
          (
            {
              low: "Minor",
              medium: "Needs attention",
              high: "Serious",
            } as Record<string, string>
          )[report.severity]
        }{" "}
        • {new Date(report.created_at).toLocaleString()}
      </Text>
      <SafetyMap
        latitude={report.latitude}
        longitude={report.longitude}
        radius={0}
        height={180}
        pins={[
          {
            id: report.id,
            latitude: report.latitude,
            longitude: report.longitude,
            title: report.title,
          },
        ]}
      />
      <View style={s.row}>
        {["submitted", "reviewing", "resolved", "dismissed"].map((v) => (
          <Chip
            key={v}
            title={
              {
                submitted: "Received",
                reviewing: "Reviewing",
                resolved: "Resolved",
                dismissed: "Closed",
              }[v] || v
            }
            selected={status === v}
            onPress={() => setStatus(v)}
          />
        ))}
      </View>
      <Field
        label="Public map summary (leave empty to keep private)"
        value={summary}
        onChangeText={setSummary}
        multiline
        maxLength={500}
      />
      <Text style={s.small}>
        Publish only non-identifying information. The public sees this summary
        instead of the student’s title and description.
      </Text>
      <Field
        label="Internal staff note"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={2000}
      />
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      <Button
        title="Save report review"
        disabled={a.busy || !draft.ready}
        onPress={() =>
          void a.run(async () => {
            await api.request(base + "/reports/" + report.id, "PATCH", {
              status,
              publicSummary: summary || null,
              staffNote: note,
            });
            await draft.clear();
            await onSaved();
          }, "Report updated.")
        }
      />
    </Card>
  );
}
function ContactEditor({
  contact,
  base,
  onSaved,
}: {
  contact?: DirectoryContact;
  base: string;
  onSaved: () => Promise<void>;
}) {
  const { user } = useApp();
  const [name, setName] = useState(contact?.name || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [description, setDescription] = useState(contact?.description || "");
  const a = useAction();
  const draft = useFormDraft(
    "staff-directory-" +
      user.id +
      "-" +
      base.split("/").pop() +
      "-" +
      (contact?.id || "new"),
    { name, phone, description },
    (value) => {
      setName(value.name);
      setPhone(value.phone);
      setDescription(value.description);
    },
  );
  if (!draft.ready) return <Busy />;
  return (
    <Card>
      {!!draft.error && <Notice error message={draft.error} />}
      <Field
        label="Contact name"
        error={a.fields.name}
        value={name}
        onChangeText={setName}
      />
      <Field
        label="Telephone number (include country code where needed)"
        error={a.fields.phone}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Field
        label="Description / availability"
        error={a.fields.description}
        value={description}
        onChangeText={setDescription}
      />
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      <Button
        title={contact ? "Update contact" : "Add directory contact"}
        disabled={a.busy}
        onPress={() =>
          void a.run(async () => {
            await api.request(
              base + "/directory" + (contact ? "/" + contact.id : ""),
              contact ? "PATCH" : "POST",
              { name, phone, description, priority: contact?.priority || 10 },
            );
            await draft.clear();
            if (!contact) {
              setName("");
              setPhone("");
              setDescription("");
            }
            await onSaved();
          }, "Directory saved.")
        }
      />
      {contact && (
        <Button
          secondary
          title="Remove directory contact"
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              if (
                await confirm(
                  "Remove " + contact.name + "?",
                  "Students will no longer see this number.",
                )
              ) {
                await api.request(base + "/directory/" + contact.id, "DELETE");
                await onSaved();
              }
            })
          }
        />
      )}
    </Card>
  );
}
export default function Staff() {
  const { user, campus, refresh } = useApp();
  const base = "/campuses/" + campus!.id;
  const [sectionPicker, setSectionPicker] = useState(false);
  const [tab, setTab] = useState(
    campus!.status === "pending"
      ? campus!.role === "owner"
        ? "Settings"
        : "Directory"
      : "Reports",
  );
  const reports = usePaged<Report>(base + "/reports", 200);
  const directory = useLoad<DirectoryContact[]>(base + "/directory", []);
  const members = usePaged<Member>(base + "/members", 500);
  const alerts = useLoad<CampusAlert[]>(base + "/alerts", []);
  const audit = usePaged<Audit>(base + "/audit", 100);
  const platform = useLoad<{ supportEmail: string; approvalSteps: string[] }>(
    "/platform-info",
    { supportEmail: "", approvalSteps: [] },
  );
  const a = useAction();
  const [name, setName] = useState(campus!.name);
  const [website, setWebsite] = useState(campus!.website);
  const [latitude, setLatitude] = useState(String(campus!.latitude));
  const [longitude, setLongitude] = useState(String(campus!.longitude));
  const [radius, setRadius] = useState(String(campus!.radius_m));
  const [emergencyPhone, setEmergencyPhone] = useState(
    campus!.emergency_phone || "",
  );
  const [supportEmail, setSupportEmail] = useState(campus!.support_email || "");
  const [transferMember, setTransferMember] = useState("");
  const [transferPassword, setTransferPassword] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertBody, setAlertBody] = useState("");
  const [previewTime, setPreviewTime] = useState(() => Date.now());
  const [hours, setHours] = useState("24");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const refreshAudit = async () => {
    await audit.reload();
  };
  const settingsDraft = useFormDraft(
    "staff-settings-" + user.id + "-" + campus!.id,
    {
      name,
      website,
      latitude,
      longitude,
      radius,
      emergencyPhone,
      supportEmail,
      alertTitle,
      alertBody,
      hours,
    },
    (value) => {
      setName(value.name);
      setWebsite(value.website);
      setLatitude(value.latitude);
      setLongitude(value.longitude);
      setRadius(value.radius);
      setEmergencyPhone(value.emergencyPhone);
      setSupportEmail(value.supportEmail);
      setAlertTitle(value.alertTitle);
      setAlertBody(value.alertBody);
      setHours(value.hours);
    },
  );
  const isOwner = campus!.role === "owner";
  if (!settingsDraft.ready) return <Busy />;
  return (
    <View style={s.page}>
      <Heading title="Campus staff" />
      {campus!.status === "suspended" && (
        <Notice
          message={
            "Campus " +
            campus!.status +
            ". Directory and campus setup are available; public activity requires activation."
          }
        />
      )}
      {campus!.status === "pending" && (
        <Card>
          <Text style={s.label}>Your registration is in review</Text>
          <SummaryRow
            icon="checkmark-circle-outline"
            label="Received"
            value={
              campus!.created_at
                ? new Date(campus!.created_at).toLocaleDateString()
                : "Registration saved"
            }
          />
          <SummaryRow
            icon="shield-checkmark-outline"
            label="Next"
            value="Campus authority review"
          />
          <Text style={s.small}>We’ll email the activation decision.</Text>
          <Disclosure title="Registration details and support">
            <Text selectable style={s.small}>
              Registration reference: {campus!.id}
            </Text>
            {!!platform.data.supportEmail && (
              <Button
                secondary
                title="Contact registration support"
                onPress={() =>
                  void a.run(async () => {
                    await Linking.openURL(
                      "mailto:" +
                        platform.data.supportEmail +
                        "?subject=" +
                        encodeURIComponent("Campus registration " + campus!.id),
                    );
                  })
                }
              />
            )}
            {!platform.data.supportEmail && (
              <Text style={s.small}>
                No support address is configured. Keep this reference for
                follow-up.
              </Text>
            )}
          </Disclosure>
        </Card>
      )}
      <Button
        secondary
        title={"Staff section: " + tab}
        icon={sectionPicker ? "chevron-up" : "chevron-down"}
        onPress={() => setSectionPicker(!sectionPicker)}
      />
      {sectionPicker && (
        <Card style={{ padding: 0 }}>
          {[
            {
              key: "Reports",
              title: "Reports",
              subtitle: "Review campus concerns",
              icon: "flag-outline" as const,
            },
            {
              key: "Directory",
              title: "Help contacts",
              subtitle: "Phone numbers students can call",
              icon: "call-outline" as const,
            },
            {
              key: "Updates",
              title: "Campus updates",
              subtitle: "Post an in-app announcement",
              icon: "megaphone-outline" as const,
            },
            {
              key: "Members",
              title: "People",
              subtitle: "Manage student and staff access",
              icon: "people-outline" as const,
            },
            {
              key: "Audit",
              title: "Activity log",
              subtitle: "Review staff changes",
              icon: "list-outline" as const,
            },
            ...(isOwner
              ? [
                  {
                    key: "Settings",
                    title: "Campus settings",
                    subtitle: "Invitation codes, boundary and support",
                    icon: "settings-outline" as const,
                  },
                ]
              : []),
          ].map((section, index, sections) => (
            <ActionRow
              key={section.key}
              title={section.title}
              subtitle={section.subtitle}
              icon={section.icon}
              last={index === sections.length - 1}
              onPress={() => {
                setTab(section.key);
                setSectionPicker(false);
                setSelectedReport(null);
                setSearch("");
                a.clear();
              }}
            />
          ))}
        </Card>
      )}
      {!!settingsDraft.error && <Notice error message={settingsDraft.error} />}
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      {tab === "Reports" && (
        <>
          {!!reports.error && (
            <Notice
              error
              message={reports.error}
              onRetry={() => void reports.reload()}
            />
          )}
          {!reports.loading && !reports.error && !reports.data.length && (
            <Text style={s.body}>No campus reports yet.</Text>
          )}
          {!selectedReport && (
            <>
              <Field
                label="Search reports"
                value={search}
                onChangeText={setSearch}
                placeholder="Title or description"
              />
              <View style={s.row}>
                {["active", "submitted", "reviewing", "resolved", "all"].map(
                  (status) => (
                    <Chip
                      key={status}
                      title={
                        {
                          active: "Open queue",
                          submitted: "New",
                          reviewing: "Reviewing",
                          resolved: "Resolved",
                          all: "All",
                        }[status] || status
                      }
                      selected={statusFilter === status}
                      onPress={() => setStatusFilter(status)}
                    />
                  ),
                )}
              </View>
              <Text style={s.small}>
                {
                  reports.data.filter((r) =>
                    ["submitted", "reviewing"].includes(r.status),
                  ).length
                }{" "}
                concerns awaiting completion
              </Text>
            </>
          )}
          {reports.data
            .filter(
              (r) =>
                (!selectedReport || r.id === selectedReport) &&
                (statusFilter === "all" ||
                  (statusFilter === "active"
                    ? ["submitted", "reviewing"].includes(r.status)
                    : r.status === statusFilter)) &&
                (r.title + " " + r.description)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((r) =>
              selectedReport === r.id ? (
                <View key={r.id} style={{ gap: 12 }}>
                  <Button
                    secondary
                    title="Close report details"
                    onPress={() => setSelectedReport(null)}
                  />
                  <ReportEditor
                    report={r}
                    base={base}
                    onSaved={async () => {
                      await reports.reload();
                      await refreshAudit();
                    }}
                  />
                </View>
              ) : (
                <FocusPressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={"Review " + r.title}
                  onPress={() => {
                    setSelectedReport(r.id);
                  }}
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: C.line,
                    borderLeftWidth: r.severity === "high" ? 3 : 1,
                    borderLeftColor: r.severity === "high" ? C.red : C.line,
                    backgroundColor: pressed ? C.mint : C.white,
                    borderRadius: 12,
                    padding: 16,
                    gap: 8,
                  })}
                >
                  <Text style={s.label}>{r.title}</Text>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <Text style={s.small}>
                      {r.status === "submitted"
                        ? "New report"
                        : r.status === "reviewing"
                          ? "Staff reviewing"
                          : r.status === "dismissed"
                            ? "Closed"
                            : "Resolved"}
                    </Text>
                    <Text style={s.small}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {r.severity === "high" && (
                    <Text style={[s.small, { color: C.red }]}>
                      Serious concern
                    </Text>
                  )}
                </FocusPressable>
              ),
            )}
        </>
      )}
      {tab === "Directory" && (
        <>
          {!!directory.error && (
            <Notice
              error
              message={directory.error}
              onRetry={() => void directory.reload()}
            />
          )}
          {directory.data.map((c) => (
            <Disclosure key={c.id} title={c.name + " · " + c.phone}>
              <ContactEditor
                contact={c}
                base={base}
                onSaved={async () => {
                  await directory.reload();
                  await refreshAudit();
                }}
              />
            </Disclosure>
          ))}
          <Disclosure title="Add a contact">
            <ContactEditor
              base={base}
              onSaved={async () => {
                await directory.reload();
                await refreshAudit();
              }}
            />
          </Disclosure>
        </>
      )}
      {tab === "Updates" && (
        <>
          {!!alerts.error && (
            <Notice
              error
              message={alerts.error}
              onRetry={() => void alerts.reload()}
            />
          )}
          <Card>
            <Field
              label="Announcement title"
              error={a.fields.title}
              value={alertTitle}
              onChangeText={setAlertTitle}
            />
            <Field
              label="Announcement message"
              error={a.fields.body}
              value={alertBody}
              onChangeText={setAlertBody}
              multiline
            />
            <Text style={s.label}>Keep visible for</Text>
            <View style={s.row}>
              {[6, 24, 72, 168].map((h) => (
                <Chip
                  key={h}
                  title={
                    h < 24
                      ? h + " hours"
                      : h / 24 + (h === 24 ? " day" : " days")
                  }
                  selected={hours === String(h)}
                  onPress={() => {
                    setHours(String(h));
                    setPreviewTime(Date.now());
                  }}
                />
              ))}
            </View>
            {!!alertTitle.trim() && (
              <Card>
                <Text style={s.small}>Announcement preview</Text>
                <Text style={s.label}>{alertTitle}</Text>
                <Text style={s.body}>
                  {alertBody || "Your message will appear here."}
                </Text>
                <Text style={s.small}>
                  Visible until{" "}
                  {new Date(
                    previewTime + Number(hours) * 3600000,
                  ).toLocaleString()}
                </Text>
              </Card>
            )}
            <Text style={s.small}>
              Appears in members’ Campus updates. This does not send an
              emergency dispatch or push notification.
            </Text>
            <Button
              title="Publish campus announcement"
              disabled={
                a.busy ||
                campus!.status !== "active" ||
                alertTitle.trim().length < 3 ||
                alertBody.trim().length < 10
              }
              onPress={() =>
                void a.run(async () => {
                  await api.request(base + "/alerts", "POST", {
                    title: alertTitle,
                    body: alertBody,
                    hours: Number(hours),
                  });
                  setAlertTitle("");
                  setAlertBody("");
                  await alerts.reload();
                  await refreshAudit();
                }, "Announcement published.")
              }
            />
          </Card>
          {alerts.data.map((v) => (
            <Card key={v.id}>
              <Text style={s.label}>{v.title}</Text>
              <Text style={s.body}>{v.body}</Text>
              <Button
                secondary
                title="Remove announcement"
                onPress={() =>
                  void a.run(async () => {
                    if (
                      await confirm(
                        "Remove announcement?",
                        "It will disappear from campus updates.",
                      )
                    ) {
                      await api.request(base + "/alerts/" + v.id, "DELETE");
                      await alerts.reload();
                      await refreshAudit();
                    }
                  })
                }
              />
            </Card>
          ))}
        </>
      )}
      {tab === "Members" && (
        <>
          {!!members.error && (
            <Notice
              error
              message={members.error}
              onRetry={() => void members.reload()}
            />
          )}
          <Notice message="Only the campus owner can assign staff roles. Staff never gain access to private location sharing through their role." />
          <Field
            label="Find a member"
            value={search}
            onChangeText={setSearch}
            placeholder="Name or email"
          />
          {members.data
            .filter((m) =>
              (m.name + " " + m.email)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((m) => (
              <Card key={m.id}>
                <Text style={s.label}>{m.name}</Text>
                <Text style={s.small}>{m.email}</Text>
                <Chip title={m.role} />
                {isOwner && m.role !== "owner" && (
                  <Disclosure title="Manage member access">
                    <Button
                      secondary
                      title={m.role === "staff" ? "Make student" : "Make staff"}
                      disabled={a.busy || campus!.status !== "active"}
                      onPress={() =>
                        void a.run(async () => {
                          const role = m.role === "staff" ? "student" : "staff";
                          if (
                            await confirm(
                              "Change " + m.name + " to " + role + "?",
                              "Staff can read student reports and manage the directory.",
                            )
                          ) {
                            await api.request(
                              base + "/members/" + m.id,
                              "PATCH",
                              { role },
                            );
                            await members.reload();
                          }
                        }, "Role updated.")
                      }
                    />
                    <Button
                      secondary
                      title="Remove campus member"
                      disabled={a.busy}
                      onPress={() =>
                        void a.run(async () => {
                          if (
                            await confirm(
                              "Remove " + m.name + "?",
                              "This revokes their campus access.",
                            )
                          ) {
                            await api.request(
                              base + "/members/" + m.id,
                              "DELETE",
                            );
                            await members.reload();
                          }
                        })
                      }
                    />
                  </Disclosure>
                )}
              </Card>
            ))}
        </>
      )}
      {tab === "Audit" && (
        <>
          {!!audit.error && (
            <Notice
              error
              message={audit.error}
              onRetry={() => void audit.reload()}
            />
          )}
          {!audit.data.length && (
            <Text style={s.body}>Staff changes will appear here.</Text>
          )}
          <Field
            label="Search activity"
            value={search}
            onChangeText={setSearch}
            placeholder="Action, report or staff name"
          />
          {audit.data
            .filter((v) =>
              (
                v.action +
                " " +
                (v.actor_name || v.operator_name || "") +
                " " +
                (v.details?.title || "")
              )
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((v) => (
              <Card key={v.id}>
                <Text style={s.label}>
                  {(
                    {
                      "campus.owner_transferred":
                        "Campus ownership transferred",
                      "member.staff": "Staff access granted",
                      "member.student": "Staff access removed",
                      "report.updated": "Report review saved",
                      "directory.created": "Directory contact added",
                      "directory.updated": "Directory contact updated",
                      "directory.deleted": "Directory contact removed",
                      "campus.updated": "Campus settings updated",
                      "campus.invitation_rotated":
                        "Student invitation code replaced",
                      "member.updated": "Member permissions changed",
                      "member.removed": "Member access removed",
                      "alert.created": "Announcement published",
                      "alert.deleted": "Announcement removed",
                      "platform.approve": "Campus approved",
                      "platform.suspend": "Campus suspended",
                      "platform.reactivate": "Campus reactivated",
                      "platform.transfer": "Campus ownership transferred",
                    } as Record<string, string>
                  )[v.action] || v.action}
                </Text>
                <Text style={s.small}>
                  {v.actor_name || v.operator_name || "Platform operator"} ·{" "}
                  {new Date(v.created_at).toLocaleString()}
                </Text>
                {!!v.details?.title && (
                  <Text style={s.body}>{v.details.title}</Text>
                )}
                {Object.entries(v.details?.changes || {}).map(
                  ([field, change]) => (
                    <Text key={field} style={s.small}>
                      {(
                        {
                          status: "Status",
                          public_summary: "Public summary",
                          staff_note: "Staff note",
                        } as Record<string, string>
                      )[field] || field}
                      :{" "}
                      {field === "status"
                        ? (
                            {
                              submitted: "Received",
                              reviewing: "Staff reviewing",
                              resolved: "Resolved",
                              dismissed: "Closed",
                            } as Record<string, string>
                          )[change.from || ""] ||
                          change.from ||
                          "Empty"
                        : change.from || "Empty"}{" "}
                      →{" "}
                      {field === "status"
                        ? (
                            {
                              submitted: "Received",
                              reviewing: "Staff reviewing",
                              resolved: "Resolved",
                              dismissed: "Closed",
                            } as Record<string, string>
                          )[change.to || ""] ||
                          change.to ||
                          "Empty"
                        : change.to || "Empty"}
                    </Text>
                  ),
                )}
                {!!v.review_note && <Text style={s.body}>{v.review_note}</Text>}
              </Card>
            ))}
        </>
      )}
      {tab === "Settings" && (
        <>
          <Disclosure title="Student invitation code">
            <Card>
              <Text style={s.subheading}>Invite students</Text>
              <Text selectable style={s.label}>
                {campus!.join_code}
              </Text>
              <Text style={s.body}>
                Share this with your students. They can use their regular email
                address and must verify it before joining.
              </Text>
              <Button
                secondary
                title="Share campus invitation"
                onPress={() =>
                  void a.run(async () => {
                    await Share.share({
                      message: `Join ${campus!.name} in SafelyGo using your regular email address and invitation code ${campus!.join_code}.`,
                    });
                  })
                }
              />
              <Button
                secondary
                title="Replace invitation code"
                disabled={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    if (
                      await confirm(
                        "Replace invitation code?",
                        "The previous code will stop working.",
                      )
                    ) {
                      await api.request(base + "/rotate-code", "POST");
                      await refresh();
                    }
                  }, "Invitation code replaced.")
                }
              />
            </Card>
          </Disclosure>
          <Card>
            <Field
              label="Campus name"
              error={a.fields.name}
              value={name}
              onChangeText={setName}
            />
            <Field
              label="Official HTTPS website"
              error={a.fields.website}
              value={website}
              onChangeText={setWebsite}
            />
            <Field
              label="Local emergency number"
              error={a.fields.emergencyPhone}
              hint="Confirm the correct number for this campus. Include a country code where appropriate."
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
            />
            <Field
              label="Campus support email"
              error={a.fields.supportEmail}
              hint="Students can contact this address for join codes and account assistance."
              value={supportEmail}
              onChangeText={setSupportEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Disclosure
              title={"Edit campus boundary · " + Number(radius) / 1000 + " km"}
            >
              <CampusPlaceSearch
                onSelect={(lat, lng) => {
                  setLatitude(String(lat));
                  setLongitude(String(lng));
                }}
              />
              <Text style={s.label}>Campus boundary</Text>
              <Text style={s.small}>
                Tap the map to move the campus center. Choose how far the campus
                extends from that point.
              </Text>
              <SafetyMap
                latitude={Number(latitude)}
                longitude={Number(longitude)}
                radius={Number(radius)}
                onSelect={(lat, lng) => {
                  setLatitude(String(lat));
                  setLongitude(String(lng));
                }}
                pins={[
                  {
                    id: "center",
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    title: "Campus center",
                  },
                ]}
                height={240}
              />
              <View style={s.row}>
                {[500, 1000, 1500, 3000, 5000].map((m) => (
                  <Chip
                    key={m}
                    title={m < 1000 ? m + " m" : m / 1000 + " km"}
                    selected={radius === String(m)}
                    onPress={() => setRadius(String(m))}
                  />
                ))}
              </View>
            </Disclosure>
            <Button
              title="Save campus settings"
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  await api.request(base, "PATCH", {
                    name,
                    website,
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    radiusM: Number(radius),
                    emergencyPhone,
                    supportEmail,
                  });
                  await refresh();
                }, "Campus settings saved.")
              }
            />
          </Card>
          <Disclosure title="Transfer campus ownership">
            <Card>
              <Text style={s.body}>
                Choose a verified campus staff member. They will manage settings
                and staff access. You will remain staff and can then leave or
                delete your account.
              </Text>
              {members.data
                .filter((m) => m.role === "staff")
                .map((m) => (
                  <Chip
                    key={m.id}
                    title={m.name + " · " + m.email}
                    selected={transferMember === m.id}
                    onPress={() => setTransferMember(m.id)}
                  />
                ))}
              {!members.data.some((m) => m.role === "staff") && (
                <Notice message="First assign your successor a staff role in Members." />
              )}
              <Field
                label="Your password to confirm transfer"
                value={transferPassword}
                onChangeText={setTransferPassword}
                secureTextEntry
              />
              <Button
                title="Transfer ownership"
                disabled={a.busy || !transferMember || !transferPassword}
                onPress={() =>
                  void a.run(async () => {
                    if (
                      !(await confirm(
                        "Transfer campus ownership?",
                        "Your successor will control campus settings and staff access. You will become staff.",
                      ))
                    )
                      return;
                    await api.request(base + "/transfer-ownership", "POST", {
                      memberId: transferMember,
                      password: transferPassword,
                    });
                    setTransferPassword("");
                    await refresh();
                  }, "Campus ownership transferred.")
                }
              />
            </Card>
          </Disclosure>
        </>
      )}
      {tab === "Reports" && <Pagination page={reports} />}
      {tab === "Members" && <Pagination page={members} />}
      {tab === "Audit" && <Pagination page={audit} />}
    </View>
  );
}
