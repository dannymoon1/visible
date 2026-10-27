"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Type,
  Link2,
  Wallet,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Rocket,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Card,
  CardHeader,
  PageHeader,
  Field,
  Input,
  formatNaira,
  cn,
} from "@/components/ui";

// Quick-pick campaign amounts (Naira)
const QUICK_AMOUNTS = [2000, 5000, 10000, 25000];

const INCLUDED = [
  "Your link published as an engagement task",
  "Reviewed by our team before going live",
  "Real users engage and submit proof",
];

export default function OrderTask() {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [amount, setAmount] = useState(5000);
  const [loading, setLoading] = useState(false);

  const handlePayment = async (e) => {
    e.preventDefault();

    if (!title.trim() || !link.trim()) {
      toast.error("Please enter a task title and link.");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ;

    if (!publicKey) {
      console.error("Paystack public key is missing.");
      toast.error("Payment configuration is missing.");
      return;
    }

    try {
      setLoading(true);

      // IMPORTANT:
      // Paystack is imported only in the browser after the user
      // clicks the payment button.
      const { default: PaystackPop } = await import(
        "@paystack/inline-js"
      );

      const paystack = new PaystackPop();

      paystack.newTransaction({
        key: publicKey,

        email: "client@example.com",

        amount: Number(amount) * 100,

        reference: `VISIBLE-${Date.now()}`,

        metadata: {
          task_title: title,
          social_link: link,
          platform: "Social Media",
        },

        onSuccess: async (transaction) => {
          console.log(
            "Payment successful, transaction ID:",
            transaction.reference
          );

          // Save the task after payment.
          const { error } = await supabase.from("tasks").insert([
            {
              title: title,
              description: "Click the link and engage!",
              reward: 75,
              platform: "Social Media",
              link: link,
            },
          ]);

          if (error) {
            console.error(
              "Supabase Insert Error:",
              error.message
            );

            toast.error(
              "Payment worked, but the task failed to save: " +
                error.message
            );

            return;
          }

          toast.success(
            "Payment Successful! Task is now pending admin approval."
          );

          // Optional: clear the form
          setTitle("");
          setLink("");
        },

        onCancel: () => {
          console.log("Payment cancelled.");
          toast.info("Payment Cancelled.");
        },

        onError: (error) => {
          console.error("Paystack Error:", error);
          toast.error("Payment could not be completed.");
        },
      });
    } catch (error) {
      console.error("Paystack initialization failed:", error);
      toast.error(
        "Unable to initialize payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Promote"
        title="Launch a campaign"
        description="Create a social media engagement task and launch it after payment."
      />

      <form
        onSubmit={handlePayment}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start animate-fade-in"
      >
        {/* Campaign details */}
        <Card className="min-w-0">
          <CardHeader
            title="Campaign details"
            description="Tell us what you'd like people to engage with."
          />

          <div className="space-y-6 p-6">
            <Field
              label="Task title"
              htmlFor="order-title"
              hint="A short instruction, e.g. what you want people to do."
            >
              <Input
                id="order-title"
                type="text"
                icon={Type}
                placeholder="Follow @MyBrand"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>

            <Field label="Your link" htmlFor="order-link">
              <Input
                id="order-link"
                type="url"
                icon={Link2}
                placeholder="https://instagram.com/..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Campaign amount"
              htmlFor="order-amount"
              hint="Minimum ₦100."
            >
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {QUICK_AMOUNTS.map((value) => {
                  const active = Number(amount) === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(value)}
                      aria-pressed={active}
                      className={cn(
                        "tabular h-10 rounded-xl border text-sm font-semibold transition-all",
                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15",
                        active
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50"
                      )}
                    >
                      {formatNaira(value)}
                    </button>
                  );
                })}
              </div>

              <Input
                id="order-amount"
                type="number"
                min="100"
                icon={Wallet}
                className="tabular"
                value={amount}
                onChange={(e) =>
                  setAmount(Number(e.target.value))
                }
                required
              />
            </Field>
          </div>
        </Card>

        {/* Order summary */}
        <Card className="min-w-0 overflow-hidden lg:sticky lg:top-6">
          <div className="border-b border-ink-100 bg-ink-50/60 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
              Order summary
            </p>
            <div className="mt-3 flex items-start gap-3">
              <span className="rounded-xl bg-brand-50 p-2 text-brand-600">
                <Megaphone className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">
                  {title.trim() || "Untitled campaign"}
                </p>
                <p className="truncate text-sm text-ink-500">
                  {link.trim() || "No link added yet"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink-500">
                Total due
              </span>
              <span className="tabular font-display text-3xl font-semibold tracking-tight text-ink-950">
                {formatNaira(amount)}
              </span>
            </div>

            <ul className="space-y-2.5 border-t border-ink-100 pt-5">
              {INCLUDED.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-ink-600"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    strokeWidth={2.25}
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              loading={loading}
              icon={Rocket}
              className="w-full"
            >
              {loading ? "Opening Payment..." : `Pay ${formatNaira(amount)} & Launch`}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-ink-500">
              <Lock className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span>Secured by Paystack</span>
              <span className="text-ink-300">·</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.25} />
              <span>Encrypted checkout</span>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
