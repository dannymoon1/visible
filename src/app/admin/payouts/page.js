"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPayouts() {
  const [requests, setRequests] = useState([]);
  const [view, setView] = useState('pending'); // 'pending' or 'history'
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);
  const [isProcessing, setIsProcessing] = useState(null); // Stores the ID of the withdrawal being paid
  const itemsPerPage = 20;

  // Inside your AdminPayouts component
useEffect(() => {
  const protectRoute = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user?.id)
      .single();

    if (!profile?.is_admin) {
      window.location.href = "/dashboard"; // Kick them out if not admin! 🚫
    }
  };
  protectRoute();
}, []);
  useEffect(() => {
    fetchAdminData();
    fetchTotalPending();
  }, [view, page]);

  const fetchAdminData = async () => {
    setLoading(true);
    const from = page * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
      .from('withdrawals')
      .select('*, profiles!left(username)')
      .range(from, to);

    if (view === 'pending') {
      // FIFO: Oldest first to process fairly ⏳
      query = query.eq('status', 'pending').order('created_at', { ascending: true });
    } else {
      // Newest first to see recent activity 📜
      query = query.in('status', ['completed', 'rejected']).order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    
    if (!error) setRequests(data);
    
    setLoading(false);
  };
const fetchTotalPending = async () => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('status', 'pending');

  if (data) {
    const sum = data.reduce((acc, curr) => acc + curr.amount, 0);
    setTotalPending(sum);
  }
};



const handlePayout = async (withdrawal) => {
  // 1. Disable the button immediately to prevent double-clicks 🖱️🚫
  setIsProcessing(withdrawal.id); 

  try {
    // 2. Call the secure SQL function we created
    // This handles: status -> 'completed' AND profile balance deduction
    const { error: rpcError } = await supabase.rpc('process_payout', {
      withdrawal_id: withdrawal.id,
      user_id: withdrawal.user_id,
      amount_to_subtract: withdrawal.amount
    });

    if (rpcError) throw rpcError;

    // 3. Success! Now we refresh the local state
    alert("Payout successful! User balance deducted. ✅");
    
    // This removes the item from the current 'pending' list and updates the Queue Size
    await fetchAdminData(); 
    
    // This updates the 'Total Pending Payouts' header
    await fetchTotalPending();

  } catch (err) {
    console.error("Payout Error:", err);
    alert(err.message || "An error occurred during payout.");
  } finally {
    setIsProcessing(null); // Re-enable buttons for other requests
  }
};
  // const handleApprove = async (id) => {
  //   const { error } = await supabase.rpc('approve_withdrawal', { withdrawal_id: id });
  //   if (error) alert(error.message);
  //   else {
  //     alert("Marked as Paid! ✅");
  //     fetchAdminData();
  //     fetchTotalPending();
  //   }
  // };

  const handleReject = async (withdrawal) => {
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  setIsProcessing(withdrawal.id);

  try {
    const { error } = await supabase.rpc('reject_payout', { 
      withdrawal_id: withdrawal.id, 
      user_id: withdrawal.user_id,
      amount_to_refund: withdrawal.amount,
      reason: reason 
    });

    if (error) throw error;

    alert("Refunded and Rejected! ❌");
    
    // These calls refresh the UI, move the item to history, 
    // and update the queue size automatically.
    await fetchAdminData();
    await fetchTotalPending();

  } catch (err) {
    alert(err.message);
  } finally {
    setIsProcessing(null);
  }
};
  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ 
  background: '#f8f9fa', 
  padding: '20px', 
  borderRadius: '10px', 
  marginBottom: '20px',
  borderLeft: '5px solid #f39c12',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}}>
  <div>
    <p style={{ margin: 0, color: '#666' }}>Total Pending Payouts</p>
    <h2 style={{ margin: 0, color: '#d35400' }}>₦{totalPending.toLocaleString()}</h2>
  </div>
  <div style={{ textAlign: 'right' }}>
    <p style={{ margin: 0, color: '#666' }}>Queue Size</p>
    <h2 style={{ margin: 0 }}>{requests.length} Requests</h2>
  </div>
</div>

      <h1>Payout Management 💸</h1>
<div style={{ 
  background: '#f8f9fa', 
  padding: '20px', 
  borderRadius: '10px', 
  marginBottom: '20px',
  borderLeft: '5px solid #f39c12' 
}}>
  <p style={{ margin: 0, color: '#666' }}>Total Pending Payouts</p>
  <h2 style={{ margin: 0, color: '#d35400' }}>₦{totalPending.toLocaleString()}</h2>
</div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', borderBottom: '2px solid #eee' }}>
        <button 
          onClick={() => { setView('pending'); setPage(0); }}
          style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: view === 'pending' ? '3px solid #27ae60' : 'none', fontWeight: view === 'pending' ? 'bold' : 'normal' }}
        >
          Pending ⏳
        </button>
        <button 
          onClick={() => { setView('history'); setPage(0); }}
          style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: view === 'history' ? '3px solid #27ae60' : 'none', fontWeight: view === 'history' ? 'bold' : 'normal' }}
        >
          History 📜
        </button>
      </div>

      {loading ? <p>Loading requests...</p> : (
        <div>
          {requests.length === 0 && <p>No {view} requests found.</p>}
          {requests.map(req => (
            <div key={req.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '10px', marginBottom: '15px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>₦{req.amount.toLocaleString()}</h3>
                <span style={{ 
                  padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                  background: req.status === 'pending' ? '#fff3cd' : req.status === 'completed' ? '#d4edda' : '#f8d7da',
                  color: req.status === 'pending' ? '#856404' : req.status === 'completed' ? '#155724' : '#721c24'
                }}>
                  {req.status.toUpperCase()}
                </span>
              </div>
              <p><strong>User:</strong> {req.profiles?.username || 'Anonymous User'}</p>
              <p style={{ margin: '5px 0' }}><strong>User:</strong> {req.profiles?.username || 'Unknown User'}</p>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}><strong>Bank Details:</strong> {req.bank_details}</p>

              {view === 'pending' && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(req.bank_details); alert("Copied!"); }}
                    style={{ padding: '8px 12px', cursor: 'pointer' }}
                  >
                    Copy Details 📋
                  </button>
                 <button 
  onClick={() => handlePayout(req)}
  disabled={isProcessing === req.id} // Prevents double-submissions
  style={{ 
    padding: '8px 12px', 
    background: isProcessing === req.id ? '#95a5a6' : '#27ae60', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '4px', 
    cursor: isProcessing === req.id ? 'not-allowed' : 'pointer' 
  }}
>
  {isProcessing === req.id ? "Processing..." : "Mark as Paid ✅"}
</button>
                  <button 
                    onClick={() => handleReject(req)}
                    style={{ padding: '8px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Reject ❌
                  </button>
                </div>
              
              )}
            </div>
          ))}

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous Page</button>
            <span>Page {page + 1}</span>
            <button disabled={requests.length < itemsPerPage} onClick={() => setPage(page + 1)}>Next Page</button>
          </div>
        </div>
      )}
    </div>
  );
}