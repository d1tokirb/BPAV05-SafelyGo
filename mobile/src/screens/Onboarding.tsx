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
  Card,
  Chip,
  s,
  Busy,
  Disclosure,
} from "../components/ui";
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
  const a = useAction();
  return (
    <View style={s.page}>
      <Heading
        title="Check your email"
        subtitle={
          "We sent an 8-digit code to " +
          user.email +
          ". Codes expire after 15 minutes."
        }
      />
      <Field
        label="Verification code"
        error={a.fields.code}
        value={code}
        editable={!a.busy}
        autoComplete="one-time-code"
        onChangeText={(value) => {
          setCode(value);
          a.clear();
        }}
        keyboardType="number-pad"
        maxLength={8}
      />
      {!!a.error && <Notice error message={a.error} />}
      {!!a.success && <Notice message={a.success} />}
      <Button
        title="Verify email"
        disabled={a.busy || !/^\d{8}$/.test(code)}
        onPress={() =>
          void a.run(async () => {
            await api.request("/auth/verify", "POST", { code });
            await refresh();
          })
        }
      />
      <Button
        secondary
        title="Send a new code"
        disabled={a.busy}
        onPress={() =>
          void a.run(async () => {
            await api.request("/auth/resend", "POST");
            setCode("");
          }, "New code sent.")
        }
      />
      <Notice message="No email yet? Check Spam or Junk, confirm the address above, and request a fresh code. Only the newest code works." />
      <Button secondary title="Sign out" onPress={() => void logout()} />
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
  return (
    <View style={s.page}>
      <Heading
        title={
          mode === "join"
            ? chosen
              ? "Join your campus"
              : "Find your campus"
            : "Register a campus"
        }
        subtitle={
          mode === "join"
            ? chosen
              ? "Enter the invitation code from your campus."
              : "Search for your school, then select it to continue."
            : registrationStep === 0
              ? "For authorized campus staff. Your campus will be reviewed before students can join."
              : registrationStep === 1
                ? "Find the campus and adjust its boundary."
                : "Check the details before requesting approval."
        }
      />
      {!campus && (
        <Button
          secondary
          title="Here for a shared walk? Open Walk"
          icon="people-outline"
          onPress={() => router.navigate("/walk")}
        />
      )}
      {((mode === "join" && !chosen) ||
        (mode === "create" && registrationStep === 0)) && (
        <View style={s.row}>
          <Chip
            title="Join a campus"
            disabled={a.busy}
            selected={mode === "join"}
            onPress={() => {
              setMode("join");
              a.clear();
            }}
          />
          <Chip
            title="Register a campus (staff)"
            disabled={a.busy}
            selected={mode === "create"}
            onPress={() => {
              setMode("create");
              a.clear();
            }}
          />
        </View>
      )}
      {mode === "join" && !!name.trim() && (
        <Button
          secondary
          title="Continue saved campus registration"
          onPress={() => setMode("create")}
        />
      )}
      {mode === "join" ? (
        <>
          {!chosen && (
            <>
              <Field
                label="Search campuses"
                hint="Search by your school’s name."
                value={query}
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
              {campuses.data.map((c) => (
                <Card key={c.id}>
                  <Text style={s.subheading}>{c.name}</Text>
                  <Text style={s.body}>{c.domain}</Text>
                  <Button
                    secondary
                    title="Select campus"
                    onPress={() => {
                      setChosenCampus(c);
                      setJoinCode("");
                      a.clear();
                      scrollToTop();
                    }}
                  />
                </Card>
              ))}
              <Pagination page={campuses} />
              {!campuses.loading &&
                !campuses.error &&
                !campuses.data.length && (
                  <Notice message="No active campus matches this search. Try your school’s name, or ask its safety office to register with SafelyGo." />
                )}
            </>
          )}
          {!!chosen && (
            <>
              <Card>
                <Text style={s.subheading}>{chosenCampus!.name}</Text>
                <Text style={s.body}>{chosenCampus!.domain}</Text>
                <Button
                  secondary
                  title="Choose a different campus"
                  disabled={a.busy}
                  onPress={() => {
                    setChosenCampus(null);
                    setJoinCode("");
                    a.clear();
                    scrollToTop();
                  }}
                />
              </Card>
              <Text style={s.body}>
                Your regular email works here. Use the invitation code your
                school gave you.
              </Text>
              <Disclosure title="I don’t have an invitation code">
                <Text style={s.body}>
                  Ask your campus safety office or student services for the
                  SafelyGo invitation code. Only your campus can issue it.
                </Text>
                {!!chosenCampus!.support_email && (
                  <Button
                    secondary
                    title="Contact campus support"
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
            </>
          )}
        </>
      ) : (
        <>
          <StepProgress
            step={registrationStep}
            labels={["Campus details", "Boundary", "Review"]}
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
                title="Continue to campus boundary"
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
              <Text style={s.label}>Choose the campus center</Text>
              <Text style={s.small}>
                Move and zoom the map to your campus, then tap its center. You
                can also use your location when you are on campus.
              </Text>
              <SafetyMap
                latitude={latitude ? Number(latitude) : 20}
                longitude={longitude ? Number(longitude) : 0}
                radius={latitude ? Number(radius) : 0}
                zoom={latitude ? 15 : 2}
                height={260}
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
              <Button
                secondary
                title="Use my location at campus"
                onPress={() =>
                  void a.run(async () => {
                    const p = await locate();
                    setLatitude(String(p.coords.latitude));
                    setLongitude(String(p.coords.longitude));
                  })
                }
              />
              <Text style={s.label}>Distance from center to campus edge</Text>
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
              <Card>
                <Text style={s.subheading}>{name}</Text>
                <Text style={s.small}>
                  Website: {websiteIdentity(website)?.website || website}
                </Text>
                <Text style={s.small}>
                  Campus boundary: {Number(radius) / 1000} km from the selected
                  center
                </Text>
              </Card>
              <Notice message="The platform operator will verify your institutional role before activating your campus. While waiting, you can add contacts and finish settings. You’ll receive email when a decision is made." />
              <Button
                title="Register campus"
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
      {!!a.error && <Notice error message={a.error} />}
    </View>
  );
}
