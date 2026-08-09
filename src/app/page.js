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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setTasks(data);
    setLoading(false);
  };

 const handleVerify = async (taskId, reward) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return alert("Please log in!");

  console.log("Submitting for User:", user.id);
  console.log("Submitting for Task:", taskId);

  const { error } = await supabase.from("submissions").insert([
    { 
      task_id: taskId, 
      user_id: user.id, 
      status: "pending" 
    },
  ]);

  if (error) {
    // This will show us the REAL reason it's failing in the console
    console.error("Submission Error:", error);
    alert(`Error: ${error.message}`); 
  } else {
    alert(`Success! Proof submitted for $${reward}.`);
  }
};

  if (loading) return <div className="p-10 font-bold text-slate-400">Loading tasks...</div>;

  return (
    <div className="max-w-4xl">
      <header className="mb-10">
        <h2 className="text-4xl font-black text-slate-900">Available Tasks</h2>
        <p className="text-slate-500 font-medium">Complete these tasks to earn instant rewards.</p>
      </header>

      <div className="grid gap-4">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div key={task.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">
                  {task.platform === 'Instagram' ? '📸' : '🎵'}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">{task.title}</h3>
                  <p className="text-slate-500 text-sm font-medium">{task.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Reward</p>
                  <p className="text-xl font-black text-emerald-600">${task.reward.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => handleVerify(task.id, task.reward)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-600 transition-all"
                >
                  Verify Work
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-100 p-10 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">No tasks available right now. Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
}