import { useEffect, useRef, useState } from "react";
import client from "../api/client";

export default function WebcamPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [frames, setFrames] = useState([]);
  const [status, setStatus] = useState("idle");
  const [instruction, setInstruction] = useState("Press Start Scan to begin.");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreaming(true);
      setMessage("");
    } catch {
      setMessage("Unable to access camera");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video?.videoWidth) return null;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  };

  const runScan = async () => {
    setMessage("");
    setResult(null);
    setFrames([]);

    if (!streaming) {
      await startCamera();
      await wait(800);
    }

    setStatus("scanning");
    setInstruction("Center your face inside the guide.");
    await wait(1200);
    const f1 = captureFrame();

    setInstruction("Blink once.");
    await wait(1400);
    const f2 = captureFrame();

    setInstruction("Turn slightly left or right.");
    await wait(1400);
    const f3 = captureFrame();

    const collected = [f1, f2, f3].filter(Boolean);
    setFrames(collected);

    if (collected.length < 3) {
      setStatus("failed");
      setMessage("Could not capture enough frames. Try again.");
      return;
    }

    try {
      setStatus("processing");
      setInstruction("Analyzing face and verifying liveness...");

      const livenessRes = await client.post("/face/liveness-check", {
        frames_base64: collected,
      });

      if (!livenessRes.data?.passed) {
        setStatus("failed");
        setMessage(livenessRes.data?.reason || "Liveness check failed");
        return;
      }

      const { data } = await client.post("/face/checkin", {
        frames_base64: collected,
        challenge_text: "Blink once and turn slightly",
      });

      setStatus("success");
      setInstruction("Scan completed successfully.");
      setResult({
        name: data.student_name,
        status: data.status,
        confidence: data.confidence,
        time: data.check_in_time,
      });
      setMessage(`${data.student_name} marked ${data.status} with ${data.confidence}% confidence`);

      setTimeout(() => {
        window.location.href = "/attendance-log";
      }, 1500);
    } catch (err) {
      setStatus("failed");
      setMessage(err.response?.data?.detail || "Face check-in failed");
    }
  };

  const statusClasses = {
    idle: "bg-slate-100 text-slate-600",
    scanning: "bg-blue-100 text-blue-700",
    processing: "bg-violet-100 text-violet-700",
    success: "bg-emerald-100 text-emerald-700",
    failed: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
          Face Scan
        </h1>
      </div>

      <div className="grid grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Live Camera</h2>
              <p className="mt-2 text-slate-500">
                Look at the camera and follow the guided instruction.
              </p>
            </div>
            <span className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${statusClasses[status]}`}>
              {status}
            </span>
          </div>

          <div className="relative mt-6 grid h-135 place-items-center overflow-hidden rounded-[28px] bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute h-72.5 w-72.5 rounded-full border-4 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />

            <div className="absolute top-5 rounded-full bg-slate-900/85 px-5 py-3 text-lg font-semibold text-white">
              {instruction}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-indigo-50 px-5 py-3 font-semibold text-indigo-600 hover:bg-indigo-100"
              onClick={startCamera}
            >
              Start Camera
            </button>
            <button
              className="rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
              onClick={runScan}
            >
              Start Scan
            </button>
            <button
              className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
              onClick={stopCamera}
            >
              Stop
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
                status === "failed"
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            {frames.map((frame, idx) => (
              <img
                key={idx}
                src={frame}
                alt={`frame-${idx}`}
                className="h-24 w-24 rounded-2xl border border-slate-200 object-cover"
              />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold text-slate-900">Scan Result</h2>

          {!result ? (
            <p className="mt-4 text-slate-500">
              No result yet. Press <strong>Start Scan</strong> and follow the prompt.
            </p>
          ) : (
            <div className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-5">
              <div className="text-xl"><strong>Name:</strong> {result.name}</div>
              <div className="text-xl"><strong>Status:</strong> {result.status}</div>
              <div className="text-xl"><strong>Confidence:</strong> {result.confidence}%</div>
              <div className="text-xl"><strong>Time:</strong> {result.time}</div>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-xl font-bold text-slate-900">How it works</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-500">
              <li>Center your face inside the guide circle</li>
              <li>Blink once when prompted</li>
              <li>Turn slightly left or right</li>
              <li>The system checks liveness and recognition automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}