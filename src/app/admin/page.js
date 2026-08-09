"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPanel() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // Tracks if user is authorized

  useEffect(() => {
    const protectRoute = async () => {
      // 1. Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // 2. Fetch profile to check admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_admin) {
        setIsAdmin(true);
        fetchSubmissions(); // Only fetch data if they ARE an admin
      } else {
        window.location.href = "/dashboard"; // Kick them out
      }
    };

    protectRoute();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select(`
        id,
        status,
        user_id,
        tasks (title, reward),
        profiles (email)
      `)
      .eq("status", "pending");

    if (data) setSubmissions(data);
    setLoading(false);
  };
  const handleApprove = async (submissionId, userId, amount) => {
    // 1. Update submission status to 'approved'
    const { error: subError } = await supabase
      .from("submissions")
      .update({ status: "approved" })
      .eq("id", submissionId);

    if (subError) return alert("Error updating submission");

    // 2. Add money to user balance using our SQL function
    const { error: balError } = await supabase.rpc("increment_balance", {
      user_id: userId,
      amount: amount,
    });

    if (balError) {
      alert("Submission approved, but balance update failed: " + balError.message);
    } else {
      alert("Success! User paid.");
      fetchSubmissions(); // Refresh list
    }
  };

  // 🛡️ Loading/Security State UI
  if (!isAdmin || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-slate-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }
 
  return (
    <div className="max-w-5xl">
      <h2 className="text-3xl font-black mb-8">Admin: Pending Proofs 🛡️</h2>
      
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-5 font-bold text-slate-600">User</th>
              <th className="p-5 font-bold text-slate-600">Task</th>
              <th className="p-5 font-bold text-slate-600">Reward</th>
              <th className="p-5 font-bold text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} className="border-b border-slate-50 last:border-0">
                <td className="p-5 font-medium text-slate-700">{sub.profiles?.email}</td>
                <td className="p-5 text-slate-500">{sub.tasks?.title}</td>
                <td className="p-5 font-bold text-emerald-600">${sub.tasks?.reward.toFixed(2)}</td>
                <td className="p-5">
                  <button 
                    onClick={() => handleApprove(sub.id, sub.user_id, sub.tasks.reward)}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 transition-all text-sm"
                  >
                    Approve & Pay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && (
          <p className="p-10 text-center text-slate-400 font-bold">No pending submissions to review.</p>
        )}
      </div>
      
    </div>
  );
}