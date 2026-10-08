import Text from "../components/AppText";
import React, { useState } from "react";
import { View, Share, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp, useLoad, usePaged, useAction, api, confirm } from "../state";
import {
  Pagination,
  FocusPressable,
  ListGroup,
  SummaryRow,
  Busy,
  Heading,
  Card,
  Field,
  Button,
  Notice,
  Chip,
  Segmented,
  EmptyState,
  SectionLabel,
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
const STATUS_NAME: Record<string, string> = {
  submitted: "New",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Closed",
};
const CATEGORY_NAME: Record<string, string> = {
  lighting: "Poor lighting",
  hazard: "Hazard",
  suspicious: "Suspicious activity",
  harassment: "Harassment",
  theft: "Theft",
  other: "Other concern",
};
const SEVERITY_NAME: Record<string, string> = {
  low: "Minor",
  medium: "Needs attention",
  high: "Serious",
};
const initialsOf = (name: string) =>
  name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function StatusTag({ status }: { status: string }) {
  const open = status === "submitted" || status === "reviewing";
  return (
    <View
      accessible
      accessibilityLabel={"Status: " + (STATUS_NAME[status] || status)}
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor:
          status === "submitted" ? C.blue : open ? C.mint : "#EEF1F6",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: status === "submitted" ? C.white : open ? C.blue : C.muted,
        }}
      >
        {STATUS_NAME[status] || status}
      </Text>
    </View>
  );
}

