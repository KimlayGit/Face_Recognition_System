import { useEffect, useState } from "react";
import client from "../api/client";

function formatTime(value) {
  if (!value) return "--";

  const str = String(value);

  if (str.includes("T")) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return str.split(".")[0];
}

export default function AttendancePage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data } = await client.get("/attendance");
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to load attendance logs", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
          Attendance Log
        </h1>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Recent Activity
          </h2>
          <button
            onClick={loadLogs}
            className="text-xl font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="px-8 py-8 text-slate-500">Loading attendance records...</div>
        ) : logs.length === 0 ? (
          <div className="px-8 py-8 text-slate-500">No attendance records found.</div>
        ) : (
          <div>
            {logs.map((item, idx) => {
              const name = item.student_name || item.full_name || "Unknown";
              const status = item.status || "Unknown";
              const time = item.check_in_time || item.created_at || "";

              return (
                <div
                  key={item.id || idx}
                  className="flex items-start justify-between gap-4 border-b border-slate-100 px-8 py-7 last:border-b-0"
                >
                  <div className="flex gap-5">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-200 text-lg font-bold text-slate-600">
                      {name === "Unknown" ? "?" : name.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="text-2xl font-bold text-slate-900">{name}</div>
                      <div className="mt-1 text-xl text-slate-500">
                        {item.class_name || "Face Scan Check-in"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="whitespace-nowrap text-2xl font-bold text-slate-900">
                      {formatTime(time)}
                    </div>
                    <div
                      className={`mt-1 text-lg font-medium ${
                        String(status).toLowerCase() === "present"
                          ? "text-emerald-600"
                          : String(status).toLowerCase() === "late"
                          ? "text-amber-500"
                          : "text-rose-500"
                      }`}
                    >
                      {status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}