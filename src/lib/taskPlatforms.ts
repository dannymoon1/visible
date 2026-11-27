// A campaign's platforms as a list. Newer campaigns store `platforms`; older
// ones only have the comma-separated `platform` text. Kept free of React and
// icon imports so server routes can use it.
export function taskPlatforms(
  task: { platforms?: string[] | null; platform?: string | null } | null | undefined
): string[] {
  if (Array.isArray(task?.platforms) && task.platforms.length) return task.platforms;
  return String(task?.platform || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}