function ReportEditor({
  report,
  base,
  onSaved,
  onClose,
}: {
  report: Report;
  base: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
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
  const dirty =
    status !== report.status ||
    summary !== (report.public_summary || "") ||
    note !== (report.staff_note || "");
  const publishing =
    !!summary.trim() && summary !== (report.public_summary || "");
  return (
    <View style={{ gap: 14 }}>
      <FocusPressable
        accessibilityRole="button"
        accessibilityLabel="Back to report queue"
        onPress={onClose}
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          alignSelf: "flex-start",
        }}
      >
        <Ionicons name="chevron-back" size={20} color={C.blue} />
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.blue }}>
          Report queue
        </Text>
      </FocusPressable>
      {!!draft.error && <Notice error message={draft.error} />}
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <StatusTag status={report.status} />
          {report.severity === "high" && (
            <Text style={[s.small, { color: C.red, fontWeight: "700" }]}>
              Serious concern
            </Text>
          )}
        </View>
        <Text style={s.subheading}>{report.title}</Text>
        <Text style={s.small}>
          {CATEGORY_NAME[report.category] || report.category} ·{" "}
          {SEVERITY_NAME[report.severity] || report.severity} ·{" "}
          {new Date(report.created_at).toLocaleString()}
        </Text>
        <Text style={s.body}>{report.description}</Text>
      </Card>
      <Disclosure icon="location-outline" title="Location">
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
      </Disclosure>
      <SectionLabel>Review status</SectionLabel>
      <Segmented
        label="Review status"
        value={status}
        onChange={setStatus}
        options={[
          { key: "submitted", title: "New" },
          { key: "reviewing", title: "Reviewing" },
          { key: "resolved", title: "Resolved" },
          { key: "dismissed", title: "Closed" },
        ]}
      />
      <Disclosure
        icon="megaphone-outline"
        title={
          summary.trim()
            ? "Public map summary (published)"
            : "Public map summary"
        }
        initiallyOpen={!!summary}
      >
        <Field
          label="What the public map shows"
          hint="Leave empty to keep this report private. Publish only non-identifying information; the public sees this instead of the student’s title and description."
          value={summary}
          onChangeText={setSummary}
          multiline
          maxLength={500}
        />
      </Disclosure>
      <Disclosure
        icon="lock-closed-outline"
        title="Internal staff note"
        initiallyOpen={!!note}
      >
        <Field
          label="Visible to campus staff only"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={2000}
        />
      </Disclosure>
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      {publishing && (
        <Notice message="Saving will publish this summary on the campus map." />
      )}
      <Button
        title={
          a.busy
            ? "Saving…"
            : publishing
              ? "Save and publish summary"
              : "Save review"
        }
        disabled={a.busy || !draft.ready || !dirty}
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
    </View>
  );
}
function SectionTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: string; title: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <FocusPressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.title}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => onChange(tab.key)}
            style={{
              minHeight: 44,
              flexBasis: "30%",
              flexGrow: 1,
              alignItems: "center",
              paddingHorizontal: 8,
              borderRadius: 22,
              justifyContent: "center",
              backgroundColor: selected ? C.blue : C.white,
              borderWidth: 1,
              borderColor: selected ? C.blue : C.line,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                textAlign: "center",
                color: selected ? C.white : C.ink,
              }}
            >
              {tab.title}
            </Text>
          </FocusPressable>
        );
      })}
    </View>
  );
}
function MemberRow({
  member,
  manageable,
  roleDisabled,
  removeDisabled,
  last,
  onToggleRole,
  onRemove,
}: {
  member: Member;
  manageable: boolean;
  roleDisabled: boolean;
  removeDisabled: boolean;
  last: boolean;
  onToggleRole: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const role = member.role.charAt(0).toUpperCase() + member.role.slice(1);
  return (
    <View
      style={{
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
      }}
    >
      <FocusPressable
        accessibilityRole={manageable ? "button" : "text"}
        accessibilityLabel={member.name + ", " + role}
        accessibilityState={manageable ? { expanded: open } : undefined}
        disabled={!manageable}
        onPress={() => setOpen(!open)}
        style={({ pressed }) => ({
          minHeight: 60,
          paddingVertical: 10,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: pressed ? C.mint : C.white,
        })}
      >
        <View
          aria-hidden
          accessible={false}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: C.mint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.blue }}>
            {initialsOf(member.name)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text numberOfLines={1} style={s.label}>
            {member.name}
          </Text>
          <Text numberOfLines={1} style={s.small}>
            {member.email}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: member.role === "student" ? C.muted : C.blue,
            backgroundColor: member.role === "student" ? "#EEF1F6" : C.mint,
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {role}
        </Text>
        {manageable && (
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={C.muted}
          />
        )}
      </FocusPressable>
      {open && manageable && (
        <View
          style={{ flexDirection: "row", gap: 10, padding: 16, paddingTop: 4 }}
        >
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title={member.role === "staff" ? "Make student" : "Make staff"}
              disabled={roleDisabled}
              onPress={onToggleRole}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              danger
              title="Remove"
              disabled={removeDisabled}
              onPress={onRemove}
            />
          </View>
        </View>
      )}
    </View>
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
                  "Remove contact",
                  true,
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
  const { user, campus, refresh, scrollToTop } = useApp();
  const base = "/campuses/" + campus!.id;
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
          <Disclosure
            icon="information-circle-outline"
            title="Registration details and support"
          >
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
      <SectionTabs
        tabs={[
          { key: "Reports", title: "Reports" },
          { key: "Directory", title: "Help contacts" },
          { key: "Updates", title: "Campus updates" },
          { key: "Members", title: "People" },
          { key: "Audit", title: "Activity log" },
          ...(isOwner ? [{ key: "Settings", title: "Campus settings" }] : []),
        ]}
        value={tab}
        onChange={(key) => {
          setTab(key);
          setSelectedReport(null);
          setSearch("");
          a.clear();
          scrollToTop();
        }}
      />
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
          {selectedReport &&
          reports.data.some((r) => r.id === selectedReport) ? (
            <ReportEditor
              key={selectedReport}
              report={reports.data.find((r) => r.id === selectedReport)!}
              base={base}
              onClose={() => {
                setSelectedReport(null);
                scrollToTop();
              }}
              onSaved={async () => {
                await reports.reload();
                await refreshAudit();
              }}
            />
          ) : (
            <>
              <Field
                label="Search reports"
                value={search}
                onChangeText={setSearch}
                placeholder="Title or description"
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {["active", "submitted", "reviewing", "resolved", "all"].map(
                  (status) => {
                    const count = reports.data.filter((r) =>
                      status === "all"
                        ? true
                        : status === "active"
                          ? ["submitted", "reviewing"].includes(r.status)
                          : r.status === status,
                    ).length;
                    return (
                      <Chip
                        key={status}
                        title={
                          ({
                            active: "Open",
                            submitted: "New",
                            reviewing: "Reviewing",
                            resolved: "Resolved",
                            all: "All",
                          }[status] || status) +
                          " (" +
                          count +
                          ")"
                        }
                        selected={statusFilter === status}
                        onPress={() => setStatusFilter(status)}
                      />
                    );
                  },
                )}
              </View>
              {(() => {
                const visible = reports.data.filter(
                  (r) =>
                    (statusFilter === "all" ||
                      (statusFilter === "active"
                        ? ["submitted", "reviewing"].includes(r.status)
                        : r.status === statusFilter)) &&
                    (r.title + " " + r.description)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                );
                if (reports.loading) return <Busy />;
                if (!visible.length)
                  return reports.error ? null : (
                    <EmptyState
                      icon="checkmark-done-outline"
                      title={
                        reports.data.length
                          ? "No reports match this view"
                          : "No campus reports yet"
                      }
                      body={
                        reports.data.length
                          ? "Try another filter or search."
                          : "New student concerns will appear here."
                      }
                    />
                  );
                return (
                  <ListGroup>
                    {visible.map((r, i) => (
                      <FocusPressable
                        key={r.id}
                        accessibilityRole="button"
                        accessibilityLabel={
                          "Review " +
                          r.title +
                          ", " +
                          (STATUS_NAME[r.status] || r.status)
                        }
                        onPress={() => {
                          setSelectedReport(r.id);
                          scrollToTop();
                        }}
                        style={({ pressed }) => ({
                          minHeight: 64,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          backgroundColor: pressed ? C.mint : C.white,
                          borderBottomWidth: i === visible.length - 1 ? 0 : 1,
                          borderBottomColor: C.line,
                          borderLeftWidth: 4,
                          borderLeftColor:
                            r.severity === "high" &&
                            ["submitted", "reviewing"].includes(r.status)
                              ? C.red
                              : "transparent",
                        })}
                      >
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text numberOfLines={1} style={s.label}>
                            {r.title}
                          </Text>
                          <Text numberOfLines={1} style={s.small}>
                            {CATEGORY_NAME[r.category] || r.category} ·{" "}
                            {new Date(r.created_at).toLocaleDateString()}
                            {r.severity === "high" ? " · Serious" : ""}
                          </Text>
                        </View>
                        <StatusTag status={r.status} />
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={C.muted}
                        />
                      </FocusPressable>
                    ))}
                  </ListGroup>
                );
              })()}
            </>
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
          {!directory.loading && !directory.error && !directory.data.length && (
            <EmptyState
              icon="call-outline"
              title="No help contacts yet"
              body="Add the numbers students should call. They appear in Help."
            />
          )}
          {directory.data.map((c) => (
            <Disclosure
              key={c.id}
              icon="call-outline"
              title={c.name + " · " + c.phone}
            >
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
          <Disclosure icon="add-circle-outline" title="Add a contact">
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
            <Segmented
              label="Keep visible for"
              value={hours}
              onChange={(v) => {
                setHours(v);
                setPreviewTime(Date.now());
              }}
              options={[
                { key: "6", title: "6 hr" },
                { key: "24", title: "1 day" },
                { key: "72", title: "3 days" },
                { key: "168", title: "7 days" },
              ]}
            />
            {!!alertTitle.trim() && (
              <View
                style={{
                  backgroundColor: C.mint,
                  borderRadius: 12,
                  padding: 14,
                  gap: 6,
                }}
              >
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
              </View>
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
          {!!alerts.data.length && (
            <>
              <SectionLabel>Published updates</SectionLabel>
              <ListGroup>
                {alerts.data.map((v, i) => (
                  <View
                    key={v.id}
                    style={{
                      padding: 16,
                      gap: 4,
                      borderBottomWidth: i === alerts.data.length - 1 ? 0 : 1,
                      borderBottomColor: C.line,
                    }}
                  >
                    <Text style={s.label}>{v.title}</Text>
                    <Text style={s.small}>{v.body}</Text>
                    <FocusPressable
                      accessibilityRole="button"
                      accessibilityLabel={"Remove update " + v.title}
                      disabled={a.busy}
                      onPress={() =>
                        void a.run(async () => {
                          if (
                            await confirm(
                              "Remove announcement?",
                              "It will disappear from campus updates.",
                              "Remove update",
                              true,
                            )
                          ) {
                            await api.request(
                              base + "/alerts/" + v.id,
                              "DELETE",
                            );
                            await alerts.reload();
                            await refreshAudit();
                          }
                        })
                      }
                      style={{
                        minHeight: 44,
                        justifyContent: "center",
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: C.red,
                        }}
                      >
                        Remove
                      </Text>
                    </FocusPressable>
                  </View>
                ))}
              </ListGroup>
            </>
          )}
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
          <Text style={s.small}>
            Only the campus owner can assign staff roles. Staff never gain
            access to private location sharing through their role.
          </Text>
          <Field
            label="Find a person"
            value={search}
            onChangeText={setSearch}
            placeholder="Name or email"
          />
          {(() => {
            const visible = members.data.filter((m) =>
              (m.name + " " + m.email)
                .toLowerCase()
                .includes(search.toLowerCase()),
            );
            if (!visible.length)
              return members.loading ? (
                <Busy />
              ) : (
                <EmptyState icon="people-outline" title="No people found" />
              );
            return (
              <ListGroup>
                {visible.map((m, i) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    manageable={isOwner && m.role !== "owner"}
                    roleDisabled={a.busy || campus!.status !== "active"}
                    removeDisabled={a.busy}
                    last={i === visible.length - 1}
                    onToggleRole={() =>
                      void a.run(async () => {
                        const role = m.role === "staff" ? "student" : "staff";
                        if (
                          await confirm(
                            "Change " + m.name + " to " + role + "?",
                            "Staff can read student reports and manage the directory.",
                            "Change role",
                          )
                        ) {
                          await api.request(
                            base + "/members/" + m.id,
                            "PATCH",
                            {
                              role,
                            },
                          );
                          await members.reload();
                        }
                      }, "Role updated.")
                    }
                    onRemove={() =>
                      void a.run(async () => {
                        if (
                          await confirm(
                            "Remove " + m.name + "?",
                            "This revokes their campus access.",
                            "Remove person",
                            true,
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
                ))}
              </ListGroup>
            );
          })()}
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
          <Field
            label="Search activity"
            value={search}
            onChangeText={setSearch}
            placeholder="Action, report or staff name"
          />
          {(() => {
            const visible = audit.data.filter((v) =>
              (
                v.action +
                " " +
                (v.actor_name || v.operator_name || "") +
                " " +
                (v.details?.title || "")
              )
                .toLowerCase()
                .includes(search.toLowerCase()),
            );
            if (audit.loading) return <Busy />;
            if (!visible.length)
              return (
                <EmptyState
                  icon="list-outline"
                  title={
                    audit.data.length
                      ? "No activity matches this search"
                      : "No staff changes yet"
                  }
                />
              );
            return (
              <ListGroup>
                {visible.map((v, i) => (
                  <View
                    key={v.id}
                    style={{
                      padding: 16,
                      gap: 4,
                      borderBottomWidth: i === visible.length - 1 ? 0 : 1,
                      borderBottomColor: C.line,
                    }}
                  >
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
                    {!!v.review_note && (
                      <Text style={s.body}>{v.review_note}</Text>
                    )}
                  </View>
                ))}
              </ListGroup>
            );
          })()}
        </>
      )}
      {tab === "Settings" && (
        <>
          <Disclosure icon="key-outline" title="Student invitation code">
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
                        "Replace code",
                        true,
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
              icon="map-outline"
              title={"Edit campus boundary · " + Number(radius) / 1000 + " km"}
            >
              <CampusPlaceSearch
                onSelect={(lat, lng) => {
                  setLatitude(String(lat));
                  setLongitude(String(lng));
                }}
              />
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
              <Text style={s.small}>
                Tap the map to move the campus center, then choose the distance
                to the edge (km).
              </Text>
              <Segmented
                label="Distance from center to campus edge in kilometers"
                value={radius}
                onChange={setRadius}
                options={[
                  { key: "500", title: "0.5" },
                  { key: "1000", title: "1" },
                  { key: "1500", title: "1.5" },
                  { key: "3000", title: "3" },
                  { key: "5000", title: "5" },
                ]}
              />
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
          <Disclosure
            icon="swap-horizontal-outline"
            title="Transfer campus ownership"
          >
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
                <Notice message="First assign your successor a staff role in People." />
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
                        "Transfer ownership",
                        true,
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
      {tab === "Reports" && !selectedReport && <Pagination page={reports} />}
      {tab === "Members" && <Pagination page={members} />}
      {tab === "Audit" && <Pagination page={audit} />}
    </View>
  );
}
