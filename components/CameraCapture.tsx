"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { submitCompletion } from "@/app/actions/completions";

export default function CameraCapture({
  dailyChallengeId,
}: {
  dailyChallengeId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setError(null);
  }

  function retake() {
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("dailyChallengeId", dailyChallengeId);
      formData.set("photo", file);
      formData.set("caption", caption);
      await submitCompletion(formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (!previewUrl) {
    return (
      <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-sage text-white active:scale-95">
        <Camera size={26} strokeWidth={1.75} />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <img
        src={previewUrl}
        alt="Your proof"
        className="aspect-square w-full rounded-2xl object-cover"
      />
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a caption (optional)"
        maxLength={280}
        className="w-full rounded-xl border border-ink-muted/25 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-ink-muted"
      />
      <div className="flex w-full gap-3">
        <button onClick={retake} disabled={submitting} className="btn-secondary flex-1 py-3">
          Retake
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 py-3">
          {submitting ? "Submitting..." : "Did it"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
