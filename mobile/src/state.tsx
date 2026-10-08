import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import { api, ApiError } from "./api";
import { storage } from "./storage";
import type { User, Campus } from "./types";
export type AppState = {
  connectionError?: string;
  user: User;
  campuses: Campus[];
  campus: Campus | null;
  selectCampus: (id: string) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  scrollToTop: () => void;
  addCampus: () => void;
};
export const StateContext = createContext<AppState>(null!);
export const useApp = () => useContext(StateContext);
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong.";
export function useAction() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  async function run(fn: () => Promise<void>, done = "") {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    setFields({});
    try {
      await fn();
      setSuccess(done);
    } catch (e) {
      setError(message(e));
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    success,
    fields,
    run,
    setError,
    clear: () => {
      setError("");
      setSuccess("");
      setFields({});
    },
  };
}
export function useLoad<T>(path: string | null, initial: T, interval = 0) {
  const [result, setResult] = useState<{
    path: string | null;
    data: T | undefined;
    error: string;
  } | null>(null);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    if (!path) return;
    const request = ++sequence.current;
    try {
      const data = await api.request<T>(path);
      if (request === sequence.current) setResult({ path, data, error: "" });
    } catch (e) {
      if (request === sequence.current)
        setResult((previous) => ({
          path,
          data: previous?.path === path ? previous.data : undefined,
          error: message(e),
        }));
    }
  }, [path]);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    void reload();
    const timer = interval ? setInterval(() => void reload(), interval) : null;
    return () => {
      invalidate();
      if (timer) clearInterval(timer);
    };
  }, [reload, interval, invalidate]);
  const current = result?.path === path ? result : null;
  return {
    data: current?.data ?? initial,
    hasData: current?.data !== undefined,
    loading: !!path && !current,
    error: current?.error ?? "",
    reload,
  };
}
// Page controls keep older reports, larger campuses and audit histories accessible.
export function usePaged<T>(path: string, pageSize: number, interval = 0) {
  const [page, setPage] = useState({ path, offset: 0 });
  const offset = page.path === path ? page.offset : 0;
  const result = useLoad<T[]>(
    path + (path.includes("?") ? "&" : "?") + "offset=" + offset,
    [],
    interval,
  );
  return {
    ...result,
    offset,
    pageSize,
    previous: () => setPage({ path, offset: Math.max(0, offset - pageSize) }),
    next: () => setPage({ path, offset: offset + pageSize }),
  };
}
type Confirmation = {
  title: string;
  body: string;
  confirmLabel?: string;
  destructive?: boolean;
  resolve: (confirmed: boolean) => void;
};
let confirmationHandler: ((request: Confirmation) => void) | null = null;
export function registerConfirmation(
  handler: ((request: Confirmation) => void) | null,
) {
  confirmationHandler = handler;
}
export function confirm(
  title: string,
  body: string,
  confirmLabel?: string,
  destructive = false,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!confirmationHandler) resolve(false);
    else
      confirmationHandler({ title, body, confirmLabel, destructive, resolve });
  });
}
export { api, ApiError, storage };
