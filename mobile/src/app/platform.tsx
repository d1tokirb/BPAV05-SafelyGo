import React from "react";
import PlatformAdmin from "../screens/PlatformAdmin";
import { useApp } from "../state";
export default function Route() {
  const { user } = useApp();
  if (!user?.verified) return null;
  return <PlatformAdmin />;
}
