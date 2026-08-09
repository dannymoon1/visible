"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      // Middleware will now let us through to the home page
      router.push("/");
      router.refresh(); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10 border border-slate-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 mt-2 font-medium">Log in to manage your earnings</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
            <input 
              type="email" 
              className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="name@example.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500 font-medium">
          New here? <Link href="/register" className="text-purple-600 font-bold hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}