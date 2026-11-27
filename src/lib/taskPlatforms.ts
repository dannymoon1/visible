// Campaign platforms: the new array column, falling back to the
// older comma-separated `platform` text for legacy tasks.
// Kept apart from src/components/PlatformIcon.tsx so server routes can use it
// without loading the icon library (it needs React context, which breaks the build).
export function taskPlatforms(
  task: { platforms?: string[] | null; platform?: string | null } | null | undefined
): string[] {
  if (Array.isArray(task?.platforms) && task.platforms.length) return task.platforms;
  return String(task?.platform || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}
