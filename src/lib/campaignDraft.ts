// The campaign builder's draft, kept in this browser (decided 2026-11-24:
// browser only for now). localStorage, so a draft survives closing the tab;
// "Save and exit" in the builder relies on it. The banner image can't be
// stored, so it isn't part of the draft.

export const DRAFT_KEY = "vc-campaign-draft";

export function readDraft(): string | null {
  try {
    // Drafts made before 24 Nov 2026 lived in sessionStorage
    return localStorage.getItem(DRAFT_KEY) ?? sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

export function writeDraft(value: unknown): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode): the draft lasts until the page closes
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear
  }
}

// The draft's campaign name and type, for the "continue your draft" notice
export function draftSummary(raw: string | null): { name: string; type: string | null } | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as { name?: unknown; brief?: unknown; type?: unknown };
    const name = typeof d.name === "string" ? d.name.trim() : "";
    const brief = typeof d.brief === "string" ? d.brief.trim() : "";
    if (!name && !brief) return null;
    return { name, type: typeof d.type === "string" ? d.type : null };
  } catch {
    return null;
  }
}
