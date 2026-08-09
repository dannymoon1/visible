"use client";
import { usePaystackPayment } from "react-paystack";

export default function PayButton({ amount, email, metadata }) {
  const config = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: amount * 100, // Paystack uses Kobo/Cents (e.g., $1.00 = 100)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    metadata: metadata // This is where we store the social link they want promoted
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference) => {
    // This runs after the user successfully pays
    console.log("Payment Successful! Ref:", reference);
    alert("Payment Received! Your task is now pending admin approval.");
    // We will later add code here to save the link to Supabase
  };

  const onClose = () => {
    console.log("Payment window closed");
  };

  return (
    <button 
      onClick={() => initializePayment(onSuccess, onClose)}
      className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all"
    >
      Pay ${amount} Now
    </button>
  );
}