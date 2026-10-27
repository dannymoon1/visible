"use client";
import { useState, useEffect } from "react";
import { Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatNaira } from "@/components/ui";

export default function RealtimeBalance() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchInitialBalance = async () => {
      // Get the user from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();

      // Guard Clause: If there is no user, stop here to avoid errors
      if (!user) {
        console.log("No user found, skipping balance fetch.");
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching balance:", error.message);
      } else if (data) {
        setBalance(data.balance);
      }
    };

    fetchInitialBalance();

    // Set up the Realtime Subscription
    const channel = supabase
      .channel('realtime_balance')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Change received!', payload);
          // Optional: You could also check if payload.new.id === currentUserId here
          setBalance(payload.new.balance);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-400/20 bg-gradient-to-br from-ink-800 to-ink-900 p-4">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold-400/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-300">
          Live Balance
        </p>
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
          <Radio className="h-3 w-3 animate-pulse" />
          Live
        </span>
      </div>
      <p className="tabular mt-2 font-display text-2xl font-semibold text-white transition-all duration-500">
        {formatNaira(balance)}
      </p>
    </div>
  );
}
