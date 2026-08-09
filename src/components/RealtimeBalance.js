"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function RealtimeBalance() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchInitialBalance = async () => {
      // Get the user from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      
      // 🛡️ Guard Clause: If there is no user, stop here to avoid errors
      if (!user) {
        console.log("No user found, skipping balance fetch.");
        return;
      }

      // Now it's safe to use user.id
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
    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
      <p className="text-xs font-bold text-emerald-700 uppercase">Live Balance</p>
      <h2 className="text-2xl font-black text-emerald-600 transition-all duration-500">
        ${balance.toFixed(2)}
      </h2>
    </div>
  );
}