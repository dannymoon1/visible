// "use client";
// import { usePaystackPayment } from "react-paystack";

// export default function PayButton({ amount, email, metadata }) {
//   const config = {
//     reference: (new Date()).getTime().toString(),
//     email: email,
//     amount: amount * 100, // Paystack uses Kobo/Cents (e.g., $1.00 = 100)
//     publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
//     metadata: metadata // This is where we store the social link they want promoted
//   };

//   const initializePayment = usePaystackPayment(config);

//   const onSuccess = (reference) => {
//     // This runs after the user successfully pays
//     console.log("Payment Successful! Ref:", reference);
//     alert("Payment Received! Your task is now pending admin approval.");
//     // We will later add code here to save the link to Supabase
//   };

//   const onClose = () => {
//     console.log("Payment window closed");
//   };

//   return (
//     <button 
//       onClick={() => initializePayment(onSuccess, onClose)}
//       className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all"
//     >
//       Pay ${amount} Now
//     </button>
//   );
// }


"use client";

export default function PayButton({
  amount,
  email,
  metadata,
}) {
  const handlePayment = async () => {
    try {
      const publicKey =
        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

      if (!publicKey) {
        console.error(
          "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is missing."
        );

        alert(
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

          alert(
            "Payment Received! Your task is now pending admin approval."
          );
        },

        onCancel: () => {
          console.log("Payment window closed.");
        },

        onError: (error) => {
          console.error("Paystack Error:", error);
          alert("Payment could not be completed.");
        },
      });
    } catch (error) {
      console.error(
        "Paystack initialization failed:",
        error
      );

      alert(
        "Unable to initialize payment. Please try again."
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handlePayment}
      className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition-all hover:bg-blue-700"
    >
      Pay ₦{Number(amount).toLocaleString()} Now
    </button>
  );
}