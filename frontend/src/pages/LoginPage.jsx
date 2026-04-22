import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (err) => {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (Array.isArray(err?.detail)) return err.detail.map((x) => x.msg).join(", ");
    if (typeof err?.detail === "string") return err.detail;
    return "Login failed";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/auth/login", {
        email,
        password,
      });

      login(response.data, email);
      window.location.href = "/";
    } catch (err) {
      setError(getErrorMessage(err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-600">
          FaceGuard
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-2 text-slate-500">
          Sign in to manage attendance, face scan, and personnel.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Admin or teacher email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-indigo-400"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-indigo-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <div><strong>Admin:</strong> admin@school.com / Admin@123</div>
          <div><strong>Teacher:</strong> teacher1@school.com / Teacher@123</div>
        </div>
      </div>
    </div>
  );
}