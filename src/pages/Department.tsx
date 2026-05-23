import React from "react";

export const Department: React.FC = () => {
  const depts = [
    { name: "Engineering", head: "Marcus Wright", count: 18, desc: "Responsible for full stack application development, QA testing, and software architecture." },
    { name: "Product Design", head: "Alex Rivera", count: 4, desc: "Designs user interfaces, maps UX journeys, conducts brand management and logo aesthetics." },
    { name: "Human Resources", head: "Diana Prince", count: 3, desc: "Handles candidate pipeline management, onboard systems, employee benefits, and general policy." },
    { name: "Management", head: "Bruce Wayne", count: 2, desc: "Executes corporate strategy, strategic partnerships, financial governance, and legal operations." }
  ];

  return (
    <div className="p-8 bg-slate-50/50 min-h-full font-sans">
      <div className="mb-8">
        <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 rounded-full">
          Organizational Units
        </span>
        <h2 className="text-2xl font-black mt-2 text-slate-800 leading-none">Departments</h2>
        <p className="text-slate-400 text-xs font-semibold mt-1.5">View details, leads, and staff size of corporate departments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {depts.map((d, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-slate-800">{d.name}</h4>
                <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-slate-50 border border-slate-100 text-slate-500">
                  {d.count} Members
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-medium leading-relaxed mb-6">
                {d.desc}
              </p>
            </div>
            <div className="border-t border-slate-50 pt-4 flex justify-between items-center text-[10px] font-semibold text-slate-500">
              <span>Department Head</span>
              <span className="text-slate-800 font-bold">{d.head}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
