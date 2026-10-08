import Text from "../components/AppText";
import { router } from "expo-router";
import React, { useState } from "react";
import { View, Linking } from "react-native";
import {
  Button,
  StepProgress,
  Field,
  Pagination,
  Heading,
  Notice,
  Segmented,
  ListGroup,
  ActionRow,
  EmptyState,
  SectionLabel,
  IconTile,
  s,
  Busy,
  Disclosure,
  FocusPressable,
  C,
} from "../components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useApp, useAction, usePaged, api } from "../state";
import { locate } from "../location";
import { useFormDraft } from "../useFormDraft";
import CampusPlaceSearch from "../components/CampusPlaceSearch";
import SafetyMap from "../components/SafetyMap";
import type { Campus } from "../types";
import { websiteIdentity } from "../campusIdentity";
export function Verification() {
  const { user, refresh, logout } = useApp();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [correctedEmail, setCorrectedEmail] = useState(user.email);
  const a = useAction();
  const fix = useAction();
  return (
    <View style={s.page}>
      <Heading
        title="Check your email"
        subtitle={
          "Enter the 8-digit code we sent to " +
          user.email +
          ". It expires after 15 minutes."
        }
      />
      <Field
        label="Verification code"
        error={a.fields.code}
        value={code}
        editable={!a.busy && !fix.busy}
        autoComplete="one-time-code"
        onChangeText={(value) => {
          setCode(value.replace(/\D/g, ""));
          a.clear();
        }}
        keyboardType="number-pad"
        maxLength={8}
      />
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      <Button
        title={a.busy ? "Verifying…" : "Verify email"}
        disabled={a.busy || fix.busy || !/^\d{8}$/.test(code)}
        onPress={() =>
          void a.run(async () => {
            await api.request("/auth/verify", "POST", { code });
            await refresh();
          })
        }
      />
      <Disclosure icon="mail-unread-outline" title="Didn’t get the code?">
        <Text style={s.body}>
          Check Spam or Junk and confirm the address above. Only the newest code
          works.
        </Text>
        <Button
          secondary
          title="Send a new code"
          disabled={a.busy || fix.busy}
          onPress={() =>
            void a.run(async () => {
              await api.request("/auth/resend", "POST");
              setCode("");
            }, "New code sent.")
          }
        />
      </Disclosure>
      <Disclosure icon="create-outline" title="Wrong email address?">
        <Text style={s.body}>
          Correct your address and we’ll send a new code.
        </Text>
        <Field
          label="Correct email address"
          value={correctedEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!fix.busy}
          error={fix.fields.email}
          onChangeText={(value) => {
            setCorrectedEmail(value);
            fix.clear();
          }}
        />
        <Field
          label="Password for this account"
          value={password}
          secureTextEntry
          editable={!fix.busy}
          autoComplete="current-password"
          error={fix.fields.password}
          onChangeText={(value) => {
            setPassword(value);
            fix.clear();
          }}
        />
        {!!fix.error && <Notice error message={fix.error} />}
        {!!fix.success && <Notice message={fix.success} />}
        <Button
          secondary
          title={fix.busy ? "Sending…" : "Update email and send code"}
          disabled={fix.busy || a.busy || !password || !correctedEmail.trim()}
          onPress={() =>
            void fix.run(async () => {
              await api.request("/auth/email", "POST", {
                email: correctedEmail.trim(),
                password,
              });
              setPassword("");
              setCode("");
              a.clear();
              await refresh();
            }, "New code sent. Check your corrected email address.")
          }
        />
      </Disclosure>
      <FocusPressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={() => void logout()}
        style={{ minHeight: 44, justifyContent: "center", alignSelf: "center" }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.muted }}>
          Sign out
        </Text>
      </FocusPressable>
    </View>
  );
}
export default function Onboarding() {
  const { user, campus, refresh, selectCampus, scrollToTop } = useApp();
  const [mode, setMode] = useState<"join" | "create">("join");
  const [query, setQuery] = useState("");
  const [chosenCampus, setChosenCampus] = useState<Campus | null>(null);
  const chosen = chosenCampus?.id || "";
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const domain = websiteIdentity(website)?.domain || "";
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("1500");
  const [registrationStep, setRegistrationStep] = useState(0);
  const a = useAction();
  const draft = useFormDraft(
    "campus-registration-" + user.id,
    { name, domain, website, latitude, longitude, radius, registrationStep },
    (value) => {
      setName(value.name);
      setWebsite(value.website);
      setLatitude(value.latitude);
      setLongitude(value.longitude);
      setRadius(value.radius);
      setRegistrationStep(value.registrationStep);
    },
  );
  const campuses = usePaged<Campus>(
    "/campuses?q=" + encodeURIComponent(query),
    100,
  );
  if (!draft.ready) return <Busy />;
  const hasSavedRegistration = !!name.trim();
  const radiusKm = Number(radius) / 1000;
  const radiusOptions = [
    { key: "500", title: "0.5" },
    { key: "1000", title: "1" },
    { key: "1500", title: "1.5" },
    { key: "3000", title: "3" },
    { key: "5000", title: "5" },
  ];
  return (
    <View style={s.page}>
      <Heading
        title={
          mode === "join"
            ? chosen
              ? "Enter your code"
              : "Join your campus"
            : "Register a campus"
        }
        subtitle={
          mode === "join"
            ? chosen
              ? "Your campus issues this code. You can use your regular email."
              : "Students join with an invitation code from their campus."
            : registrationStep === 0
              ? "For authorized campus staff. Your campus is reviewed before students can join."
              : registrationStep === 1
                ? "Search for the campus, then check the boundary."
                : "Check the details before requesting approval."
        }
      />
      {mode === "join" ? (
        <>
          {!chosen && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: C.mint,
                }}
              >
                <Ionicons name="key-outline" size={22} color={C.blue} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.label}>You’ll need an invitation code</Text>
                  <Text style={s.small}>
                    1. Find your school below. 2. Enter the code from your
                    safety office or student services. SafelyGo can’t issue it.
                  </Text>
                </View>
              </View>
              <Field
                label="Search for your campus"
                value={query}
                autoCapitalize="none"
                placeholder="School name"
                onChangeText={(value) => {
                  setQuery(value);
                  a.clear();
                }}
              />
              {!!campuses.error && (
                <Notice
                  error
                  message={campuses.error}
                  onRetry={() => void campuses.reload()}
                />
              )}
              {campuses.loading && <Busy />}
              {!!campuses.data.length && (
                <ListGroup>
                  {campuses.data.map((c, i) => (
                    <ActionRow
                      key={c.id}
                      title={c.name}
                      subtitle={c.domain}
                      icon="school-outline"
                      last={i === campuses.data.length - 1}
                      onPress={() => {
                        setChosenCampus(c);
                        setJoinCode("");
                        a.clear();
                        scrollToTop();
                      }}
                    />
                  ))}
                </ListGroup>
              )}
              <Pagination page={campuses} />
              {!campuses.loading &&
                !campuses.error &&
                !campuses.data.length && (
                  <EmptyState
                    icon="search-outline"
                    title={
                      query.trim()
                        ? "No active campus matches “" + query.trim() + "”"
                        : "No active campuses yet"
                    }
                    body="Only approved campuses are listed. Check the spelling, or ask your school’s safety office to register with SafelyGo. Staff can register below."
                  />
                )}
              <Disclosure
                icon="help-circle-outline"
                title="I can’t find my campus"
              >
                <Text style={s.body}>
                  Your school may not be on SafelyGo yet. A campus must be
                  registered by authorized staff and approved before students
                  can join. Ask your safety office or student services whether
                  it is joining.
                </Text>
              </Disclosure>
              {!campus && (
                <FocusPressable
                  accessibilityRole="button"
                  accessibilityLabel="Invited to a shared walk? Open Walk"
                  onPress={() => router.navigate("/walk")}
                  style={{
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="people-outline" size={18} color={C.blue} />
                  <Text
                    style={{ fontSize: 14, fontWeight: "700", color: C.blue }}
                  >
                    Invited to a shared walk? Open Walk
                  </Text>
                </FocusPressable>
              )}
              <View
                style={{
                  height: 1,
                  backgroundColor: C.line,
                  marginVertical: 4,
                }}
              />
              <SectionLabel>For campus staff</SectionLabel>
              <ListGroup>
                <ActionRow
                  title={
                    hasSavedRegistration
                      ? "Continue campus registration"
                      : "Register a campus"
                  }
                  subtitle={
                    hasSavedRegistration
                      ? "Saved draft: " + name
                      : "Authorized staff only. Reviewed before students can join."
                  }
                  icon="business-outline"
                  last
                  onPress={() => {
                    setMode("create");
                    a.clear();
                    scrollToTop();
                  }}
                />
              </ListGroup>
            </>
          )}
          {!!chosen && (
            <>
              <ListGroup>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                  }}
                >
                  <IconTile name="school-outline" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.label}>{chosenCampus!.name}</Text>
                    <Text style={s.small}>{chosenCampus!.domain}</Text>
                  </View>
                  <FocusPressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose a different campus"
                    disabled={a.busy}
                    onPress={() => {
                      setChosenCampus(null);
                      setJoinCode("");
                      a.clear();
                      scrollToTop();
                    }}
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <Text
                      style={{ fontSize: 14, fontWeight: "700", color: C.blue }}
                    >
                      Change
                    </Text>
                  </FocusPressable>
                </View>
              </ListGroup>
              <Field
                label="Campus invitation code"
                error={a.fields.joinCode}
                value={joinCode}
                editable={!a.busy}
                onChangeText={(value) => {
                  setJoinCode(value);
                  a.clear();
                }}
                autoCapitalize="none"
              />
              {!!a.error && <Notice error message={a.error} />}
              <Button
                title={a.busy ? "Joining campus…" : "Join campus"}
                disabled={a.busy || !chosen || !joinCode.trim()}
                onPress={() =>
                  void a.run(async () => {
                    await api.request("/campuses/join", "POST", {
                      campusId: chosen,
                      joinCode: joinCode.trim(),
                    });
                    await refresh();
                    selectCampus(chosen);
                  })
                }
              />
              <Disclosure
                icon="help-circle-outline"
                title="I don’t have an invitation code"
              >
                <Text style={s.body}>
                  Ask your campus safety office or student services for the
                  SafelyGo invitation code. Only your campus can issue it, and
                  SafelyGo can’t create one for you.
                </Text>
                {!!chosenCampus!.support_email && (
                  <Button
                    secondary
                    title="Email campus support"
                    onPress={() =>
                      void a.run(async () => {
                        await Linking.openURL(
                          "mailto:" + chosenCampus!.support_email,
                        );
                      })
                    }
                  />
                )}
              </Disclosure>
            </>
          )}
        </>
      ) : (
        <>
          {registrationStep === 0 && (
            <FocusPressable
              accessibilityRole="button"
              accessibilityLabel="Back to student join"
              disabled={a.busy}
              onPress={() => {
                setMode("join");
                a.clear();
                scrollToTop();
              }}
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
                I’m a student
              </Text>
            </FocusPressable>
          )}
          <StepProgress
            step={registrationStep}
            labels={["Details", "Boundary", "Review"]}
          />
          {registrationStep === 0 && (
            <>
              <Field
                label="Campus name"
                error={a.fields.name}
                value={name}
                onChangeText={setName}
              />
              <Field
                label="Official website"
                error={a.fields.website}
                hint="Your school’s official website, such as school.edu."
                placeholder="school.edu"
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
              />
              <Button
                title="Continue"
                disabled={!name.trim() || !websiteIdentity(website)}
                onPress={() => {
                  setRegistrationStep(1);
                  scrollToTop();
                }}
              />
            </>
          )}
          {registrationStep === 1 && (
            <>
              <CampusPlaceSearch
                onSelect={(lat, lng) => {
                  setLatitude(String(lat));
                  setLongitude(String(lng));
                }}
              />
              <SafetyMap
                latitude={latitude ? Number(latitude) : 20}
                longitude={longitude ? Number(longitude) : 0}
                radius={latitude ? Number(radius) : 0}
                zoom={latitude ? 15 : 2}
                height={280}
                onSelect={(lat, lng) => {
                  setLatitude(String(lat));
                  setLongitude(String(lng));
                }}
                pins={
                  latitude
                    ? [
                        {
                          id: "center",
                          latitude: Number(latitude),
                          longitude: Number(longitude),
                          title: "Campus center",
                        },
                      ]
                    : []
                }
              />
              <View
                accessibilityLiveRegion="polite"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: latitude ? C.mint : "#EEF1F6",
                }}
              >
                <Ionicons
                  name={latitude ? "checkmark-circle" : "locate-outline"}
                  size={20}
                  color={latitude ? C.blue : C.muted}
                />
                <Text style={[s.small, { flex: 1, color: C.ink }]}>
                  {latitude
                    ? "Boundary set: " +
                      radiusKm +
                      " km around the selected point. Tap the map to move it."
                    : "Search above, or tap the map to place the campus center."}
                </Text>
              </View>
              <Segmented
                label="Distance from center to campus edge in kilometers"
                value={radius}
                onChange={setRadius}
                options={radiusOptions}
              />
              <Text style={[s.small, { textAlign: "center" }]}>
                Distance from center to edge (km)
              </Text>
              <FocusPressable
                accessibilityRole="button"
                accessibilityLabel="Use my current location"
                disabled={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    const p = await locate();
                    setLatitude(String(p.coords.latitude));
                    setLongitude(String(p.coords.longitude));
                  })
                }
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="navigate-outline" size={18} color={C.blue} />
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: C.blue }}
                >
                  I’m on campus now — use my location
                </Text>
              </FocusPressable>
              <Button
                title="Review registration"
                disabled={!latitude || !longitude}
                onPress={() => {
                  setRegistrationStep(2);
                  scrollToTop();
                }}
              />
            </>
          )}
          {registrationStep === 2 && (
            <>
              <SafetyMap
                latitude={Number(latitude)}
                longitude={Number(longitude)}
                radius={Number(radius)}
                height={160}
                pins={[
                  {
                    id: "review",
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    title: name,
                  },
                ]}
              />
              <ListGroup>
                <View style={{ padding: 16, gap: 4 }}>
                  <Text style={s.subheading}>{name}</Text>
                  <Text style={s.small}>
                    Website: {websiteIdentity(website)?.website || website}
                  </Text>
                  <Text style={s.small}>
                    Boundary: {radiusKm} km from the selected center
                  </Text>
                </View>
              </ListGroup>
              <Notice message="The platform operator will verify your institutional role before activating your campus. While waiting, you can add contacts and finish settings. You’ll receive email when a decision is made." />
              <Button
                title={a.busy ? "Registering…" : "Register campus"}
                disabled={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    if (!latitude.trim() || !longitude.trim())
                      throw new Error("Enter the campus center coordinates.");
                    const c = await api.request<Campus>("/campuses", "POST", {
                      name,
                      domain: domain.trim().toLowerCase(),
                      website: websiteIdentity(website)!.website,
                      latitude: Number(latitude),
                      longitude: Number(longitude),
                      radiusM: Number(radius),
                    });
                    await draft.clear();
                    await refresh();
                    selectCampus(c.id);
                    router.navigate("/staff");
                  })
                }
              />
            </>
          )}
          {registrationStep > 0 && (
            <Button
              secondary
              title="Back"
              onPress={() => {
                setRegistrationStep(registrationStep - 1);
                scrollToTop();
              }}
            />
          )}
        </>
      )}
      {!!draft.error && <Notice error message={draft.error} />}
      {mode === "create" && !!a.error && <Notice error message={a.error} />}
    </View>
  );
}
