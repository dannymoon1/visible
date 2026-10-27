"use client";

import { toast } from "sonner";
import {
  CreditCard,
  Landmark,
  Smartphone,
  Lock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  Button,
  Card,
  PageHeader,
  Badge,
  formatNaira,
} from "@/components/ui";

// Payment methods available inside the Paystack checkout window
const PAYMENT_METHODS = [
  {
    icon: CreditCard,
    title: "Debit or credit card",
    description: "Visa, Mastercard and Verve.",
  },
  {
    icon: Landmark,
    title: "Bank transfer",
    description: "Pay from any Nigerian bank account.",
  },
  {
    icon: Smartphone,
    title: "USSD",
    description: "Dial a short code from your phone.",
  },
];

export default function PayButton({
  amount,
  email,
  metadata,
}) {
  const handlePayment = async () => {
    try {
      const publicKey =
        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      console.log("Paystack public key loaded:", Boolean(publicKey));
      if (!publicKey) {
        console.error(
          "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is missing."
        );

        toast.error(
          "Payment configuration is missing. Please contact support."
        );

        return;
      }

      // Import Paystack ONLY when running in the browser
      // and only when the user clicks the payment button.
      const { default: PaystackPop } = await import(
        "@paystack/inline-js"
      );

      const paystack = new PaystackPop();

      paystack.newTransaction({
        key: publicKey,

        email: email,

        amount: Number(amount) * 100,

        reference: `VISIBLE-${Date.now()}`,

        metadata: metadata,

        onSuccess: (transaction) => {
          console.log(
            "Payment Successful! Ref:",
            transaction.reference
          );

          toast.success(
            "Payment Received! Your task is now pending admin approval."
          );
        },

        onCancel: () => {
          console.log("Payment window closed.");
        },

        onError: (error) => {
          console.error("Paystack Error:", error);
          toast.error("Payment could not be completed.");
        },
      });
    } catch (error) {
      console.error(
        "Paystack initialization failed:",
        error
      );

      toast.error(
        "Unable to initialize payment. Please try again."
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Checkout"
        title="Payment options"
        description="Choose how you'd like to pay in the secure Paystack window."
      />

      <div className="space-y-6 animate-fade-in">
        <div className="space-y-3">
          {PAYMENT_METHODS.map(({ icon: Icon, title, description }) => (
            <button
              key={title}
              type="button"
              onClick={handlePayment}
              className="group flex w-full items-center gap-4 rounded-2xl border border-ink-200/70 bg-white p-4 text-left shadow-soft transition-all hover:border-brand-300 hover:shadow-lifted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 sm:p-5"
            >
              <span className="shrink-0 rounded-xl bg-brand-50 p-2.5 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink-900">
                  {title}
                </span>
                <span className="block text-sm text-ink-500">
                  {description}
                </span>
              </span>
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-ink-300 transition-colors group-hover:text-brand-600"
                strokeWidth={2}
              />
            </button>
          ))}
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-ink-500">
              Amount due
            </span>
            <span className="tabular font-display text-3xl font-semibold tracking-tight text-ink-950">
              {formatNaira(amount)}
            </span>
          </div>

          <Button
            type="button"
            variant="brand"
            size="lg"
            icon={Lock}
            onClick={handlePayment}
            className="mt-5 w-full"
          >
            Pay {formatNaira(amount)} Now
          </Button>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-500">
            <ShieldCheck
              className="h-3.5 w-3.5 text-emerald-600"
              strokeWidth={2.25}
            />
            <span>Secured by Paystack</span>
            <Badge tone="success">Encrypted</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
