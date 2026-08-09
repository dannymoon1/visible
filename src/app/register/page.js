"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const router = useRouter();
  

 const handleRegister = async (e) => {
  e.preventDefault();
  
  // DEBUG CHECK: If these are empty, Supabase thinks it's an anonymous attempt
  if (!email || !password) {
    alert("Please fill in both fields");
    return;
  }

  setLoading(true);
  console.log("Attempting signup for:", email); // Look at your browser console (F12)

  const { data, error } = await supabase.auth.signUp({
  email: email.trim(),
  password: password,
  options: {
    data: {
      username: username, // Make sure 'username' is the variable holding the user's input!
    },
  },
});
  if (error) {
    console.error("Supabase Error:", error);
    alert(error.message);
  } else {
    alert("Success! Check the profiles table.");
    router.push("/login");
  }
  setLoading(false);
};

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Side: Welcome Message */}
      <div className="md:w-1/2 bg-purple-600 p-12 flex flex-col justify-center text-white">
        <h1 className="text-5xl font-black mb-6">Start Earning Today. 🚀</h1>
        <p className="text-xl text-purple-100 max-w-md">
          Join SocialEarn and get paid for engaging with your favorite brands on Instagram, TikTok, and more. 
        </p>
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-full">✅</div>
            <p className="font-bold">Real-time balance updates</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-full">✅</div>
            <p className="font-bold">Fast payouts starting at $5.00</p>
          </div>
        </div>
      </div>

      {/* Right Side: Signup Form */}
      <div className="md:w-1/2 p-12 flex flex-col justify-center bg-slate-50">
        <div className="max-w-md mx-auto w-full">
          <h2 className="text-3xl font-black text-slate-900 mb-2">Create Account</h2>
          <p className="text-slate-500 mb-8">Enter your details to join the community.</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="name@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
<div>
  <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
  <input 
    type="text" 
    required
    className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
    placeholder="Choose a unique username"
    onChange={(e) => setUsername(e.target.value)}
  />
</div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <input 
                type="password" 
                required
                className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Join Now"}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 font-medium">
            Already have an account? <Link href="/login" className="text-purple-600 font-bold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}