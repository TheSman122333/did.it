"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Copy, Share } from "lucide-react";
import QRCode from "qrcode";
import QrScanner from "qr-scanner";

export default function AddFriendModal({
  handle,
  defaultTab = "code",
  onClose,
}: {
  handle: string;
  defaultTab?: "code" | "scan";
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"code" | "scan">(defaultTab);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const addUrl =
    typeof window !== "undefined" ? `${window.location.origin}/add/${handle}` : "";

  useEffect(() => {
    if (tab !== "code" || !addUrl) return;
    QRCode.toDataURL(addUrl, { width: 360, margin: 1 }).then(setQrDataUrl);
  }, [tab, addUrl]);

  useEffect(() => {
    if (tab !== "scan" || !videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const text = result.data.trim();
        const match = text.match(/\/(?:u|add)\/([a-z0-9_]+)/i);
        const target = match ? match[1] : text;
        scanner.stop();
        onClose();
        router.push(`/add/${target}`);
      },
      { highlightScanRegion: true, highlightCodeOutline: true }
    );

    scannerRef.current = scanner;
    scanner.start().catch(() => setScanError("Couldn't access the camera."));

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [tab, router, onClose]);

  async function handleCopy() {
    await navigator.clipboard.writeText(addUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: "did.it", url: addUrl }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-ink-muted/15 bg-white p-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">Add a friend</h1>
          <button onClick={onClose} aria-label="Close">
            <X size={26} strokeWidth={1.75} className="text-ink-muted" />
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setTab("code")}
            className={`flex-1 rounded-xl py-3 text-base font-medium ${
              tab === "code" ? "bg-sage text-white" : "border border-ink-muted/15 bg-white text-ink-muted"
            }`}
          >
            My code
          </button>
          <button
            onClick={() => setTab("scan")}
            className={`flex-1 rounded-xl py-3 text-base font-medium ${
              tab === "scan" ? "bg-sage text-white" : "border border-ink-muted/15 bg-white text-ink-muted"
            }`}
          >
            Scan
          </button>
        </div>

        {tab === "code" ? (
          <div className="mt-8 flex flex-col items-center gap-6">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="Your friend code" className="h-80 w-80 rounded-2xl" />
            )}
            <p className="text-center text-base text-ink-muted">@{handle}</p>
            <div className="flex w-full gap-4">
              <button onClick={handleCopy} className="btn-secondary flex-1 py-4 text-base">
                <span className="flex items-center justify-center gap-2">
                  <Copy size={20} strokeWidth={1.75} />
                  {copied ? "Copied" : "Copy link"}
                </span>
              </button>
              <button onClick={handleShare} className="btn-primary flex-1 py-4 text-base">
                <span className="flex items-center justify-center gap-2">
                  <Share size={20} strokeWidth={1.75} />
                  Share
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-4">
            <video ref={videoRef} className="aspect-square w-full max-w-md rounded-2xl bg-ink" />
            {scanError && <p className="text-base text-red-600">{scanError}</p>}
            <p className="text-center text-base text-ink-muted">
              Point your camera at a friend&rsquo;s code
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
