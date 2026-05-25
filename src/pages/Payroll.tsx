import React, { useState, useEffect } from "react";
import { Download, Landmark, Wallet, ShieldAlert, CreditCard } from "lucide-react";
import { useTheme } from "../ThemeContext";
import { useUserData } from "../Context/UserData";
import { useUser, getCookie } from "../Context/UserContext";
import { Api_URL } from "../APILINK";

interface UploadedPayslip {
  id: number;
  month: string;
  url: string;
  uploaded_at: string;
}

export const Payroll: React.FC = () => {
  const { currentPreset } = useTheme();
  const { employeeData, loading: loadingCompensation } = useUserData();
  const { user } = useUser();

  const [slips, setSlips] = useState<UploadedPayslip[]>([]);
  const [loadingSlips, setLoadingSlips] = useState(true);

  const API_BASE_URL = `${Api_URL}`;

  const getAuthHeaders = () => {
    const token = getCookie("auth_access_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  // Fetch uploaded payslips from Azure Blob storage registry
  useEffect(() => {
    if (!user?.empId) return;

    const fetchUploadedSlips = async () => {
      setLoadingSlips(true);
      try {
        const response = await fetch(`${API_BASE_URL}/pdf/payslip/${user.empId}/all`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setSlips(data);
        }
      } catch (err) {
        console.error("Failed to load uploaded payslips from Azure Storage:", err);
      } finally {
        setLoadingSlips(false);
      }
    };

    fetchUploadedSlips();
  }, [user]);

  // Format currency helper
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: employeeData?.profile?.currency || "USD"
    }).format(val);
  };

  // Handle on-the-fly payslip compile and download fallback
  const handleOnTheFlyDownload = async (monthName: string) => {
    if (!user?.empId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/pdf/payslip/${user.empId}?month=${encodeURIComponent(monthName)}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `payslip_${user.empId}_${monthName.replace(" ", "_")}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        alert("Failed to render and compile payslip PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("Error initiating payslip generation.");
    }
  };

  return (
    <div className="p-8 bg-bg min-h-full font-sans overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="mb-8">
        <span 
          className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-full"
          style={{ color: currentPreset.primaryHex, backgroundColor: `${currentPreset.primaryHex}15` }}
        >
          Salary & Rewards
        </span>
        <div className="text-3xl tracking-tight mt-2 leading-none" style={{ color: currentPreset.primaryHex, fontFamily: currentPreset.titleFont, fontWeight: 900 }}>Payroll Ledger</div>
        <p className="text-slate-400 text-xs font-semibold mt-1.5">Access details of your remuneration, allowances, and download official payslips.</p>
      </div>

      {loadingCompensation ? (
        <div className="h-40 bg-slate-100 rounded-3xl animate-pulse mb-8" />
      ) : !employeeData ? (
        <div className="bg-red-50 border border-red-150 p-6 rounded-2xl text-center max-w-md mx-auto py-12 mb-8">
          <ShieldAlert className="text-red-500 mx-auto mb-3" size={32} />
          <h4 className="text-sm font-black text-slate-800">Compensation File Missing</h4>
          <p className="text-slate-500 text-[10px] mt-1 font-semibold">
            Could not retrieve active salary details for your profile. Please contact human resources.
          </p>
        </div>
      ) : (
        <>
          {/* Dynamic Summary Card powered by the theme's custom banner gradient */}
          <div 
            className={`bg-gradient-to-br ${currentPreset.bannerGradient} rounded-[32px] p-8 text-white mb-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden`}
          >
            {/* Backdrop design sparkles */}
            <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center pointer-events-none pr-8">
              <Landmark size={240} />
            </div>

            <div className="relative z-10">
              <span className="text-[10px] text-white/80 font-extrabold uppercase tracking-wider block">Calculated Monthly Net Pay</span>
              <h3 className="text-3xl font-black mt-2 mb-1">{formatMoney(employeeData.net_salary)}</h3>
              <p className="text-white/85 text-[10px] font-bold flex items-center gap-1">
                <Wallet size={12} />
                Current Base: {formatMoney(employeeData.base_salary)}
              </p>
            </div>
            
            <div className="relative z-10 space-y-1.5 text-[10px] font-bold text-white/80 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-8 min-w-[180px]">
              <p className="flex justify-between gap-4"><span>Basic Pay:</span> <span className="text-white">{formatMoney(employeeData.base_salary)}</span></p>
              <p className="flex justify-between gap-4"><span>Gross Allowances:</span> <span className="text-white">+{formatMoney(employeeData.total_earnings)}</span></p>
              <p className="flex justify-between gap-4"><span>Tax Deductions:</span> <span className="text-white">-{formatMoney(employeeData.total_deductions)}</span></p>
            </div>
          </div>

          {/* Earnings & Deductions Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Component A: Earnings / Allowances Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-emerald-500" />
                  Earnings & Allowances
                </h4>
                {employeeData.earnings_breakdown?.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-semibold text-center py-6">
                    No supplementary allowances registered in contract.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {employeeData.earnings_breakdown?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl"
                      >
                        <div>
                          <p className="text-[11px] font-bold text-slate-800">{item.name || item.component}</p>
                          <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
                            Type: {item.calculation_type || "Flat"}
                          </p>
                        </div>
                        <span className="text-xs font-black text-emerald-600">
                          +{formatMoney(item.amount || item.value || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-50 pt-3 mt-4 flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>Total Allowances:</span>
                <span className="text-emerald-600 font-black text-xs">
                  +{formatMoney(employeeData.total_earnings)}
                </span>
              </div>
            </div>

            {/* Component B: Deductions Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-1.5">
                  <Landmark size={14} className="text-red-500" />
                  Deductions & Offsets
                </h4>
                {employeeData.deductions_breakdown?.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-semibold text-center py-6">
                    No active deductions or offsets applied to salary.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {employeeData.deductions_breakdown?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl"
                      >
                        <div>
                          <p className="text-[11px] font-bold text-slate-800">{item.name || item.component}</p>
                          <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
                            Type: {item.calculation_type || "Flat"}
                          </p>
                        </div>
                        <span className="text-xs font-black text-red-500">
                          -{formatMoney(item.amount || item.value || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-50 pt-3 mt-4 flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>Total Deductions:</span>
                <span className="text-red-500 font-black text-xs">
                  -{formatMoney(employeeData.total_deductions)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Salary Slip List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Official Payslips Registry</h3>
        </div>

        <div className="divide-y divide-slate-50">
          {loadingSlips ? (
            <div className="p-6 text-center text-xs text-slate-400 font-bold">Scanning Azure storage records...</div>
          ) : slips.length === 0 ? (
            <div className="p-8 text-center space-y-4">
              <p className="text-xs text-slate-400 font-bold">No manager-issued Payslips recorded in Azure Blob Container.</p>
              {employeeData && (
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 max-w-sm mx-auto">
                  <p className="text-[9px] text-slate-500 font-semibold mb-2.5 text-center">You can compile and download your active compensation payslip instantly using WeasyPrint fallback.</p>
                  <button 
                    onClick={() => handleOnTheFlyDownload("May 2026")}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-white font-extrabold text-[10px] cursor-pointer shadow-sm"
                    style={{ backgroundColor: currentPreset.primaryHex }}
                  >
                    <Download size={11} />
                    Generate & Download PDF
                  </button>
                </div>
              )}
            </div>
          ) : (
            slips.map((slip) => (
              <div key={slip.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors">
                <div>
                  <p className="text-xs font-black text-slate-800">{slip.month}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Uploaded: {slip.uploaded_at.split("T")[0]}</p>
                </div>
                <a 
                  href={slip.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 py-2 px-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors text-[10px] font-bold text-slate-650 bg-white shadow-sm cursor-pointer"
                >
                  <Download size={12} style={{ color: currentPreset.primaryHex }} />
                  Download from Cloud Storage
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
