import Text from "../components/AppText";
import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import React, { useState, useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { useApp, useAction, usePaged, api, confirm } from "../state";
import {
  Pagination,
  FocusPressable,
  StepProgress,
  Heading,
  Field,
  Card,
  Button,
  Notice,
  Chip,
  s,
  Busy,
  Disclosure,
  C,
} from "../components/ui";
import GuideIcon, { type GuideKind } from "../components/GuideIcon";
import ReportStatus from "../components/ReportStatus";
import SafetyMap from "../components/SafetyMap";
import { draftStorage } from "../drafts";
import { isNearCampus } from "../reportLocation";
import { locate } from "../location";
import type { Report } from "../types";
export default function Reports() {
  const { width, fontScale } = useWindowDimensions();
  const verticalChoices = width < 360 || fontScale > 1.2;
  const { user, campus, scrollToTop } = useApp();
  const base = "/campuses/" + campus!.id;
  const reports = usePaged<Report>(base + "/reports?mine=true", 200, 10000);
  const { compose } = useLocalSearchParams<{ compose?: string }>();
  const [formOpen, setFormOpen] = useState(false);
  const form = formOpen || compose === "1";
  const setForm = (open: boolean) => {
    setFormOpen(open);
    if (compose) router.setParams({ compose: undefined });
  };
  const [step, setStep] = useState(0);
  const [requestId, setRequestId] = useState(() => randomUUID());
  useEffect(() => {
    scrollToTop();
  }, [step, form, scrollToTop]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("lighting");
  const [severity, setSeverity] = useState("medium");
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const a = useAction();
  const draftKey = "report-draft-" + user.id + "-" + campus!.id;
  const [draftReady, setDraftReady] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const draftSnapshot = JSON.stringify({
    requestId,
    title,
    description,
    category,
    severity,
    position,
    step,
  });
  const [draftError, setDraftError] = useState("");
  useEffect(() => {
    let mounted = true;
    void draftStorage
      .get(draftKey)
      .then((value) => {
        if (!mounted) return;
        if (value) {
          try {
            const draft = JSON.parse(value);
            if (draft.requestId) setRequestId(draft.requestId);
            setTitle(draft.title || "");
            setDescription(draft.description || "");
            setCategory(draft.category || "lighting");
            setSeverity(draft.severity || "medium");
            setPosition(draft.position || null);
            setStep(Math.min(3, draft.step || 0));
          } catch {
            setDraftError(
              "Your saved draft could not be restored. Start a new report below.",
            );
          }
        }
        setDraftReady(true);
      })
      .catch(() => {
        setDraftError(
          "Draft storage is unavailable. Keep this report open until you send it.",
        );
        setDraftReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [draftKey]);
  useEffect(() => {
    if (!draftReady) return;
    void draftStorage
      .set(draftKey, draftSnapshot)
      .then(() => setSavedSnapshot(draftSnapshot))
      .catch(() =>
        setDraftError(
          "Your draft could not be saved. Keep this report open until you send it.",
        ),
      );
  }, [draftReady, draftKey, draftSnapshot]);
  const categoryNames: Record<string, string> = {
    lighting: "Poor lighting",
    hazard: "Hazard",
    suspicious: "Suspicious activity",
    harassment: "Harassment",
    theft: "Theft",
    other: "Something else",
  };
  const hasDraft = !!(title || description || position);
  const positionError =
    position && !isNearCampus(position, campus!)
      ? "Choose a location on or near your campus. Tap another point on the map."
      : "";

  if (campus!.status !== "active")
    return (
      <View style={s.page}>
        <Heading
          title="Reporting opens after approval"
          subtitle="Your campus must be activated before concerns can be sent."
        />
        <Notice message="You can finish campus settings and add help numbers while the platform reviews your registration." />
        {["staff", "owner"].includes(campus!.role) && (
          <Button
            title="Finish campus setup"
            onPress={() => router.navigate("/staff")}
          />
        )}
      </View>
    );
  return (
    <View style={s.page}>
      <Heading
        title={form ? "Report a concern" : "Your reports"}
        subtitle={
          form
            ? [
                "Tell us what happened.",
                "Choose the type of concern.",
                "Choose where it happened.",
                "Review your report before sending.",
              ][step]
            : "Track concerns sent to campus staff."
        }
      />

      {!draftReady && <Busy />}
      {!form && (
        <Button
          title={hasDraft ? "Continue saved report" : "Report a concern"}
          disabled={!draftReady}
          onPress={() => {
            setForm(true);
            if (!hasDraft) setStep(0);
          }}
        />
      )}
      {form && (
        <Card style={{ backgroundColor: C.white, padding: 0 }}>
          {!!a.error && <Notice error message={a.error} />}
          <StepProgress
            step={step}
            labels={["Details", "Type", "Location", "Review"]}
          />
          {step === 0 && (
            <>
              <Field
                editable={!a.busy}
                label="Short title"
                error={a.fields.title}
                hint="Example: Broken walkway light (at least 3 characters)."
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Field
                editable={!a.busy}
                label="What happened?"
                error={a.fields.description}
                hint="What should staff check? Use at least 10 characters."
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={3000}
              />
              <Text style={s.small}>
                Only you and campus staff see the full report. Keep personal
                details out of the title.
              </Text>
            </>
          )}
          {step === 1 && (
            <>
              <Text style={s.label}>Category</Text>
              <View style={s.row}>
                {[
                  "lighting",
                  "hazard",
                  "suspicious",
                  "harassment",
                  "theft",
                  "other",
                ].map((v) => (
                  <FocusPressable
                    key={v}
                    accessibilityRole="button"
                    accessibilityLabel={categoryNames[v]}
                    accessibilityState={{
                      selected: category === v,
                      disabled: a.busy,
                    }}
                    aria-pressed={category === v}
                    disabled={a.busy}
                    onPress={() => setCategory(v)}
                    style={{
                      flexBasis: "45%",
                      flexGrow: 1,
                      minHeight: verticalChoices ? 100 : 82,
                      borderRadius: 12,
                      borderWidth: category === v ? 2 : 1,
                      borderColor: category === v ? C.blue : C.line,
                      backgroundColor: category === v ? C.mint : C.white,
                      padding: 12,
                      flexDirection: verticalChoices ? "column" : "row",
                      alignItems: "center",
                      justifyContent: verticalChoices ? "center" : "flex-start",
                      gap: verticalChoices ? 6 : 10,
                      opacity: a.busy ? 0.5 : 1,
                    }}
                  >
                    <Text
                      aria-hidden
                      style={{
                        position: "absolute",
                        right: 8,
                        top: 4,
                        color: C.blue,
                        fontWeight: "700",
                      }}
                    >
                      {category === v ? "✓" : ""}
                    </Text>
                    <View style={{ width: 30, height: 30, flexShrink: 0 }}>
                      <GuideIcon
                        kind={v as GuideKind}
                        color={C.blue}
                        size={30}
                      />
                    </View>
                    <Text
                      style={{
                        ...s.label,
                        fontSize: 14,
                        lineHeight: 20,
                        flex: verticalChoices ? undefined : 1,
                        textAlign: verticalChoices ? "center" : "left",
                      }}
                    >
                      {categoryNames[v]}
                    </Text>
                  </FocusPressable>
                ))}
              </View>
              <Text style={s.label}>How serious is it?</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {["low", "medium", "high"].map((v) => {
                  const label = {
                    low: "Minor",
                    medium: "Needs attention",
                    high: "Serious",
                  }[v as "low" | "medium" | "high"];
                  const selected = severity === v;
                  return (
                    <FocusPressable
                      key={v}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ selected, disabled: a.busy }}
                      aria-pressed={selected}
                      disabled={a.busy}
                      onPress={() => setSeverity(v)}
                      style={{
                        flex: 1,
                        minHeight: 56,
                        borderRadius: 10,
                        padding: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: selected ? C.blue : C.control,
                        backgroundColor: selected ? C.blue : C.white,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          lineHeight: 18,
                          fontWeight: "600",
                          textAlign: "center",
                          color: selected ? C.white : C.ink,
                        }}
                      >
                        {selected ? "✓ " : ""}
                        {label}
                      </Text>
                    </FocusPressable>
                  );
                })}
              </View>
            </>
          )}
          {step === 2 && (
            <>
              <Text style={s.label}>Where is the concern?</Text>
              <Text style={s.small}>
                Tap the map to choose a position, or use your current location.
              </Text>
              <SafetyMap
                height={200}
                latitude={campus!.latitude}
                longitude={campus!.longitude}
                radius={campus!.radius_m}
                pins={
                  position
                    ? [{ id: "chosen", ...position, title: "Report position" }]
                    : []
                }
                onSelect={(latitude, longitude) =>
                  !a.busy && setPosition({ latitude, longitude })
                }
              />
              <Button
                secondary
                title={
                  a.busy ? "Finding your location…" : "Use my current location"
                }
                disabled={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    const l = await locate();
                    setPosition({
                      latitude: l.coords.latitude,
                      longitude: l.coords.longitude,
                    });
                  })
                }
              />
              {!!positionError && <Notice error message={positionError} />}
              {position && !positionError && (
                <Text style={s.small}>
                  Location selected. Tap another spot to change it.
                </Text>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <Text style={s.subheading}>{title}</Text>
              <Text style={s.body}>{description}</Text>
              <View style={s.row}>
                <Chip title={categoryNames[category]} />
                <Chip
                  title={
                    {
                      low: "Minor",
                      medium: "Needs attention",
                      high: "Serious",
                    }[severity] || severity
                  }
                />
              </View>
              {position && (
                <SafetyMap
                  latitude={position.latitude}
                  longitude={position.longitude}
                  radius={0}
                  height={150}
                  pins={[
                    {
                      id: "review-location",
                      ...position,
                      title: "Your selected report location",
                    },
                  ]}
                />
              )}
              {!!positionError && <Notice error message={positionError} />}
              <FocusPressable
                accessibilityRole="button"
                accessibilityLabel="Change report location"
                disabled={a.busy}
                onPress={() => setStep(2)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={[s.label, { color: C.blue }]}>
                  Change location
                </Text>
              </FocusPressable>
              <Notice message="Full details go to campus staff. For urgent help, open Help." />
            </>
          )}
          {step < 3 ? (
            <Button
              title="Continue"
              disabled={
                a.busy ||
                (step === 0 &&
                  (title.trim().length < 3 ||
                    description.trim().length < 10)) ||
                (step === 2 && (!position || !!positionError))
              }
              onPress={() => setStep(step + 1)}
            />
          ) : (
            <Button
              title={a.busy ? "Sending report…" : "Send report"}
              disabled={
                a.busy ||
                !position ||
                !!positionError ||
                !title.trim() ||
                !description.trim() ||
                campus!.status !== "active"
              }
              onPress={() =>
                void a.run(async () => {
                  await api.request(base + "/reports", "POST", {
                    requestId,
                    title,
                    description,
                    category,
                    severity,
                    ...position,
                  });
                  setForm(false);
                  setRequestId(randomUUID());
                  setTitle("");
                  setDescription("");
                  setPosition(null);
                  setStep(0);
                  await draftStorage.remove(draftKey);
                  await reports.reload();
                }, "Report sent. Track its status below.")
              }
            />
          )}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {step > 0 && (
              <FocusPressable
                accessibilityRole="button"
                disabled={a.busy}
                onPress={() => setStep(step - 1)}
                style={{ minHeight: 44, padding: 12 }}
              >
                <Text style={[s.label, { color: C.blue }]}>Back</Text>
              </FocusPressable>
            )}
            <FocusPressable
              accessibilityRole="button"
              disabled={a.busy}
              onPress={() => {
                setForm(false);
              }}
              style={{ minHeight: 44, padding: 12, marginLeft: "auto" }}
            >
              <Text style={s.small}>Save and close</Text>
            </FocusPressable>
          </View>
        </Card>
      )}
      {hasDraft && !form && (
        <Button
          secondary
          title="Discard saved draft"
          onPress={() =>
            void a.run(async () => {
              if (
                !(await confirm(
                  "Discard your draft?",
                  "Your unfinished report will be removed from this device.",
                ))
              )
                return;
              setTitle("");
              setRequestId(randomUUID());
              setDescription("");
              setPosition(null);
              setStep(0);
              await draftStorage.remove(draftKey);
            })
          }
        />
      )}
      {!!draftError && <Notice error message={draftError} />}
      {hasDraft && !draftError && (
        <Text style={s.small}>
          {savedSnapshot === draftSnapshot
            ? "Draft saved on this device."
            : "Saving draft…"}
        </Text>
      )}
      {!form && !!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      {!!reports.error && (
        <Notice
          error
          message={reports.error}
          onRetry={() => void reports.reload()}
        />
      )}
      {reports.loading && <Busy />}
      {!form && (
        <>
          {!reports.loading && !reports.error && !reports.data.length && (
            <Text style={s.body}>
              No reports yet. If something needs attention, send your first
              concern.
            </Text>
          )}
          {reports.data.map((r) => (
            <Card
              key={r.id}
              style={{
                backgroundColor: C.white,
                borderWidth: 1,
                borderColor: C.line,
                padding: 16,
                gap: 10,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    backgroundColor: C.mint,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GuideIcon
                    kind={
                      (r.category in categoryNames
                        ? r.category
                        : "other") as GuideKind
                    }
                    color={C.blue}
                    size={26}
                  />
                </View>
                <Text
                  style={[s.label, { flex: 1, fontSize: 18, lineHeight: 25 }]}
                >
                  {r.title}
                </Text>
              </View>
              <ReportStatus status={r.status} compact />
              <Disclosure compact title="View report details">
                <ReportStatus status={r.status} />
                <Text style={s.small}>
                  {categoryNames[r.category] || r.category}
                </Text>
                <Text style={s.body}>{r.description}</Text>
                {r.public_summary && (
                  <>
                    <Text style={s.label}>Staff’s public update</Text>
                    <Text style={s.body}>{r.public_summary}</Text>
                  </>
                )}
                {r.updated_at !== r.created_at && (
                  <Text style={s.small}>
                    Last updated{" "}
                    {new Date(r.updated_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
              </Disclosure>
              <Text style={[s.small, { fontSize: 12 }]}>
                Sent{" "}
                {new Date(r.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </Card>
          ))}
          <Pagination page={reports} />
        </>
      )}
    </View>
  );
}
