import Link from "next/link";
import Logo from "@/components/site/Logo";

const COLUMNS = [
  {
    title: "Businesses",
    links: [
      { href: "/order", label: "Start a campaign" },
      { href: "/calculator", label: "Work out your budget" },
    ],
  },
  {
    title: "Creators",
    links: [{ href: "/creators", label: "Market Rewards" }],
  },
  {
    title: "Agents",
    links: [{ href: "/agents", label: "Become a Visibility Agent" }],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo className="h-10" />
          <p className="max-w-xs text-sm text-muted">
            Local creators, paid fairly for real views. Starting in Uyo and Ikot Ekpene, Akwa Ibom.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="font-heading text-sm font-semibold">{column.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {column.links.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} Visibility Campaigns. Every post carries a paid-partnership label.
        </p>
      </div>
    </footer>
  );
}
