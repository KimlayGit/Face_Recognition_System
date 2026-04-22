import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useAuth } from "../context/AuthContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

function StatCard({ title, value, change, tone }) {
  const toneMap = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-rose-500",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-500">{title}</div>
          <div className="mt-4 text-5xl font-extrabold tracking-tight text-slate-900">
            {value}
          </div>
          <div className="mt-4 text-sm font-semibold text-emerald-600">{change}</div>
        </div>

        <div className={`h-16 w-16 rounded-full ${toneMap[tone]} opacity-95`} />
      </div>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "--";
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return value;
  } catch {
    return value;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    total_students: 0,
    attendance_records: 0,
    present: 0,
    late: 0,
    absent: 0,
  });

  const [recent, setRecent] = useState([]);

  useEffect(() => {
    client
      .get("/reports/summary")
      .then((res) => setSummary(res.data))
      .catch(() => {});

    client
      .get("/attendance")
      .then((res) => {
        const items = (res.data || []).slice(0, 5).map((item) => ({
          id: item.id,
          name: item.student_name || item.full_name || "Unknown",
          meta:
            item.class_name ||
            item.location ||
            "Face Scan Check-in",
          time: item.check_in_time || item.created_at || "",
          status: item.status || "Unknown",
        }));
        setRecent(items);
      })
      .catch(() => {
        setRecent([]);
      });
  }, []);

  const chartData = useMemo(
    () => ({
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Attendance",
          data: [
            Math.max(10, summary.present - 4),
            Math.max(12, summary.present - 1),
            Math.max(11, summary.present - 3),
            Math.max(14, summary.present + 2),
            Math.max(13, summary.present),
            Math.max(4, summary.present / 4),
            Math.max(3, summary.present / 5),
          ],
          borderColor: "#5b5ce9",
          backgroundColor: "rgba(91,92,233,0.08)",
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
      ],
    }),
    [summary.present]
  );

  const now = new Date();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            Dashboard Overview
          </h1>
          <p className="mt-2 text-2xl text-slate-500">
            Good evening, {user?.fullName || "Admin"}
          </p>
        </div>

        <div className="text-right">
          <div className="text-5xl font-extrabold tracking-tight text-slate-900">
            {now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </div>
          <div className="mt-2 text-2xl text-slate-500">
            {now.toLocaleDateString([], {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Total Personnel"
          value={summary.total_students || 0}
          change="+12% vs last month"
          tone="blue"
        />
        <StatCard
          title="On Time Today"
          value={`${summary.present || 0}%`}
          change="+4% vs last month"
          tone="green"
        />
        <StatCard
          title="Late Arrivals"
          value={summary.late || 0}
          change="-2% vs last month"
          tone="amber"
        />
        <StatCard
          title="Absent"
          value={summary.absent || 0}
          change="+1.2% vs last month"
          tone="red"
        />
      </div>

      <div className="grid grid-cols-[1.6fr_0.8fr] gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">
            Weekly Attendance Overview
          </h2>

          <div className="h-90">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#64748b", font: { size: 14 } },
                  },
                  y: {
                    grid: { color: "#e2e8f0" },
                    border: { display: false },
                    ticks: { color: "#64748b", font: { size: 14 } },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Recent Activity
            </h2>
            <button
              onClick={() => (window.location.href = "/attendance-log")}
              className="text-lg font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View All
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="px-6 py-8 text-slate-500">
              No recent activity yet.
            </div>
          ) : (
            <div>
              {recent.map((item) => {
                const isFailed =
                  String(item.status).toLowerCase() === "failed" ||
                  String(item.status).toLowerCase() === "absent";

                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-6 last:border-b-0"
                  >
                    <div className="flex min-w-0 gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-200 text-base font-bold text-slate-600">
                        {item.name === "Unknown"
                          ? "?"
                          : item.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-2xl font-bold text-slate-900">
                          {item.name}
                        </div>
                        <div className="mt-1 text-lg leading-7 text-slate-500">
                          {item.meta}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="whitespace-nowrap text-2xl font-bold text-slate-900">
                        {formatTime(item.time)}
                      </div>
                      <div
                        className={`mt-2 text-lg font-medium ${
                          isFailed ? "text-rose-500" : "text-slate-500"
                        }`}
                      >
                        {item.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}