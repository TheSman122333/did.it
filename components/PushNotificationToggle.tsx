"use client";

import { useEffect, useState } from "react";
import Toggle from "@/components/Toggle";
import {
  isPushSupported,
  getPushSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pushClient";

export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(false);
      return;
    }
    getPushSubscriptionStatus().then(setEnabled);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      setEnabled(await subscribeToPush());
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="card flex items-center justify-between">
      <span className="text-sm text-ink">Push notifications</span>
      <Toggle checked={enabled} onChange={(next) => (busy ? undefined : next ? enable() : disable())} />
    </div>
  );
}
