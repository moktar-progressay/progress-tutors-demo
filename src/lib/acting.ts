import { useEffect, useState } from "react";

/**
 * The demo has no per-person logins, so each role view needs a "who am I" picker.
 * The choice is remembered in this browser only; all records stay shared.
 */
export function useActingId(kind: "tutor" | "parent" | "student") {
  const key = `progresstutors.acting.${kind}`;
  const [id, setId] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) setId(stored);
  }, [key]);

  const choose = (value: string) => {
    setId(value);
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  };

  return [id, choose] as const;
}
