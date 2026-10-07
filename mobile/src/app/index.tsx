import React from "react";
import { router } from "expo-router";
import Home from "../screens/Home";
import { useApp } from "../state";
export default function Route() {
  const { user, campus } = useApp();
  if (!user?.verified || !campus) return null;
  return (
    <Home
      navigate={(tab) =>
        router.navigate(
          tab === "Reports"
            ? { pathname: "/reports", params: { compose: "1" } }
            : (
                {
                  Map: "/map",
                  Reports: "/reports",
                  Sharing: "/walk",
                  Help: "/help",
                } as const
              )[tab as "Map"] || "/",
        )
      }
    />
  );
}
