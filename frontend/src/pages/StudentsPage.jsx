import { useEffect, useMemo, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

const blankForm = {
  student_code: "",
  full_name: "",
  class_name: "",
  late_after: "08:00",
  active: true,
};

export default function StudentsPage() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [faces, setFaces] = useState([]);
  const [enrollFrames, setEnrollFrames] = useState([]);
  const [message, setMessage] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const loadStudents = () =>
    client
      .get("/students")
      .then((res) => {
        setStudents(res.data || []);
        setFiltered(res.data || []);
      })
      .catch(() => setMessage("Failed to load personnel"));

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(students);
      return;
    }

    setFiltered(
      students.filter((s) =>
        [s.full_name, s.student_code, s.class_name]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [search, students]);

  const resetForm = () => {
    setForm(blankForm);
    setEditingId(null);
  };

  const submitStudent = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      late_after:
        form.late_after && form.late_after.length === 5
          ? `${form.late_after}:00`
          : form.late_after,
    };

    try {
      if (editingId) {
        await client.put(`/students/${editingId}`, payload);
        setMessage("Student updated successfully");
      } else {
        await client.post("/students", payload);
        setMessage("Student created successfully");
      }
      resetForm();
      loadStudents();
    } catch {
      setMessage("Unable to save student");
    }
  };

  const editStudent = (student) => {
    setEditingId(student.id);
    setForm({
      full_name: student.full_name,
      class_name: student.class_name,
      student_code: student.student_code,
      late_after: String(student.late_after || "08:00:00").slice(0, 5),
      active: student.active,
    });
  };

  const removeStudent = async (studentId) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      await client.delete(`/students/${studentId}`);
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
        setFaces([]);
      }
      setMessage("Student deleted");
      loadStudents();
    } catch {
      setMessage("Unable to delete student");
    }
  };

  const loadFaces = async (studentId) => {
    try {
      const { data } = await client.get(`/face/students/${studentId}/faces`);
      setFaces(data || []);
    } catch {
      setFaces([]);
    }
  };

  const chooseStudent = async (student) => {
    setSelectedStudent(student);
    await loadFaces(student.id);
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video?.videoWidth) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL("image/png");
    setEnrollFrames((prev) => [...prev, frame].slice(-5));
  };

  const enrollFace = async () => {
    if (!selectedStudent || enrollFrames.length < 3) return;
    try {
      await client.post(`/face/students/${selectedStudent.id}/enroll`, {
        profile_name: "Webcam Enrollment",
        images_base64: enrollFrames,
        set_as_primary: true,
      });
      setMessage(`Face enrolled for ${selectedStudent.full_name}`);
      setEnrollFrames([]);
      await loadFaces(selectedStudent.id);
      loadStudents();
    } catch {
      setMessage("Face enrollment failed");
    }
  };

  const selectedCount = useMemo(() => enrollFrames.length, [enrollFrames]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
          Personnel Directory
        </h1>
      </div>

      {message && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-8 py-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Registered Students
          </h2>

          <div className="flex items-center gap-4">
            <input
              className="w-80 rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 outline-none focus:border-indigo-400"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {isAdmin && (
              <button
                onClick={resetForm}
                className="rounded-2xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-700"
              >
                Add User
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm uppercase tracking-wide text-slate-500">
                <th className="px-8 py-4">User</th>
                <th className="px-8 py-4">Class</th>
                <th className="px-8 py-4">Late After</th>
                <th className="px-8 py-4">Profiles</th>
                <th className="px-8 py-4">Status</th>
                {isAdmin && <th className="px-8 py-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                    selectedStudent?.id === s.id ? "bg-indigo-50/60" : ""
                  }`}
                  onClick={() => chooseStudent(s)}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                        {(s.full_name || "S").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{s.full_name}</div>
                        <div className="text-sm text-slate-500">{s.student_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xl text-slate-600">{s.class_name}</td>
                  <td className="px-8 py-6 text-xl text-slate-600">
                    {String(s.late_after || "08:00:00").slice(0, 8)}
                  </td>
                  <td className="px-8 py-6 text-xl text-slate-600">{s.face_profiles?.length || 0}</td>
                  <td className="px-8 py-6">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        s.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-8 py-6">
                      <div className="flex gap-2">
                        <button
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            editStudent(s);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStudent(s.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {isAdmin && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900">
              {editingId ? "Edit Student" : "Add Student"}
            </h3>

            <form className="mt-6 grid grid-cols-2 gap-4" onSubmit={submitStudent}>
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
                placeholder="Student code"
                value={form.student_code}
                onChange={(e) => setForm({ ...form, student_code: e.target.value })}
                disabled={!!editingId}
              />
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
                placeholder="Class name"
                value={form.class_name}
                onChange={(e) => setForm({ ...form, class_name: e.target.value })}
              />
              <input
                type="time"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
                value={form.late_after}
                onChange={(e) => setForm({ ...form, late_after: e.target.value })}
              />

              <label className="col-span-2 flex items-center gap-3 text-slate-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>

              <div className="col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  {editingId ? "Save Changes" : "Create Student"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">Face Enrollment</h3>

          {!selectedStudent ? (
            <p className="mt-4 text-slate-500">Select a student to review or enroll face samples.</p>
          ) : !isAdmin ? (
            <p className="mt-4 text-slate-500">Only admin can enroll or update face samples.</p>
          ) : (
            <>
              <p className="mt-3 text-slate-500">
                Selected: <strong>{selectedStudent.full_name}</strong>
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-2xl bg-indigo-50 px-4 py-3 font-semibold text-indigo-600 hover:bg-indigo-100"
                  onClick={startCamera}
                >
                  Start Camera
                </button>
                <button
                  className="rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200"
                  onClick={captureFrame}
                >
                  Capture Sample
                </button>
                <button
                  className="rounded-2xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  onClick={enrollFace}
                  disabled={selectedCount < 3}
                >
                  Enroll {selectedCount}/3
                </button>
              </div>

              <p className="mt-4 text-slate-500">
                Capture 3 clear face samples with slightly different angles.
              </p>

              <video ref={videoRef} autoPlay playsInline className="mt-4 w-full rounded-3xl bg-slate-900" />
              <canvas ref={canvasRef} className="hidden" />

              <div className="mt-4 flex gap-3">
                {enrollFrames.map((frame, idx) => (
                  <img
                    key={idx}
                    src={frame}
                    alt={`capture-${idx}`}
                    className="h-24 w-24 rounded-2xl border border-slate-200 object-cover"
                  />
                ))}
              </div>
            </>
          )}

          <div className="mt-6">
            <h4 className="text-lg font-bold text-slate-900">Saved Face Profiles</h4>
            <ul className="mt-3 space-y-3">
              {faces.map((face) => (
                <li key={face.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="font-semibold text-slate-900">{face.profile_name}</div>
                  <div className="text-sm text-slate-500">Quality: {face.quality_score ?? "-"}%</div>
                  <div className="text-sm text-slate-500">
                    {face.is_primary ? "Primary" : "Secondary"}
                  </div>
                </li>
              ))}
              {!faces.length && <li className="text-slate-500">No face profiles enrolled yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}