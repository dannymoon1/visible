"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPanel() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    const protectRoute = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Admin check error:", error);
        setLoading(false);
        return;
      }

      if (profile?.is_admin) {
        setIsAdmin(true);
        await fetchSubmissions();
      } else {
        window.location.href = "/dashboard";
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
        created_at,
        tasks (
          title,
          reward
        ),
        profiles (
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching submissions:", error);
    } else {
      setSubmissions(data || []);
    }

    setLoading(false);
  };

  const handleApprove = async (submissionId) => {
    try {
      setApprovingId(submissionId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You are not logged in.");
        return;
      }

      const { data, error } = await supabase.rpc(
        "approve_submission",
        {
          p_submission_id: submissionId,
          p_admin_id: user.id,
        }
      );

      if (error) {
        console.error("Approval error:", error);
        alert(error.message);
        return;
      }

      console.log("Approval successful:", data);

      alert(
        `Success! ₦${Number(data.amount).toLocaleString()} has been credited to the user.`
      );

      // Reload ALL submissions so the approved one
      // moves from Pending to Approved.
      await fetchSubmissions();

    } catch (error) {
      console.error("Unexpected error:", error);
      alert("Something went wrong while approving this submission.");
    } finally {
      setApprovingId(null);
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>

        <p className="mt-4 text-slate-500 font-medium">
          Verifying authorization...
        </p>
      </div>
    );
  }

  // Separate submissions based on status
  const pendingSubmissions = submissions.filter(
    (sub) => sub.status === "pending"
  );

  const approvedSubmissions = submissions.filter(
    (sub) => sub.status === "approved"
  );

  return (
    <div className="max-w-5xl">

      {/* ================================= */}
      {/* PENDING PROOFS */}
      {/* ================================= */}

      <h2 className="text-3xl font-black mb-8">
        Admin: Pending Proofs 🛡️
      </h2>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">

        {pendingSubmissions.length > 0 ? (

          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-5 font-bold text-slate-600">
                    User
                  </th>

                  <th className="p-5 font-bold text-slate-600">
                    Task
                  </th>

                  <th className="p-5 font-bold text-slate-600">
                    Reward
                  </th>

                  <th className="p-5 font-bold text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>

                {pendingSubmissions.map((sub) => (

                  <tr
                    key={sub.id}
                    className="border-b border-slate-50 last:border-0"
                  >

                    <td className="p-5 font-medium text-slate-700">
                      {sub.profiles?.email}
                    </td>

                    <td className="p-5 text-slate-500">
                      {sub.tasks?.title}
                    </td>

                    <td className="p-5 font-bold text-emerald-600">
                      ₦{Number(sub.tasks?.reward || 0).toLocaleString()}
                    </td>

                    <td className="p-5">

                      <button
                        onClick={() => handleApprove(sub.id)}
                        disabled={approvingId === sub.id}
                        className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approvingId === sub.id
                          ? "Processing..."
                          : "Approve & Pay"}
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>
          </div>

        ) : (

          <p className="p-10 text-center text-slate-400 font-bold">
            No pending submissions to review.
          </p>

        )}

      </div>


      {/* ================================= */}
      {/* APPROVED SUBMISSIONS */}
      {/* ================================= */}

      <div className="mt-12">

        <h2 className="text-2xl font-black mb-6 text-slate-800">
          Approved & Paid ✅
        </h2>

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">

          {approvedSubmissions.length > 0 ? (

            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-emerald-50 border-b border-emerald-100">

                  <tr>

                    <th className="p-5 font-bold text-slate-600">
                      User
                    </th>

                    <th className="p-5 font-bold text-slate-600">
                      Task
                    </th>

                    <th className="p-5 font-bold text-slate-600">
                      Reward
                    </th>

                    <th className="p-5 font-bold text-slate-600">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {approvedSubmissions.map((sub) => (

                    <tr
                      key={sub.id}
                      className="border-b border-slate-50 last:border-0 bg-slate-50/40"
                    >

                      <td className="p-5 font-medium text-slate-500">
                        {sub.profiles?.email}
                      </td>

                      <td className="p-5 text-slate-500">
                        {sub.tasks?.title}
                      </td>

                      <td className="p-5 font-bold text-slate-500">
                        ₦{Number(sub.tasks?.reward || 0).toLocaleString()}
                      </td>

                      <td className="p-5">

                        <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm">
                          ✓ Approved & Paid
                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <p className="p-10 text-center text-slate-400 font-bold">
              No approved submissions yet.
            </p>

          )}

        </div>

      </div>

    </div>
  );
}