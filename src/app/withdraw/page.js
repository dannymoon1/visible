// "use client";
// import { useState, useEffect } from "react";
// import { supabase } from "@/lib/supabase";

// export default function WithdrawPage() {
//   const [balance, setBalance] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [amount, setAmount] = useState("");
//   const [bankName, setBankName] = useState("");
//   const [accountNumber, setAccountNumber] = useState("");
//   const [accountName, setAccountName] = useState("");
// const [requests, setRequests] = useState([]);
//   useEffect(() => {
//     fetchBalance();
//     fetchRequests();
//   }, []);

//   const fetchBalance = async () => {
//     const { data: { user } } = await supabase.auth.getUser();
//     if (user) {
//       const { data } = await supabase
//         .from('profiles')
//         .select('balance')
//         .eq('id', user.id)
//         .single();
//       if (data) setBalance(data.balance);
//     }
//     setLoading(false);
//   };

// const fetchRequests = async () => {
//   const { data: { user } } = await supabase.auth.getUser();
  
//   const { data, error } = await supabase
//     .from('withdrawals')
//     .select('*')
//     .eq('user_id', user.id)
//     .order('created_at', { ascending: false });

//   if (!error) setRequests(data);
// };

//   const handleWithdraw = async (e) => {
//     e.preventDefault();
//     const withdrawAmount = parseFloat(amount);

//     if (withdrawAmount > balance) {
//       alert("Insufficient funds!");
//       return;
//     }

//     const { data: { user } } = await supabase.auth.getUser();
//     const bankInfo = `${bankName} | ${accountNumber} | ${accountName}`;

//     // Calling the SQL function we created earlier
//     const { error } = await supabase.rpc('request_withdrawal', {
//       user_id_input: user.id,
//       amount_input: withdrawAmount,
//       bank_info: bankInfo
//     });

//     if (error) {
//       alert("Error: " + error.message);
//     } else {
//       alert("Withdrawal request submitted successfully!");
//       setAmount(""); // Clear form
//       fetchBalance(); // Update displayed balance
//     }
//   };

//   const handleCancel = async (id) => {
//   const { data: { user } } = await supabase.auth.getUser();
  
//   const { error } = await supabase.rpc('cancel_withdrawal', {
//     withdrawal_id: id,
//     user_id_input: user.id
//   });

//   if (error) {
//     alert(error.message);
//   } else {
//     alert("Withdrawal cancelled and balance refunded!");
//     fetchBalance(); // Update the main balance display
//     fetchRequests(); // Refresh the list
//   }
// };
//   return (
//     <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
//       <h2>Withdraw Funds 🏦</h2>
//       <div style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
//         <p>Available Balance:</p>
//         <h1 style={{ color: '#2ecc71' }}>₦{balance.toLocaleString()}</h1>
//       </div>

//       <form onSubmit={handleWithdraw}>
//         <label>Amount to Withdraw</label>
//         <input 
//           type="number" 
//           min="500" 
//           step="1"
//           value={amount} 
//           onChange={(e) => setAmount(e.target.value)} 
//           placeholder="Min ₦500"
//           required 
//           style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
//         />

//         <label>Bank Name</label>
//         <input 
//           type="text" 
//           value={bankName} 
//           onChange={(e) => setBankName(e.target.value)} 
//           placeholder="e.g. GTBank"
//           required 
//           style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
//         />

//         <label>Account Number</label>
//         <input 
//           type="text" 
//           value={accountNumber} 
//           onChange={(e) => setAccountNumber(e.target.value)} 
//           placeholder="10 digits"
//           required 
//           style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
//         />

//         <label>Account Name</label>
//         <input 
//           type="text" 
//           value={accountName} 
//           onChange={(e) => setAccountName(e.target.value)} 
//           placeholder="Name on account"
//           required 
//           style={{ width: '100%', marginBottom: '20px', padding: '8px' }}
//         />

//         <button type="submit" style={{ width: '100%', padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '5px' }}>
//           Submit Request
//         </button>
//       </form>

//       <div>
//         {requests.map((req) => (
//   <div key={req.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
//     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//       <strong>₦{req.amount}</strong>
//       <span style={{ 
//         color: req.status === 'pending' ? 'orange' : 'green',
//         fontWeight: 'bold' 
//       }}>
//         {req.status.toUpperCase()}
//       </span>
//     </div>
//     <small style={{ color: '#666' }}>{req.bank_details}</small>
//     <div><button onClick={handleCancel}></button></div>
//   </div>
// ))}
//       </div>
//     </div>
//   );
// }


"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner"; // Import Sonner

