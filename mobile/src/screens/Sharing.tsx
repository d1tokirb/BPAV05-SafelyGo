import Text from "../components/AppText";
import React, { useState, useEffect } from "react";
import { View, Switch } from "react-native";
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
  Chip,
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
    <Disclosure title="Share my own walk">{children}</Disclosure>
  ) : (
    <>{children}</>
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
  const inviteForm = (
    <Card>
      <Text style={s.subheading}>Invite someone you trust</Text>
      <SummaryRow
        icon="people-outline"
        label="Choose a friend or family member"
        value="They accept before you can share."
      />
      <Field
        label="Their email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button
        title="Send invitation"
        disabled={a.busy || !email.trim()}
        onPress={() =>
          void a.run(async () => {
            await api.request("/contacts", "POST", {
              email: email.trim().toLowerCase(),
            });
            setEmail("");
            await contacts.reload();
          }, "Invitation sent. They can accept it in Walk.")
        }
      />
    </Card>
  );
  if (!draft.ready) return <Busy />;
  return (
    <View style={s.page}>
      <Heading
        title={
          active
            ? "Your shared walk"
            : pending.length || incoming.length
              ? "Walks & trusted people"
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
      {pending.map((c) => (
        <Card key={c.id}>
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
        <Card style={{ borderColor: C.green }}>
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
          <Text style={s.body}>
            {activeStatus?.minutesLeft} min left. Ends at{" "}
            {new Date(active.expires_at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            . Sharing with{" "}
            {accepted
              .filter((c) => active.recipients?.includes(c.other_id))
              .map((c) => c.other_name)
              .join(", ") || "your selected contacts"}
            .
          </Text>
          <Text style={s.small}>
            {active.updated_at
              ? "Last position sent " +
                new Date(active.updated_at).toLocaleTimeString()
              : "Waiting for a position"}
          </Text>
          <Text style={s.small}>
            {deviceTracking?.id === active.id
              ? deviceTracking.background
                ? "This device is sending background updates."
                : "This device sends updates while SafelyGo stays open."
              : "Location updates are not connected on this device."}
          </Text>
          <Text style={s.small}>
            Use reconnect if this device stopped sending positions or you
            reopened the app.
          </Text>
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
        pending.length ? (
          <Disclosure title="Invite someone else">{inviteForm}</Disclosure>
        ) : (
          inviteForm
        )
      ) : (
        <WalkSetupContainer collapsed={incoming.length > 0}>
          <Card style={{ backgroundColor: C.white, padding: 0 }}>
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
                <View style={s.row}>
                  {[15, 30, 60, 120].map((n) => (
                    <Chip
                      key={n}
                      title={n === 120 ? "2 hr" : n + " min"}
                      selected={minutes === n}
                      onPress={() => setMinutes(n)}
                    />
                  ))}
                </View>
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
      {accepted.length > 0 && (
        <Disclosure icon="person-add-outline" title="Invite another person">
          {inviteForm}
        </Disclosure>
      )}
      {contacts.data.some(
        (c) => c.status === "accepted" || c.requester_id === user.id,
      ) && (
        <Disclosure
          title={
            "Manage trusted people (" +
            contacts.data.length +
            ")" +
            (contacts.data.some(
              (c) => c.status === "pending" && c.recipient_id === user.id,
            )
              ? " · New invitation"
              : "")
          }
        >
          {contacts.data
            .filter(
              (c) => c.status === "accepted" || c.requester_id === user.id,
            )
            .map((c) => (
              <Card key={c.id}>
                <Text style={s.label}>{c.other_name}</Text>
                <Text style={s.small}>{c.other_email}</Text>
                <Chip
                  title={
                    c.status === "accepted"
                      ? "Trusted contact"
                      : c.recipient_id === user.id
                        ? "Invitation received"
                        : "Waiting for acceptance"
                  }
                />
                {c.status === "pending" && c.recipient_id === user.id && (
                  <Button
                    title="Accept trusted contact"
                    disabled={a.busy}
                    onPress={() =>
                      void a.run(async () => {
                        await api.request(
                          "/contacts/" + c.id + "/accept",
                          "POST",
                        );
                        await contacts.reload();
                      })
                    }
                  />
                )}
                <Button
                  secondary
                  title={
                    c.status === "pending"
                      ? "Decline / cancel invitation"
                      : "Remove trusted contact"
                  }
                  disabled={a.busy}
                  onPress={() =>
                    void a.run(async () => {
                      if (
                        await confirm(
                          "Remove this contact?",
                          "This immediately removes location access between you.",
                        )
                      ) {
                        await api.request("/contacts/" + c.id, "DELETE");
                        await contacts.reload();
                        await sessions.reload();
                        setSelected(selected.filter((id) => id !== c.other_id));
                      }
                    })
                  }
                />
              </Card>
            ))}
        </Disclosure>
      )}
    </View>
  );
}
