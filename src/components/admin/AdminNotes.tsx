"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";

export function AdminNotes({
  submissionId,
  initial,
}: {
  submissionId: string;
  initial: string;
}) {
  const [notes, setNotes] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch(`/api/admin/submissions/${submissionId}`, {
        adminNotes: notes,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <textarea
        className="input min-h-[80px]"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Internal notes about this submission…"
      />
      <div className="mt-2 flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save notes"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </div>
  );
}
