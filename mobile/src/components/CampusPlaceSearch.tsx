import Text from "./AppText";
import React, { useState } from "react";
import { View } from "react-native";
import { api, useAction } from "../state";
import { Button, Field, Notice, s } from "./ui";
type Place = { name: string; latitude: number; longitude: number };
export default function CampusPlaceSearch({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searched, setSearched] = useState(false);
  const action = useAction();
  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Find campus location"
        value={query}
        editable={!action.busy}
        onChangeText={(value) => {
          setQuery(value);
          setResults([]);
          setSearched(false);
          action.clear();
        }}
        placeholder="Campus name, city or street address"
      />
      <Button
        secondary
        title={action.busy ? "Searching…" : "Search campus location"}
        disabled={action.busy || query.trim().length < 3}
        onPress={() =>
          void action.run(async () => {
            setResults([]);
            setSearched(false);
            const places = await api.request<Place[]>(
              "/places?q=" + encodeURIComponent(query.trim()),
            );
            setResults(places);
            setSearched(true);
          })
        }
      />
      {!!action.error && <Notice error message={action.error} />}
      {results.map((place, i) => (
        <Button
          key={i}
          secondary
          title={place.name}
          onPress={() => {
            onSelect(place.latitude, place.longitude);
            setResults([]);
            setSearched(false);
          }}
        />
      ))}
      {searched && !results.length && (
        <Text style={s.small}>
          No matching campus found. Add its city or choose the location on the
          map.
        </Text>
      )}
      {results.length > 0 && (
        <Text style={s.small}>
          Map search data © OpenStreetMap contributors.
        </Text>
      )}
    </View>
  );
}