export default function WithdrawPage() {
  const [balance, setBalance] = useState(0);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        refreshData(user.id);
        setupRealtimeSubscription(user.id);
      }
    };
    setup();
  }, []);

  // --- REALTIME LISTENER ---
  const setupRealtimeSubscription = (id) => {
    const channel = supabase
      .channel('withdrawal-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${id}`,
        },
        (payload) => {
          console.log("Change detected!", payload);
          
          // Trigger Toasts based on what the AI Agent did
          if (payload.new.status === 'approved') {
            toast.success("Withdrawal Approved! 🚀", {
              description: "AI verified your funds. Check your email for details."
            });
          } else if (payload.new.status === 'canceled' && payload.new.verification_details) {
            toast.error("Withdrawal Canceled", {
              description: `Reason: ${payload.new.verification_details.replace('_', ' ')}`
            });
          }

          // Refresh the UI to show new balance and status
          refreshData(id);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const refreshData = async (uid) => {
    const currentId = uid || userId;
    if (!currentId) return;

    // 1. Fetch Balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', currentId)
      .single();
    if (profile) setBalance(profile.balance);

    // 2. Fetch History
    const { data: history } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', currentId)
      .order('created_at', { ascending: false });
    if (history) setRequests(history);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const bankInfo = `${bankName} | ${accountNumber} | ${accountName}`;

    const { error } = await supabase.rpc('request_withdrawal', {
      user_id_input: userId,
      amount_input: parseFloat(amount),
      bank_info: bankInfo
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.info("Request sent! Our AI is verifying your balance...");
      setAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      refreshData();
    }
  };

  const handleCancel = async (id) => {
    const { error } = await supabase.rpc('cancel_withdrawal', {
      withdrawal_id: id,
      user_id_input: userId
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.warning("Withdrawal canceled.");
      refreshData();
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* 1. The Toaster Component must be present */}
      <Toaster richColors position="top-center" />

      <div style={{ background: '#2c3e50', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <p style={{ margin: 0, opacity: 0.8 }}>Available Balance</p>
        <h1 style={{ margin: '5px 0' }}>₦{balance.toLocaleString()}</h1>
      </div>

      <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input type="number" min="500" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} required />
        <input type="text" placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} required />
        <input type="text" placeholder="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
        <input type="text" placeholder="Account Name" value={accountName} onChange={e => setAccountName(e.target.value)} required />
        <button type="submit" style={{ padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Request Withdrawal
        </button>
      </form>

      <h3 style={{ marginTop: '30px' }}>Recent Activity ⏳</h3>
      {requests.map(req => (
        <div key={req.id} style={{ padding: '15px 0', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>₦{req.amount.toLocaleString()}</strong><br/>
              <small style={{ color: '#666' }}>{req.bank_details}</small>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ 
                color: req.status === 'pending' ? '#f39c12' : req.status === 'approved' ? '#27ae60' : '#e74c3c', 
                fontWeight: 'bold',
                fontSize: '12px'
              }}>
                {req.status.toUpperCase()}
              </span>
              {req.status === 'pending' && (
                <button onClick={() => handleCancel(req.id)} style={{ display: 'block', fontSize: '10px', color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', marginTop: '5px' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
// "use client";
// import { useState, useEffect } from "react";
// import { supabase } from "@/lib/supabase";

// export default function WithdrawPage() {
//   const [balance, setBalance] = useState(0);
//   const [requests, setRequests] = useState([]);
//   const [amount, setAmount] = useState("");
//   const [bankName, setBankName] = useState("");
//   const [accountNumber, setAccountNumber] = useState("");
//   const [accountName, setAccountName] = useState("");

//   useEffect(() => {
//     refreshData();
//   }, []);

//   const refreshData = async () => {
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return;

//     // 1. Fetch Balance
//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('balance')
//       .eq('id', user.id)
//       .single();
//     if (profile) setBalance(profile.balance);

//     // 2. Fetch History
//     const { data: history } = await supabase
//       .from('withdrawals')
//       .select('*')
//       .eq('user_id', user.id)
//       .order('created_at', { ascending: false });
//     if (history) setRequests(history);
//   };

//   const handleWithdraw = async (e) => {
//     e.preventDefault();
//     const { data: { user } } = await supabase.auth.getUser();
//     const bankInfo = `${bankName} | ${accountNumber} | ${accountName}`;

//     const { error } = await supabase.rpc('request_withdrawal', {
//       user_id_input: user.id,
//       amount_input: parseFloat(amount),
//       bank_info: bankInfo
//     });

//     if (error) alert(error.message);
//     else {
//       setAmount("");
//       refreshData();
//     }
//   };

//  const handleCancel = async (id) => {
//   const { data: { user } } = await supabase.auth.getUser();
  
//   if (!user) return;

//   const { error } = await supabase.rpc('cancel_withdrawal', {
//     withdrawal_id: id,      // Matches the SQL parameter
//     user_id_input: user.id  // Matches the SQL parameter
//   });

//   if (error) {
//     alert(error.message);
//   } else {
//     alert("Withdrawal canceled successfully! ❌");
//     refreshData(); // This refreshes the list so the item disappears or updates
//   }
// };

//   return (
//     <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
//       <div style={{ background: '#2c3e50', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
//         <p style={{ margin: 0, opacity: 0.8 }}>Available Balance</p>
//         <h1 style={{ margin: '5px 0' }}>₦{balance.toLocaleString()}</h1>
//       </div>

//       <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//         <input type="number" min="500" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} required />
//         <input type="text" placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} required />
//         <input type="text" placeholder="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
//         <input type="text" placeholder="Account Name" value={accountName} onChange={e => setAccountName(e.target.value)} required />
//         <button type="submit" style={{ padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px' }}>Request Withdrawal</button>
//       </form>

//       <h3 style={{ marginTop: '30px' }}>Recent Activity ⏳</h3>
//       {requests.map(req => (
//         <div key={req.id} style={{ padding: '15px 0', borderBottom: '1px solid #eee' }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//             <div>
//               <strong>₦{req.amount}</strong><br/>
//               <small>{req.bank_details}</small>
//             </div>
//             <div style={{ textAlign: 'right' }}>
//               <span style={{ color: req.status === 'pending' ? '#f39c12' : '#27ae60', fontWeight: 'bold' }}>{req.status.toUpperCase()}</span>
//               {req.status === 'pending' && (
//                 <button onClick={() => handleCancel(req.id)} style={{ display: 'block', fontSize: '10px', color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Cancel</button>
//               )}
//             </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }