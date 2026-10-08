import Text from "../components/AppText";
import React, { useState, useEffect } from "react";
import { View, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp, useLoad, useAction, api, ApiError, confirm } from "../state";
import {
  Heading,
  SummaryRow,
  ChoiceRow,
  StepProgress,
  Card,
  Field,
  Button,
  Notice,
  Segmented,
  IconTile,
  ListGroup,
  SectionLabel,
  FocusPressable,
  s,
  C,
  Disclosure,
  Busy,
} from "../components/ui";
import { undoFailedSharingStart, stopSharedWalk } from "../sharingCleanup";
import { walkStatus } from "../walkStatus";
import { useFormDraft } from "../useFormDraft";
import {
  locate,
  startTracking,
  stopTracking,
  getTrackingState,
  canTrackInBackground,
} from "../location";
import SafetyMap from "../components/SafetyMap";
import type { TrustedContact, Sharing, SharingSession } from "../types";
function WalkSetupContainer({
  children,
  collapsed,
}: {
  children: React.ReactNode;
  collapsed: boolean;
}) {
  return collapsed ? (
    <Disclosure icon="footsteps-outline" title="Share my own walk">
      {children}
    </Disclosure>
  ) : (
    <>{children}</>
  );
}
const initialsOf = (name: string) =>
  name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

type PillTone = "waiting" | "accepted" | "failed";
function StatusPill({ tone, label }: { tone: PillTone; label: string }) {
  const palette: Record<
    PillTone,
    {
      bg: string;
      fg: string;
      border: string;
      icon: React.ComponentProps<typeof Ionicons>["name"];
    }
  > = {
    waiting: {
      bg: C.white,
      fg: C.muted,
      border: "#C5CEDD",
      icon: "time-outline",
    },
    accepted: {
      bg: C.mint,
      fg: C.blue,
      border: C.mint,
      icon: "checkmark-circle",
    },
    failed: {
      bg: "#FDECEE",
      fg: C.red,
      border: "#FDECEE",
      icon: "alert-circle",
    },
  };
  const colors = palette[tone];
  return (
    <View
      accessible
      accessibilityLabel={"Status: " + label}
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      <Ionicons name={colors.icon} size={13} color={colors.fg} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.fg }}>
        {label}
      </Text>
    </View>
  );
}

function PersonRow({
  name,
  detail,
  tone,
  status,
  actions,
  last,
}: {
  name: string;
  detail?: string;
  tone: PillTone;
  status: string;
  actions?: { title: string; onPress: () => void; disabled?: boolean }[];
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
      }}
    >
      <View
        aria-hidden
        accessible={false}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: C.mint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.blue }}>
          {initialsOf(name)}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={s.label}>
          {name}
        </Text>
        {!!detail && (
          <Text numberOfLines={1} style={s.small}>
            {detail}
          </Text>
        )}
        <StatusPill tone={tone} label={status} />
      </View>
      {!!actions?.length && (
        <View style={{ alignItems: "flex-end" }}>
          {actions.map((action) => (
            <FocusPressable
              key={action.title}
              accessibilityRole="button"
              accessibilityLabel={action.title + " " + name}
              disabled={action.disabled}
              onPress={action.onPress}
              style={{
                minHeight: 44,
                minWidth: 56,
                alignItems: "flex-end",
                justifyContent: "center",
                opacity: action.disabled ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.blue }}>
                {action.title}
              </Text>
            </FocusPressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SharingScreen() {
  const { user, scrollToTop } = useApp();
  const contacts = useLoad<TrustedContact[]>("/contacts", [], 10000);
  const sessions = useLoad<Sharing>(
    "/sharing",
    { mine: [], incoming: [] },
    10000,
  );
  const [deviceTracking, setDeviceTracking] = useState(getTrackingState);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setDeviceTracking(getTrackingState());
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [step, setStep] = useState(0);
  useEffect(() => {
    scrollToTop();
  }, [step, scrollToTop]);
  const [backgroundAvailable, setBackgroundAvailable] = useState(false);
  useEffect(() => {
    void canTrackInBackground()
      .then(setBackgroundAvailable)
      .catch(() => setBackgroundAvailable(false));
  }, []);
  const [background, setBackground] = useState(
    () => getTrackingState()?.background || false,
  );
  const [trackingError, setTrackingError] = useState("");
  const [stoppedIds, setStoppedIds] = useState<string[]>([]);
  const draft = useFormDraft(
    "walk-setup-" + user.id,
    { selected, minutes, step, background },
    (value) => {
      setSelected(value.selected);
      setMinutes(value.minutes);
      setStep(value.step);
      setBackground(value.background);
    },
  );
  const a = useAction();
  const accepted = contacts.data.filter((c) => c.status === "accepted");
  const active = sessions.data.mine.find(
    (session) =>
      !stoppedIds.includes(session.id) && !walkStatus(session, now).expired,
  );
  const incoming = sessions.data.incoming.filter(
    (session) => !walkStatus(session, now).expired,
  );
  const activeStatus = active ? walkStatus(active, now) : null;
  const chosen = accepted.filter((c) => selected.includes(c.other_id));
  const pending = contacts.data.filter(
    (c) => c.status === "pending" && c.recipient_id === user.id,
  );
  const waiting = contacts.data.filter(
    (c) => c.status === "pending" && c.requester_id === user.id,
  );
  const inv = useAction();
  const sendInvite = (address: string) =>
    void inv.run(
      async () => {
        await api.request("/contacts", "POST", { email: address });
        setEmail("");
        await contacts.reload();
      },
      "Invitation sent to " + address + ".",
    );
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const removeContact = (c: TrustedContact) =>
    void a.run(async () => {
      const isInvite = c.status === "pending";
      if (
        await confirm(
          isInvite ? "Cancel this invitation?" : "Remove this contact?",
          isInvite
            ? c.other_name + " will no longer be able to accept it."
            : "This immediately removes location access between you and " +
                c.other_name +
                ".",
          isInvite ? "Cancel invitation" : "Remove contact",
          true,
        )
      ) {
        await api.request("/contacts/" + c.id, "DELETE");
        await contacts.reload();
        await sessions.reload();
        setSelected(selected.filter((id) => id !== c.other_id));
      }
    });
  const waitingRows = (
    <ListGroup>
      {waiting.map((c, i) => (
        <PersonRow
          key={c.id}
          name={c.other_name}
          detail={
            c.recipient_id
              ? c.other_email
              : "Invited by email · no SafelyGo account yet"
          }
          tone="waiting"
          status={c.recipient_id ? "Awaiting acceptance" : "Invited"}
          last={i === waiting.length - 1}
          actions={[
            ...(!c.recipient_id
              ? [
                  {
                    title: "Resend",
                    disabled: inv.busy,
                    onPress: () => sendInvite(c.other_email),
                  },
                ]
              : []),
            {
              title: "Cancel",
              disabled: a.busy,
              onPress: () => removeContact(c),
            },
          ]}
        />
      ))}
    </ListGroup>
  );
  const inviteForm = (
    <Card>
      <Text style={s.subheading}>Invite someone you trust</Text>
      <Text style={s.small}>
        They get an email and must accept in Walk before you can choose them.
        Accepting does not start sharing.
      </Text>
      <Field
        label="Their email address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          inv.clear();
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      {!!inv.error && (
        <Notice
          error
          message={"Invitation not sent. " + inv.error}
          onRetry={
            emailValid
              ? () => sendInvite(email.trim().toLowerCase())
              : undefined
          }
        />
      )}
      <Button
        title={inv.busy ? "Sending…" : "Send invitation"}
        disabled={inv.busy || !emailValid}
        onPress={() => sendInvite(email.trim().toLowerCase())}
      />
    </Card>
  );
  const showInvites = !!pending.length && (!accepted.length || step === 0);
  if (!draft.ready) return <Busy />;
  return (
    <View style={s.page}>
      <Heading
        title={
          active
            ? "Your shared walk"
            : pending.length || incoming.length
              ? "Walks & trusted people"
              : waiting.length && !accepted.length
                ? "Invitation sent"
                : "Share your walk"
        }
        subtitle={
          active
            ? "Check your location updates and sharing controls."
            : contacts.loading
              ? "Loading your trusted people…"
              : (contacts.error && !contacts.hasData) ||
                  (sessions.error && !sessions.hasData)
                ? "Reconnect to check your walks and trusted people."
                : pending.length
                  ? "Accept an invitation only if you know and trust the sender."
                  : waiting.length && !accepted.length
                    ? "Waiting for " +
                      (waiting.length === 1
                        ? waiting[0].other_name
                        : waiting.length + " people") +
                      " to accept."
                    : incoming.length
                      ? "Someone you trust is sharing their walk with you."
                      : !accepted.length
                        ? "First, invite someone you trust."
                        : [
                            "Who should see your location?",
                            "How long should sharing last?",
                            "Check your choices before starting.",
                          ][step]
        }
      />

      {!!draft.error && <Notice error message={draft.error} />}
      {!!trackingError && <Notice error message={trackingError} />}
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      {!!inv.success && !!waiting.length && <Notice message={inv.success} />}
      {!!(sessions.error || contacts.error) && (
        <Notice
          error
          message={sessions.error || contacts.error}
          onRetry={() => {
            void sessions.reload();
            void contacts.reload();
          }}
        />
      )}
      {incoming.length > 0 && (
        <Text style={s.subheading}>People sharing with you</Text>
      )}
      {incoming.map((t) => (
        <Card key={t.id}>
          <Text style={s.subheading}>{t.owner_name}</Text>
          <Text style={s.body}>
            {walkStatus(t, now).minutesLeft} min left · Ends{" "}
            {new Date(t.expires_at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
          {t.latitude !== null && t.longitude !== null ? (
            <>
              <Notice
                error={!walkStatus(t, now).recent}
                message={
                  t.updated_at
                    ? (!walkStatus(t, now).recent
                        ? "Location may be stale. "
                        : "") +
                      "Last received " +
                      new Date(t.updated_at).toLocaleTimeString() +
                      ". " +
                      walkStatus(t, now).accuracy
                    : "Waiting for location."
                }
              />
              <SafetyMap
                height={220}
                latitude={t.latitude}
                longitude={t.longitude}
                radius={0}
                pins={[
                  {
                    id: t.id,
                    latitude: t.latitude,
                    longitude: t.longitude,
                    title: t.owner_name || "Contact",
                    color: C.green,
                  },
                ]}
              />
            </>
          ) : (
            <Text style={s.body}>Waiting for their first location.</Text>
          )}
        </Card>
      ))}
      {(showInvites ? pending : []).map((c) => (
        <Card key={c.id} style={{ borderColor: C.blue, borderWidth: 1.5 }}>
          <StatusPill tone="waiting" label="Invitation received" />
          <Text style={s.label}>{c.other_name} invited you</Text>
          <Text style={s.body}>
            Accept to allow either of you to choose the other for a walk.
            Accepting does not start sharing.
          </Text>
          <Button
            title={"Accept " + c.other_name}
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                await api.request("/contacts/" + c.id + "/accept", "POST");
                await contacts.reload();
              })
            }
          />
          <Button
            secondary
            title="Decline invitation"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                if (
                  !(await confirm(
                    "Decline this invitation?",
                    "Neither of you will be able to select the other for a walk.",
                    "Decline invitation",
                    true,
                  ))
                )
                  return;
                await api.request("/contacts/" + c.id, "DELETE");
                await contacts.reload();
              })
            }
          />
        </Card>
      ))}
      {contacts.loading || sessions.loading ? (
        <Busy />
      ) : (contacts.error && !contacts.hasData) ||
        (sessions.error && !sessions.hasData) ? (
        <Card>
          <Text style={s.subheading}>Walk status unavailable</Text>
          <Text style={s.body}>
            Reconnect to check existing sharing and load your trusted people
            before starting another walk.
          </Text>
        </Card>
      ) : active ? (
        <Card style={{ borderColor: C.blue, borderWidth: 1.5 }}>
          <Text style={s.subheading}>
            {activeStatus?.recent
              ? "Recent location received"
              : "Location updates need attention"}
          </Text>
          {!activeStatus?.recent && (
            <Notice
              error
              message="Your contacts do not have a recent position. Keep SafelyGo open or reconnect location updates below."
            />
          )}
          <View style={{ gap: 14 }}>
            <SummaryRow
              icon="people-outline"
              label="Sharing with"
              value={
                accepted
                  .filter((c) => active.recipients?.includes(c.other_id))
                  .map((c) => c.other_name)
                  .join(", ") || "Your selected contacts"
              }
            />
            <SummaryRow
              icon="timer-outline"
              label="Time left"
              value={
                activeStatus?.minutesLeft +
                " min · ends " +
                new Date(active.expires_at).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              }
            />
            <SummaryRow
              icon="navigate-outline"
              label="Last position sent"
              value={
                active.updated_at
                  ? new Date(active.updated_at).toLocaleTimeString()
                  : "Waiting for a position"
              }
            />
            <SummaryRow
              icon="phone-portrait-outline"
              label="This device"
              value={
                deviceTracking?.id === active.id
                  ? deviceTracking.background
                    ? "Sending background updates"
                    : "Sending while SafelyGo is open"
                  : "Updates not connected"
              }
            />
          </View>
          <Button
            secondary
            title="Reconnect location updates"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                await startTracking(
                  active,
                  background && backgroundAvailable,
                  setTrackingError,
                );
                setTrackingError("");
                setDeviceTracking(getTrackingState());
              }, "Location updates resumed.")
            }
          />
          <Button
            danger
            title={a.busy ? "Please wait…" : "Stop sharing now"}
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                await stopSharedWalk(active.expires_at, {
                  stopRemote: async () => {
                    try {
                      await api.request("/sharing/" + active.id, "DELETE");
                    } catch (error) {
                      if (!(
                        error instanceof ApiError &&
                        [404, 410].includes(error.status)
                      ))
                        throw error;
                    }
                    setStoppedIds((ids) => [...ids, active.id]);
                  },
                  stopDevice: async () => {
                    try {
                      await stopTracking();
                    } finally {
                      setDeviceTracking(getTrackingState());
                    }
                  },
                  refresh: sessions.reload,
                });
                setTrackingError("");
              }, "Location access revoked.")
            }
          />
        </Card>
      ) : !accepted.length ? (
        waiting.length ? (
          <>
            <Card style={{ gap: 14 }}>
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <IconTile name="hourglass-outline" tone="solid" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.subheading}>Waiting for acceptance</Text>
                  <Text style={s.small}>
                    {waiting.length === 1
                      ? "1 invitation sent"
                      : waiting.length + " invitations sent"}
                  </Text>
                </View>
              </View>
              <Text style={s.body}>
                Next: ask them to open SafelyGo, go to Walk and tap Accept. You
                can start a walk as soon as someone accepts. Nothing is shared
                until you start a walk.
              </Text>
              <Button
                secondary
                title={contacts.loading ? "Checking…" : "Check for acceptance"}
                disabled={contacts.loading}
                icon="refresh"
                onPress={() => void contacts.reload()}
              />
            </Card>
            {waitingRows}
            <Disclosure icon="person-add-outline" title="Invite someone else">
              {inviteForm}
            </Disclosure>
          </>
        ) : pending.length ? (
          <Disclosure icon="person-add-outline" title="Invite someone else">
            {inviteForm}
          </Disclosure>
        ) : (
          inviteForm
        )
      ) : (
        <WalkSetupContainer collapsed={incoming.length > 0}>
          <Card style={{ gap: 16 }}>
            {step > 0 && !chosen.length && (
              <>
                <Notice message="Your saved selection is no longer available. Choose a trusted person to continue." />
                <Button
                  secondary
                  title="Choose trusted people"
                  onPress={() => setStep(0)}
                />
              </>
            )}
            <StepProgress step={step} labels={["People", "Time", "Review"]} />
            {step === 0 && (
              <>
                {accepted.length ? (
                  <>
                    {accepted.map((c) => (
                      <ChoiceRow
                        key={c.id}
                        title={c.other_name}
                        avatar={c.other_name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                        subtitle={c.other_email}
                        checked={selected.includes(c.other_id)}
                        onPress={() =>
                          setSelected(
                            selected.includes(c.other_id)
                              ? selected.filter((id) => id !== c.other_id)
                              : [...selected, c.other_id],
                          )
                        }
                      />
                    ))}
                  </>
                ) : (
                  <Text style={s.body}>
                    Tap “Add a trusted person” below to invite someone. Once
                    they accept, you can share your walk with them.
                  </Text>
                )}
                <Text style={s.small}>Only selected people can see you.</Text>
                <Button
                  title="Continue"
                  disabled={!chosen.length}
                  onPress={() => setStep(1)}
                />
              </>
            )}
            {step === 1 && (
              <>
                <Text style={s.body}>
                  Sharing stops automatically when this time runs out. You can
                  stop it sooner.
                </Text>
                <Segmented
                  label="Sharing duration"
                  value={String(minutes)}
                  onChange={(v) => setMinutes(Number(v))}
                  options={[
                    { key: "15", title: "15 min" },
                    { key: "30", title: "30 min" },
                    { key: "60", title: "1 hr" },
                    { key: "120", title: "2 hr" },
                  ]}
                />
                <Button title="Continue" onPress={() => setStep(2)} />
              </>
            )}
            {step === 2 && (
              <>
                <SummaryRow
                  icon="people-outline"
                  label="Sharing with"
                  value={chosen.map((c) => c.other_name).join(", ")}
                />
                <SummaryRow
                  icon="timer-outline"
                  label="Sharing stops after"
                  value={minutes === 120 ? "2 hours" : minutes + " minutes"}
                />
                {backgroundAvailable ? (
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.label}>Continue when I lock my phone</Text>
                      <Text style={s.small}>
                        {backgroundAvailable
                          ? "Requires background location permission."
                          : "Unavailable in this version. Keep SafelyGo open during your walk."}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel="Continue sharing when phone is locked"
                      value={background && backgroundAvailable}
                      onValueChange={setBackground}
                      disabled={!backgroundAvailable}
                      trackColor={{ true: C.blue }}
                    />
                  </View>
                ) : (
                  <SummaryRow
                    icon="phone-portrait-outline"
                    label="While walking"
                    value="Keep this app open. Locking or switching apps pauses updates."
                  />
                )}
                <Button
                  title={
                    a.busy ? "Starting sharing…" : "Start sharing my location"
                  }
                  disabled={
                    a.busy ||
                    !chosen.length ||
                    !draft.ready ||
                    !!sessions.error ||
                    !!contacts.error
                  }
                  onPress={() =>
                    void a.run(async () => {
                      await locate();
                      const session = await api.request<SharingSession>(
                        "/sharing",
                        "POST",
                        {
                          recipientIds: chosen.map((c) => c.other_id),
                          minutes,
                        },
                      );
                      try {
                        await startTracking(
                          session,
                          background && backgroundAvailable,
                          setTrackingError,
                        );
                      } catch (e) {
                        await undoFailedSharingStart(e, session.expires_at, {
                          stopRemote: () =>
                            api.request("/sharing/" + session.id, "DELETE"),
                          stopDevice: stopTracking,
                          refresh: sessions.reload,
                        });
                      }
                      await sessions.reload();
                      setDeviceTracking(getTrackingState());
                      setTrackingError("");
                    })
                  }
                />
              </>
            )}
            {step > 0 && (
              <Button
                secondary
                title="Back"
                disabled={a.busy}
                onPress={() => setStep(step - 1)}
              />
            )}
          </Card>
        </WalkSetupContainer>
      )}
      {!!active && (
        <Disclosure icon="location-outline" title="Location update options">
          <Text style={s.small}>
            Choose how this device sends positions. Changing modes asks for the
            necessary permission and reconnects updates.
          </Text>
          <Button
            secondary
            title="Send updates while SafelyGo is open"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                await startTracking(active, false, setTrackingError);
                setBackground(false);
                setDeviceTracking(getTrackingState());
              }, "Updates connected while the app is open.")
            }
          />
          <Button
            secondary
            title="Send updates when phone is locked"
            disabled={a.busy || !backgroundAvailable}
            onPress={() =>
              void a.run(async () => {
                await startTracking(active, true, setTrackingError);
                setBackground(true);
                setDeviceTracking(getTrackingState());
              }, "Background updates connected.")
            }
          />
          {!backgroundAvailable && (
            <Text style={s.small}>
              Background updates are unavailable in this version. Keep SafelyGo
              open.
            </Text>
          )}
        </Disclosure>
      )}
      {!active && !!accepted.length && step === 0 && (
        <>
          {!!waiting.length && (
            <>
              <SectionLabel>
                {"Waiting for acceptance (" + waiting.length + ")"}
              </SectionLabel>
              {waitingRows}
            </>
          )}
          <Disclosure icon="person-add-outline" title="Invite another person">
            {inviteForm}
          </Disclosure>
          <Disclosure
            icon="people-outline"
            title={"Trusted people (" + accepted.length + ")"}
          >
            <ListGroup>
              {accepted.map((c, i) => (
                <PersonRow
                  key={c.id}
                  name={c.other_name}
                  detail={c.other_email}
                  tone="accepted"
                  status="Trusted contact"
                  last={i === accepted.length - 1}
                  actions={[
                    {
                      title: "Remove",
                      disabled: a.busy,
                      onPress: () => removeContact(c),
                    },
                  ]}
                />
              ))}
            </ListGroup>
          </Disclosure>
        </>
      )}
      {!!active && !!accepted.length && (
        <Disclosure
          icon="people-outline"
          title={"Trusted people (" + accepted.length + ")"}
        >
          <ListGroup>
            {accepted.map((c, i) => (
              <PersonRow
                key={c.id}
                name={c.other_name}
                detail={c.other_email}
                tone="accepted"
                status="Trusted contact"
                last={i === accepted.length - 1}
                actions={[
                  {
                    title: "Remove",
                    disabled: a.busy,
                    onPress: () => removeContact(c),
                  },
                ]}
              />
            ))}
          </ListGroup>
        </Disclosure>
      )}
    </View>
  );
}
