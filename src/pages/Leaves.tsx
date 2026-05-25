import React, { useState, useEffect } from "react";
import { Plus, Check, AlertCircle, CalendarDays, HeartPulse, Award, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../ThemeContext";
import { useUser, getCookie } from "../Context/UserContext";
import StatCard from "../Common/StatCard";
import { Api_URL } from "../APILINK";

interface LeaveHistoryEntry {
  id?: number;
  applayDate: string;
  from_date: string;
  to_date: string;
  Days: number;
  status: string;
  Reason: string;
  leave_type?: string;
}

const API_URL=(`${Api_URL}`);

export const Leaves: React.FC = () => {
  const { currentPreset } = useTheme();
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Leave state loaded from DB
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const empId = user?.empId || "";

  // 1. Fetch dynamic leave balances & application history
  const fetchLeaveDetails = async () => {
    if (!empId) return;
    setLoading(true);
    setError(null);
    try {
      const token = getCookie("auth_access_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      };

      const response = await fetch(`${API_URL}/leave/history/${empId}`, { headers });
      if (!response.ok) {
        throw new Error("Could not download your time-off history logs.");
      }

      const data = await response.json();
      if (data.leave_history) {
        setLeaveHistory(data.leave_history);
      }
    } catch (err: any) {
      console.error("Fetch history logs error:", err);
      setError(err.message || "Failed to sync with leave history registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empId) {
      fetchLeaveDetails();
    }
  }, [empId]);

  // 2. Compute dynamic balances based on approved histories
  const getUsedDaysForType = (type: string) => {
    return leaveHistory
      .filter(
        (h) =>
          h.status === "Approved" &&
          (h.leave_type || "").toLowerCase().trim() === type.toLowerCase().trim()
      )
      .reduce((sum, h) => sum + (h.Days || 0), 0);
  };

  const casualUsed = getUsedDaysForType("Casual");
  const medicalUsed = getUsedDaysForType("Medical");
  const earnedUsed = getUsedDaysForType("Earned");

  const balances = [
    {
      type: "Casual Leave",
      bal: `${12 - casualUsed} Days`,
      total: "12 Days",
      used: `${casualUsed} Days`,
      icon: CalendarDays,
      iconBgClass: "bg-blue-50/50",
      iconColorClass: "text-blue-500",
      valueColorClass: "text-blue-600",
    },
    {
      type: "Medical Leave",
      bal: `${12 - medicalUsed} Days`,
      total: "12 Days",
      used: `${medicalUsed} Days`,
      icon: HeartPulse,
      iconBgClass: "bg-rose-50/50",
      iconColorClass: "text-rose-500",
      valueColorClass: "text-rose-600",
    },
    {
      type: "Earned Leave",
      bal: `${12 - earnedUsed} Days`,
      total: "12 Days",
      used: `${earnedUsed} Days`,
      icon: Award,
      iconBgClass: "bg-emerald-50/50",
      iconColorClass: "text-emerald-500",
      valueColorClass: "text-emerald-600",
    },
  ];

  // 3. Post leave application payload to API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);

    if (!start || !end) {
      setApplyError("Please select a valid date range.");
      return;
    }

    try {
      const token = getCookie("auth_access_token");
      const durationStr = `${start} to ${end}`;

      const payload = {
        Emp_id: empId,
        employee_name: user?.name || "Employee Profile",
        Duration: durationStr,
        leave_type: leaveType,
        Reason: reason
      };

      const response = await fetch(`${API_URL}/leave/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Leave application was rejected. Check your date range or type limit.");
      }

      setSubmitted(true);
      await fetchLeaveDetails(); // Reload history & balances

      setTimeout(() => {
        setSubmitted(false);
        setShowModal(false);
        setStart("");
        setEnd("");
        setReason("");
      }, 1500);

    } catch (err: any) {
      console.error("Leave apply submission error:", err);
      setApplyError(err.message || "Could not complete the application request.");
    }
  };

  return (
    <div className="p-8 bg-bg min-h-full font-sans overflow-y-auto no-scrollbar relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span
            className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-full"
            style={{ color: currentPreset.primaryHex, backgroundColor: `${currentPreset.primaryHex}15` }}
          >
            Time-Off Planner
          </span>
          <div
            className="text-3xl tracking-tight mt-2 leading-none"
            style={{ color: currentPreset.primaryHex, fontFamily: currentPreset.titleFont, fontWeight: 900 }}
          >
            Leaves Center
          </div>
          <p className="text-slate-400 text-xs font-semibold mt-1.5">
            Apply for annual leaves and view your remaining balance quotas.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-white font-black text-xs transition-transform hover:scale-102 active:scale-98 cursor-pointer shadow-sm"
          style={{ backgroundColor: currentPreset.primaryHex }}
        >
          <Plus size={14} />
          Apply for Leave
        </button>
      </div>

      {/* Leave Balance StatCards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {balances.map((b, idx) => (
          <StatCard
            key={idx}
            icon={b.icon}
            label={b.type}
            value={b.bal}
            subText={`Used: ${b.used} (Limit: ${b.total})`}
            cardBgClass={b.iconBgClass}
            iconBgClass={b.iconBgClass}
            iconColorClass={b.iconColorClass}
            valueColorClass={b.valueColorClass}
          />
        ))}
      </div>

      {/* Active Requests */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Leave Logs & History Ledger
          </h3>
          <span className="bg-slate-100 text-slate-700 text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
            {leaveHistory.length} Requested
          </span>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-14 bg-slate-50 rounded-xl" />
            <div className="h-14 bg-slate-50 rounded-xl" />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-slate-450 font-semibold text-xs flex flex-col items-center justify-center">
            <ShieldAlert size={28} className="text-red-500 mb-2" />
            <span>{error}</span>
          </div>
        ) : leaveHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle size={32} className="text-slate-400 mb-2.5" />
            <p className="text-xs font-bold text-slate-700">No History Records Found</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              You have not applied for any time-off through this portal yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-[10px] font-bold text-slate-650 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[8px] font-extrabold uppercase tracking-widest text-left">
                  <th className="py-2.5 pr-4">Apply Date</th>
                  <th className="py-2.5 px-4 text-center">Type</th>
                  <th className="py-2.5 px-4">Duration Range</th>
                  <th className="py-2.5 px-4 text-center">Days</th>
                  <th className="py-2.5 px-4">Reason for Absence</th>
                  <th className="py-2.5 pl-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leaveHistory.map((item, idx) => (
                  <tr key={item.id ?? idx} className="hover:bg-slate-50/20 transition-colors">
                    <td className="py-3 pr-4 text-slate-500">{item.applayDate}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: `${
                            item.leave_type === "Medical" ? "#f43f5e15" :
                            item.leave_type === "Earned" ? "#10b98115" : `${currentPreset.primaryHex}15`
                          }`,
                          color: `${
                            item.leave_type === "Medical" ? "#f43f5e" :
                            item.leave_type === "Earned" ? "#10b981" : currentPreset.primaryHex
                          }`,
                        }}
                      >
                        {item.leave_type || "Casual"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-black">{item.from_date} to {item.to_date}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{item.Days} Days</td>
                    <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate">"{item.Reason}"</td>
                    <td className="py-3 pl-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          item.status === "Approved" ? "bg-emerald-50 text-emerald-600" :
                          item.status === "Rejected" ? "bg-red-50 text-red-500" :
                          item.status === "Recommended" ? "bg-teal-50 text-teal-600 animate-pulse border border-teal-200" :
                          "bg-amber-50 text-amber-500 animate-pulse"
                        }`}
                      >
                        {item.status === "Recommended" ? "Recommended by Manager" : item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 w-full max-w-md p-8 relative shadow-2xl"
            >
              <h3 className="text-lg font-black text-slate-800 mb-2">Request Time Off</h3>
              <p className="text-slate-400 text-xs font-medium mb-6">
                Complete this form to submit your leave request to management.
              </p>

              {applyError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-650 text-[10px] font-extrabold flex items-center gap-2">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              {submitted ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 animate-bounce">
                    <Check size={24} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">Application Submitted!</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Your manager and TL will be notified to review this request.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Leave Type</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                    >
                      <option value="Casual">Casual Leave</option>
                      <option value="Medical">Medical Leave</option>
                      <option value="Earned">Earned Leave</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                      <input
                        type="date"
                        required
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for Absence</label>
                    <textarea
                      required
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Provide details about your absence..."
                      className="w-full px-3.5 py-2 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                    />
                  </div>

                  <div className="flex gap-3 mt-8 pt-4 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 text-[10px] font-bold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 text-[10px] font-bold text-white rounded-xl hover:opacity-90 cursor-pointer transition-colors"
                      style={{ backgroundColor: currentPreset.primaryHex }}
                    >
                      Submit
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
