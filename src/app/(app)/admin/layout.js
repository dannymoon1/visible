// Admin screens show live data behind a login, so they render on each request
// instead of being pre-built at deploy time. (Pre-building /admin/campaigns
// also trips a Next.js 16.1 invariant: "Expected workUnitAsyncStorage to have
// a store".)
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }) {
  return children;
}
