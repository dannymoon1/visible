// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />
//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             To get started, edit the page.js file.
//           </h1>
//           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
//             Looking for a starting point or more instructions? Head over to{" "}
//             <a
//               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Templates
//             </a>{" "}
//             or the{" "}
//             <a
//               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Learning
//             </a>{" "}
//             center.
//           </p>
//         </div>
//         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
//           <a
//             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={16}
//               height={16}
//             />
//             Deploy Now
//           </a>
//           <a
//             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Documentation
//           </a>
//         </div>
//       </main>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingTask, setSubmittingTask] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    // Get logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Get all tasks
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (taskError) {
      console.error("Task loading error:", taskError);
      setLoading(false);
      return;
    }

    // Get this user's submissions
    const { data: submissionData, error: submissionError } =
      await supabase
        .from("submissions")
        .select("task_id, status")
        .eq("user_id", user.id);

    if (submissionError) {
      console.error("Submission loading error:", submissionError);
      setLoading(false);
      return;
    }

    // Convert submissions into an object:
    // {
    //   "task-id-1": "pending",
    //   "task-id-2": "approved"
    // }
    const submissionMap = {};

    submissionData?.forEach((submission) => {
      submissionMap[submission.task_id] = submission.status;
    });

    setTasks(taskData || []);
    setSubmissions(submissionMap);

    setLoading(false);
  };

  const handleVerify = async (taskId, reward) => {
    // IMPORTANT:
    // Don't even contact Supabase if the task was already submitted.
    if (submissions[taskId]) {
      alert(
        `You have already submitted this task. Status: ${submissions[taskId]}`
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in!");
      return;
    }

    setSubmittingTask(taskId);

    const { error } = await supabase
      .from("submissions")
      .insert([
        {
          task_id: taskId,
          user_id: user.id,
          status: "pending",
        },
      ]);

    if (error) {
      console.error("Submission Error:", error);

      // PostgreSQL duplicate-key error
      if (error.code === "23505") {
        alert("You have already submitted this task.");

        // Update UI immediately
        setSubmissions((previous) => ({
          ...previous,
          [taskId]: "pending",
        }));
      } else {
        alert(`Error: ${error.message}`);
      }

      setSubmittingTask(null);
      return;
    }

    // Mark task as submitted immediately
    setSubmissions((previous) => ({
      ...previous,
      [taskId]: "pending",
    }));

    setSubmittingTask(null);

    alert(`Success! Proof submitted for ₦${reward}.`);
  };

  if (loading) {
    return (
      <div className="p-10 font-bold text-slate-400">
        Loading tasks...
      </div>
    );
  }

  // Tasks the user has NOT submitted
  const availableTasks = tasks.filter(
    (task) => !submissions[task.id]
  );

  // Tasks the user HAS submitted
  const submittedTasks = tasks.filter(
    (task) => submissions[task.id]
  );

  return (
    <div className="max-w-4xl">

      {/* ============================= */}
      {/* AVAILABLE TASKS */}
      {/* ============================= */}

      <header className="mb-10">
        <h2 className="text-4xl font-black text-slate-900">
          Available Tasks
        </h2>

        <p className="text-slate-500 font-medium">
          Complete these tasks to earn instant rewards.
        </p>
      </header>

      <div className="grid gap-4">

        {availableTasks.length > 0 ? (
          availableTasks.map((task) => (

            <div
              key={task.id}
              className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
            >

              <div className="flex items-center gap-5">

                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">
                  {task.platform === "Instagram"
                    ? "📸"
                    : "🎵"}
                </div>

                <div>
                  <h3 className="font-black text-slate-900 text-lg">
                    {task.title}
                  </h3>

                  <p className="text-slate-500 text-sm font-medium">
                    {task.description}
                  </p>
                </div>

              </div>

              <div className="flex items-center gap-6">

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Reward
                  </p>

                  <p className="text-xl font-black text-emerald-600">
                    ₦{Number(task.reward || 0).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() =>
                    handleVerify(task.id, task.reward)
                  }
                  disabled={submittingTask === task.id}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingTask === task.id
                    ? "Submitting..."
                    : "Verify Work"}
                </button>

              </div>

            </div>

          ))
        ) : (

          <div className="bg-slate-100 p-10 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">
              No new tasks available right now.
            </p>
          </div>

        )}

      </div>


      {/* ============================= */}
      {/* SUBMITTED TASKS */}
      {/* ============================= */}

      {submittedTasks.length > 0 && (
        <section className="mt-14">

          <header className="mb-6">
            <h2 className="text-2xl font-black text-slate-800">
              Your Submitted Tasks
            </h2>

            <p className="text-slate-500 font-medium">
              Tasks you have already submitted.
            </p>
          </header>

          <div className="grid gap-4">

            {submittedTasks.map((task) => {

              const status = submissions[task.id];

              return (
                <div
                  key={task.id}
                  className="bg-slate-100 p-6 rounded-3xl border border-slate-200 flex items-center justify-between opacity-75"
                >

                  <div className="flex items-center gap-5">

                    <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center text-2xl grayscale">
                      {task.platform === "Instagram"
                        ? "📸"
                        : "🎵"}
                    </div>

                    <div>

                      <h3 className="font-black text-slate-600 text-lg">
                        {task.title}
                      </h3>

                      <p className="text-slate-400 text-sm font-medium">
                        {task.description}
                      </p>

                      <p className="text-xs font-bold uppercase mt-1">
                        Status:{" "}
                        <span
                          className={
                            status === "approved"
                              ? "text-emerald-600"
                              : status === "rejected"
                              ? "text-red-500"
                              : "text-amber-500"
                          }
                        >
                          {status}
                        </span>
                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-6">

                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">
                        Reward
                      </p>

                      <p className="text-xl font-black text-slate-500">
                        ₦{Number(task.reward || 0).toLocaleString()}
                      </p>
                    </div>

                    <button
                      disabled
                      className="bg-slate-300 text-slate-500 px-6 py-3 rounded-xl font-bold cursor-not-allowed"
                    >
                      ✓ Submitted
                    </button>

                  </div>

                </div>
              );
            })}

          </div>

        </section>
      )}

    </div>
  );
}