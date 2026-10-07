import React from "react";
import Account from "../screens/Account";
import { useApp } from "../state";
export default function Route() {
  const { user, addCampus } = useApp();
  if (!user?.verified) return null;
  return <Account onAddCampus={addCampus} />;
}
