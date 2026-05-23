import React, { useState, useEffect } from "react";
import { Clock, Plus, Check, Users, User as UserIcon, ChevronRight, X, AlertCircle, Briefcase, ShieldAlert, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../ThemeContext";
import { useUser, getCookie } from "../Context/UserContext";
import StatCard from "../Common/StatCard";

interface BackendTask {
  ID: number;
  Emp_id: string | null;
  Department: string | null;
  Task_Name: string;
  Task_Description: string;
  Start_Date: string;
  End_Date: string;
  Priority: string;
  Status: string;
  Assigned_By: string | null;
  Employee_Name: string | null;
}

interface TeamMember {
  Emp_id: string;
  name: string;
  email: string;
  Department: string;
  designation: string;
}

export const Tasks: React.FC = () => {
  const { currentPreset } = useTheme();
  const { user } = useUser();

  const [tasks, setTasks] = useState<BackendTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string | null>(null);
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  // Modal form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newEndDate, setNewEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [newAssignedEmpId, setNewAssignedEmpId] = useState("");

  const API_BASE_URL = "http://localhost:8000";

  const getAuthHeaders = () => {
    const token = getCookie("auth_access_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  // Fetch all tasks and team members
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch tasks
      const tasksRes = await fetch(`${API_BASE_URL}/daily-tasks/all-tasks`, {
        headers: getAuthHeaders(),
      });
      if (!tasksRes.ok) {
        throw new Error(`Failed to load tasks (Status: ${tasksRes.status})`);
      }
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      // 2. Fetch team members if authenticated
      if (user) {
        const teamRes = await fetch(`${API_BASE_URL}/daily-tasks/team-members`, {
          headers: getAuthHeaders(),
        });
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          setTeamMembers(teamData);
        }
      }
    } catch (err: any) {
      console.error("API Error in Tasks Dashboard:", err);
      setError(err.message || "Failed to retrieve workspace tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Toggle completion of a task
  const toggleTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      const response = await fetch(`${API_BASE_URL}/daily-tasks/task/${taskId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ Status: newStatus }),
      });
      if (!response.ok) {
        throw new Error("Failed to update task status on the server.");
      }
      // Optimistic update
      setTasks(prev => prev.map(t => t.ID === taskId ? { ...t, Status: newStatus } : t));
    } catch (err: any) {
      alert(err.message || "Could not update task status.");
    }
  };

  // Handle adding a new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Resolve assigned employee and department
    let finalEmpId: string | null = newAssignedEmpId;
    let finalDept: string | null = null;

    if (newAssignedEmpId === "self") {
      finalEmpId = user?.empId || null;
    } else if (newAssignedEmpId === "") {
      finalEmpId = null;
      // If department is assigned instead
      const currentUserProfile = teamMembers.find(t => t.Emp_id === user?.empId);
      finalDept = currentUserProfile?.Department || null;
    }

    const payload = {
      Emp_id: finalEmpId,
      Department: finalDept,
      Task_Name: newTitle,
      Task_Description: newDescription || newTitle,
      Start_Date: newStartDate,
      End_Date: newEndDate,
      Priority: newPriority,
      Status: "Pending"
    };

    try {
      const response = await fetch(`${API_BASE_URL}/daily-tasks/assign`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errDetails = await response.json();
        throw new Error(errDetails.detail || "Failed to create and assign task.");
      }

      // Refresh list
      await fetchData();

      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewPriority("Medium");
      setNewStartDate(new Date().toISOString().split("T")[0]);
      setNewEndDate(new Date().toISOString().split("T")[0]);
      setNewAssignedEmpId("");
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to save the new task.");
    }
  };

  // Helper stats for side panel members
  const getMemberStats = (empId: string) => {
    const memberTasks = tasks.filter(t => t.Emp_id === empId);
    const pending = memberTasks.filter(t => t.Status !== "Completed").length;
    const completed = memberTasks.filter(t => t.Status === "Completed").length;
    const total = memberTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { pending, completed, total, completionRate };
  };

  // Filter tasks based on search & side panel selection
  const filteredTasks = tasks.filter(task => {
    if (selectedEmpFilter) {
      return task.Emp_id === selectedEmpFilter;
    }
    return true;
  });

  // Filter team members based on search query in the side panel
  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
    (m.designation && m.designation.toLowerCase().includes(searchMemberQuery.toLowerCase()))
  );

  return (
    <div className="p-8 bg-slate-50/50 min-h-full font-sans flex flex-col xl:flex-row gap-8 relative">
      {/* ─── Main Content Container ─── */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span
              className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-full"
              style={{ color: currentPreset.primaryHex, backgroundColor: `${currentPreset.primaryHex}15` }}
            >
              Enterprise Tasks & Operations
            </span>
            <div className="text-3xl tracking-tight mt-2 leading-none" style={{ color: currentPreset.primaryHex, fontFamily: currentPreset.titleFont, fontWeight: 900 }}>Task Planner</div>
            <p className="text-slate-400 text-xs font-semibold mt-1.5">Assign, complete, and track daily operational tasks across your department.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-white font-black text-xs transition-transform hover:scale-102 active:scale-98 cursor-pointer"
            style={{ backgroundColor: currentPreset.primaryHex }}
          >
            <Plus size={14} />
            Create Task
          </button>
        </div>

        {/* ─── Loading / Error states ─── */}
        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin" style={{ borderTopColor: currentPreset.primaryHex }} />
            <p className="text-xs text-slate-400 font-semibold">Loading organizational tasks...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-semibold">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* ─── Task Statistics Dashboard Row ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={Briefcase}
                label="Total Active Tasks"
                value={tasks.filter(t => t.Status !== "Completed").length}
                iconBgClass="bg-slate-50 border border-slate-100"
                iconColorClass="text-slate-650"
                valueColorClass="text-slate-800"
              />
              <StatCard
                icon={ShieldAlert}
                label="High Priority Tasks"
                value={tasks.filter(t => t.Status !== "Completed" && t.Priority === "High").length}
                iconBgClass="bg-red-50 border border-red-100"
                iconColorClass="text-red-500"
                valueColorClass="text-red-500"
              />
              <StatCard
                icon={CheckCircle2}
                label="Completed Milestones"
                value={tasks.filter(t => t.Status === "Completed").length}
                iconBgClass="bg-emerald-50 border border-emerald-100"
                iconColorClass="text-emerald-500"
                valueColorClass="text-emerald-500"
              />
            </div>

            {/* ─── Task Filter Active Indicator ─── */}
            {selectedEmpFilter && (
              <div className="flex items-center justify-between p-3 px-4 bg-white rounded-xl border border-slate-150 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Users size={14} style={{ color: currentPreset.primaryHex }} />
                  <span>Showing assignments for <strong className="text-slate-800">{teamMembers.find(t => t.Emp_id === selectedEmpFilter)?.name || "Selected Employee"}</strong></span>
                </div>
                <button
                  onClick={() => setSelectedEmpFilter(null)}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear Filter
                  <X size={12} />
                </button>
              </div>
            )}

            {/* ─── Tasks List Main Card ─── */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                {selectedEmpFilter ? "Filtered Tasks" : "All Team & Personal Tasks"}
              </h3>

              <div className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-slate-400 font-bold">No tasks found matching your filter criteria.</p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div key={task.ID} className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/30 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                          onClick={() => toggleTask(task.ID, task.Status)}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer ${task.Status === "Completed"
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 bg-white hover:border-slate-400"
                            }`}
                        >
                          {task.Status === "Completed" && <Check size={12} />}
                        </button>
                        
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${task.Status === "Completed" ? "text-slate-400 line-through font-semibold" : "text-slate-700"}`}>
                            {task.Task_Name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{task.Task_Description}</p>
                          
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${task.Priority === "High" ? "bg-red-50 text-red-500" : task.Priority === "Medium" ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-400"
                              }`}>
                              {task.Priority} Priority
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                              <Clock size={10} />
                              Due {task.End_Date}
                            </span>
                            {task.Employee_Name && (
                              <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100/50 px-1.5 py-0.5 rounded">
                                <UserIcon size={9} />
                                {task.Employee_Name === "Unassigned" ? "Department" : task.Employee_Name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        {task.Status === "Completed" ? (
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-50 text-emerald-650">
                            Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleTask(task.ID, task.Status)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-white transition-all hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
                            style={{ backgroundColor: currentPreset.primaryHex }}
                          >
                            <Check size={10} />
                            Complete
                          </button>
                        )}
                        {task.Assigned_By && (
                          <p className="text-[8px] text-slate-400">By: {task.Assigned_By}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Right Side Panel (Team Tracker Panel) ─── */}
      <div className="w-full xl:w-80 shrink-0">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 sticky top-8">
          <div>
            <div className="flex items-center gap-2 text-slate-700">
              <Users size={16} style={{ color: currentPreset.primaryHex }} />
              <h3 className="text-xs font-black uppercase tracking-wider">Team Status Panel</h3>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Select a member below to inspect or filter active delegated tasks.</p>
          </div>

          {/* Member Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search team members..."
              value={searchMemberQuery}
              onChange={(e) => setSearchMemberQuery(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none text-[11px] font-semibold bg-slate-50/50"
            />
            {searchMemberQuery && (
              <button
                onClick={() => setSearchMemberQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto no-scrollbar">
            {filteredMembers.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-semibold text-center py-6">No team members active.</p>
            ) : (
              filteredMembers.map((member) => {
                const stats = getMemberStats(member.Emp_id);
                const isSelected = selectedEmpFilter === member.Emp_id;

                return (
                  <div
                    key={member.Emp_id}
                    onClick={() => setSelectedEmpFilter(isSelected ? null : member.Emp_id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${isSelected
                      ? "bg-primary/5 shadow-sm border-primary/20"
                      : "border-slate-100 hover:bg-slate-50 bg-white"
                      }`}
                    style={isSelected ? { borderColor: `${currentPreset.primaryHex}30`, backgroundColor: `${currentPreset.primaryHex}05` } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-inner"
                        style={{ backgroundColor: isSelected ? currentPreset.primaryHex : "#cbd5e1" }}
                      >
                        {member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[11px] font-bold text-slate-800 truncate leading-snug">{member.name}</h4>
                        <p className="text-[9px] text-slate-400 truncate">{member.designation || "Team Member"}</p>
                      </div>
                      <ChevronRight size={12} className={`text-slate-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>

                    {/* Progress details */}
                    <div className="pt-1.5 border-t border-slate-50 space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-semibold text-slate-500">
                        <span>{stats.pending} pending / {stats.completed} done</span>
                        <span>{stats.completionRate}%</span>
                      </div>
                      
                      {/* Mini visual horizontal progress bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${stats.completionRate}%`,
                            backgroundColor: stats.completionRate === 100 ? "#10b981" : currentPreset.primaryHex
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Stats Overview */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Team Statistics</span>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <p className="text-[16px] font-black text-slate-700">{tasks.filter(t => t.Status !== "Completed" && t.Emp_id).length}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Assigned Tasks</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <p className="text-[16px] font-black text-emerald-500">{tasks.filter(t => t.Status === "Completed" && t.Emp_id).length}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Finished Tasks</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Add Task Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 w-full max-w-md p-8 relative shadow-2xl overflow-hidden"
            >
              <h3 className="text-lg font-black text-slate-800 mb-1">Create New Task</h3>
              <p className="text-slate-400 text-xs font-medium mb-6">Fill in task parameters to delegate to team members or yourself.</p>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description / Details</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Provide description of task goals..."
                    rows={2}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assign To</label>
                    <select
                      value={newAssignedEmpId}
                      onChange={(e) => setNewAssignedEmpId(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                    >
                      <option value="">Department (General)</option>
                      <option value="self">Self (My Profile)</option>
                      {teamMembers.map(member => (
                        <option key={member.Emp_id} value={member.Emp_id}>
                          {member.name} ({member.Emp_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-primary focus:outline-none text-xs font-semibold bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8 pt-4 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 text-[10px] font-bold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 text-[10px] font-bold text-white rounded-xl hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: currentPreset.primaryHex }}
                  >
                    Assign Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
