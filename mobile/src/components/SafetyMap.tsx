import Text from "./AppText";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { groupMapPins } from "../mapClusters";
import MapView, { Marker, Circle } from "react-native-maps";
import { C, useReducedMotion } from "./ui";
import type { MapPin } from "../types";
export type MapProps = {
  latitude: number;
  longitude: number;
  radius?: number;
  height?: number;
  zoom?: number;
  preview?: boolean;
  pins: MapPin[];
  onInspect?: (pins: MapPin[]) => void;
  onSelect?: (latitude: number, longitude: number) => void;
};
export default function SafetyMap({
  latitude,
  longitude,
  radius = 1500,
  pins,
  height = 330,
  onSelect,
  onInspect,
  zoom = 15,
  preview = false,
}: MapProps) {
  const map = useRef<MapView>(null);
  const reducedMotion = useReducedMotion();
  const [viewZoom, setViewZoom] = useState(zoom);
  const groups =
    onInspect || preview
      ? groupMapPins(pins, viewZoom)
      : pins.map((pin) => ({
          id: pin.id,
          latitude: pin.latitude,
          longitude: pin.longitude,
          pins: [pin],
        }));
  const delta = 360 / Math.pow(2, zoom);
  useEffect(() => {
    map.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta },
      reducedMotion ? 0 : 200,
    );
  }, [latitude, longitude, delta, reducedMotion]);
  return (
    <MapView
      ref={map}
      scrollEnabled={!preview}
      zoomEnabled={!preview}
      rotateEnabled={!preview}
      pitchEnabled={!preview}
      toolbarEnabled={!preview}
      style={{ height, width: "100%", borderRadius: 12 }}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      }}
      onPress={(e) =>
        onSelect?.(
          e.nativeEvent.coordinate.latitude,
          e.nativeEvent.coordinate.longitude,
        )
      }
      onRegionChangeComplete={(region) =>
        setViewZoom(Math.log2(360 / Math.max(0.000001, region.longitudeDelta)))
      }
      accessibilityLabel="Campus safety map"
    >
      <Circle
        center={{ latitude, longitude }}
        radius={radius}
        strokeColor={C.blue}
        fillColor="rgba(49,87,165,0.06)"
      />
      {groups.map((group) => {
        const p = group.pins[0];
        const color = group.pins.some((pin) => pin.color === C.red)
          ? C.red
          : group.pins.some((pin) => pin.color === C.blue)
            ? C.blue
            : p.color || C.blue;
        const title =
          group.pins.length > 1
            ? group.pins.length + " nearby updates"
            : p.title;
        return (
          <Marker
            key={group.id}
            coordinate={{
              latitude: group.latitude,
              longitude: group.longitude,
            }}
            title={title}
            description={
              group.pins.length === 1
                ? p.description
                : "Tap to read each update."
            }
            pinColor={color}
            stopPropagation
            onPress={() => onInspect?.(group.pins)}
            accessibilityLabel={title}
          >
            {group.pins.length > 1 && (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: color,
                  borderWidth: 3,
                  borderColor: C.white,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: C.white, fontWeight: "700", fontSize: 16 }}
                >
                  {group.pins.length}
                </Text>
              </View>
            )}
          </Marker>
        );
      })}
    </MapView>
  );
}
