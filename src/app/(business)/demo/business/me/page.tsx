import { Bell, ChevronRight, CreditCard, LifeBuoy, Receipt, Store, type LucideIcon } from "lucide-react";
import { ScreenTitle } from "@/components/app/parts";
import { BUSINESS, naira } from "@/lib/demo/adiaha";

// Me: the business, its money and settings.
const RECEIPTS = [
  { what: "Shea butter week", when: "4 days ago", amount: 20000 },
  { what: "Christmas glow", when: "December", amount: 15000 },
];

export default function Me() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenTitle title="Me" />

      <section className="mt-6 rounded-[1.75rem] bg-[#14161A] p-6 text-[#F2F3F5]">
        <p className="text-[#9AA1AD]">Wallet</p>
        <p className="mt-1 font-mono text-[2.4rem] leading-none tracking-[-0.03em] tabular-nums">{naira(BUSINESS.wallet)}</p>
        <p className="mt-3 text-sm text-[#9AA1AD]">
          Includes {naira(BUSINESS.credit)} credit from a spot no standby could fill. It&apos;s yours for your next campaign, or
          ask for a refund.
        </p>
        <button type="button" className="press mt-5 h-11 rounded-full bg-ember px-5 font-heading font-semibold text-on-signal">
          Top up
        </button>
      </section>

      <h2 className="mt-8 mb-2.5 px-1 font-heading text-lg font-semibold">Receipts</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] bg-surface ring-1 ring-line">
        {RECEIPTS.map((r) => (
          <li key={r.what} className="flex items-center gap-3.5 px-4 py-3.5">
            <Receipt className="h-5 w-5 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block">{r.what}</span>
              <span className="block text-sm text-muted">{r.when}</span>
            </span>
            <span className="font-mono tabular-nums">{naira(r.amount)}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 mb-2.5 px-1 font-heading text-lg font-semibold">Settings</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] bg-surface ring-1 ring-line">
        <Setting icon={Store} label="Business details" />
        <Setting icon={CreditCard} label="Payment methods" />
        <Setting icon={Bell} label="WhatsApp updates" hint="On" />
        <Setting icon={LifeBuoy} label="Help" />
      </ul>
    </div>
  );
}

function Setting({ icon: Icon, label, hint }: { icon: LucideIcon; label: string; hint?: string }) {
  return (
    <li>
      <button type="button" className="press flex w-full items-center gap-3.5 px-4 py-3.5 text-left">
        <Icon className="h-5 w-5 text-muted" aria-hidden="true" />
        <span className="flex-1">{label}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
        <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
      </button>
    </li>
  );
}
