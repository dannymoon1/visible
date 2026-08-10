// "use client";
// import { useState } from "react";
// import { usePaystackPayment } from "react-paystack";

// export default function OrderPage() {
//   const [link, setLink] = useState("");
//   const [platform, setPlatform] = useState("Instagram");
//   const [selectedPackage, setSelectedPackage] = useState({ likes: 50, price: 2 });

//   // Packages available for clients
//   const packages = [
//     { likes: 50, price: 2 },
//     { likes: 100, price: 4 },
//     { likes: 500, price: 15 },
//   ];

//   const config = {
//     reference: (new Date()).getTime().toString(),
//     email: "client@example.com", // In a real app, get this from the logged-in user
//     amount: selectedPackage.price * 100, // Paystack amount is in kobo/cents
//     publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
//     metadata: {
//       link: link,
//       platform: platform,
//       type: "likes"
//     }
//   };

//   const initializePayment = usePaystackPayment(config);

//  const onSuccess = async (reference) => {
//   const { data, error } = await supabase
//     .from('tasks')
//     .insert([
//       { 
//         link: link, 
//         platform: platform, 
//         num_engagements: selectedPackage.likes,
//         status: 'pending' // Admin must approve before it goes live
//       }
//     ]);

//   if (error) {
//     alert("Error saving task: " + error.message);
//   } else {
//     alert("Payment successful! Your campaign is now pending admin approval.");
//     router.push("/"); // Send client back to home
//   }
// };

//   return (
//     <div className="max-w-2xl mx-auto py-10 px-6">
//       <h1 className="text-3xl font-black mb-2 text-slate-900">Promote Your Content</h1>
//       <p className="text-slate-500 mb-8">Boost your engagement in minutes.</p>

//       <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
//         {/* Platform Selection */}
//         <div>
//           <label className="block text-sm font-bold text-slate-700 mb-3">Select Platform</label>
//           <div className="flex gap-3">
//             {["Instagram", "TikTok", "X"].map((p) => (
//               <button
//                 key={p}
//                 onClick={() => setPlatform(p)}
//                 className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
//                   platform === p ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-100 text-slate-400"
//                 }`}
//               >
//                 {p}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Link Input */}
//         <div>
//           <label className="block text-sm font-bold text-slate-700 mb-2">Post URL</label>
//           <input 
//             type="url"
//             placeholder="https://..."
//             className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
//             onChange={(e) => setLink(e.target.value)}
//             required
//           />
//         </div>

//         {/* Package Selection */}
//         <div>
//           <label className="block text-sm font-bold text-slate-700 mb-3">Choose Package</label>
//           <div className="space-y-3">
//             {packages.map((pkg) => (
//               <div 
//                 key={pkg.likes}
//                 onClick={() => setSelectedPackage(pkg)}
//                 className={`flex justify-between items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
//                   selectedPackage.likes === pkg.likes ? "border-purple-600 bg-purple-50" : "border-slate-100"
//                 }`}
//               >
//                 <span className="font-bold text-slate-900">{pkg.likes} Likes</span>
//                 <span className="text-purple-600 font-black">${pkg.price}</span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Pay Button */}
//         <button 
//           disabled={!link}
//           onClick={() => initializePayment(onSuccess)}
//           className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg"
//         >
//           Pay ${selectedPackage.price} & Launch Campaign
//         </button>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OrderTask() {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [amount, setAmount] = useState(5000);
  const [loading, setLoading] = useState(false);

  const handlePayment = async (e) => {
    e.preventDefault();

    if (!title.trim() || !link.trim()) {
      alert("Please enter a task title and link.");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

    if (!publicKey) {
      console.error("Paystack public key is missing.");
      alert("Payment configuration is missing.");
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
              reward: 500,
              platform: "Social Media",
              link: link,
            },
          ]);

          if (error) {
            console.error(
              "Supabase Insert Error:",
              error.message
            );

            alert(
              "Payment worked, but the task failed to save: " +
                error.message
            );

            return;
          }

          alert(
            "Payment Successful! Task is now pending admin approval."
          );

          // Optional: clear the form
          setTitle("");
          setLink("");
        },

        onCancel: () => {
          console.log("Payment cancelled.");
          alert("Payment Cancelled.");
        },

        onError: (error) => {
          console.error("Paystack Error:", error);
          alert("Payment could not be completed.");
        },
      });
    } catch (error) {
      console.error("Paystack initialization failed:", error);
      alert(
        "Unable to initialize payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          Promote Your Link 🚀
        </h1>

        <p className="mb-8 text-slate-600">
          Create a social media engagement task and launch it
          after payment.
        </p>

        <form onSubmit={handlePayment} className="space-y-6">
          <div>
            <label className="mb-2 block font-semibold text-slate-700">
              Task Title
            </label>

            <input
              type="text"
              className="w-full rounded-2xl border bg-slate-50 p-4 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Follow @MyBrand"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-slate-700">
              Your Link
            </label>

            <input
              type="url"
              className="w-full rounded-2xl border bg-slate-50 p-4 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://instagram.com/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-slate-700">
              Campaign Amount
            </label>

            <input
              type="number"
              min="100"
              className="w-full rounded-2xl border bg-slate-50 p-4 outline-none focus:ring-2 focus:ring-blue-500"
              value={amount}
              onChange={(e) =>
                setAmount(Number(e.target.value))
              }
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Opening Payment..."
              : `Pay ₦${amount.toLocaleString()} to Launch Task`}
          </button>
        </form>
      </div>
    </main>
  );
}