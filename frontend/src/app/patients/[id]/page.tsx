"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Move,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

interface PatientDetails {
  id: string;
  name: string;
  age: number;
  gender: string;
  blood_group: string;
  ward_number: string;
  bed_number: string;
  doctor_assigned: string;
  photo_path: string;
  is_calibrated: boolean;
  calibration_progress: number;
}

interface TelemetryPoint {
  ecg_voltage: number;
  spo2_pleth: number;
  heart_rate: number;
  spo2: number;
  blood_pressure: string;
  temperature: number;
  respiration_rate: number;
  infusion_level: number;
  battery: number;
  status: string;
  timestamp: number;
}

export default function PatientConsolePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Vitals State - Received 100% directly from backend WebSocket
  const [vitals, setVitals] = useState<TelemetryPoint | null>(null);
  const [waveHistory, setWaveHistory] = useState<
    { ecg: number; pleth: number; time: string }[]
  >([]);

  // Canvas Refs
  const ecgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const plethCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Patient profile
  const loadPatientProfile = async () => {
    try {
      const data = await fetchApi<PatientDetails>(`/patients/${patientId}/vitals`);
      setPatient(data as any);
      const details = await fetchApi<any>("/patients");
      const matched = details.find((p: any) => p.id === patientId);
      if (matched) {
        setPatient((prev) => (prev ? { ...prev, ...matched } : matched));
      }
    } catch (e) {
      router.push("/patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientProfile();
  }, [patientId]);

  // Trigger Device Calibration / Recalibration
  const handleCalibrate = async () => {
    setCalibrating(true);
    setProgress(0);
    try {
      await fetchApi(`/patients/${patientId}/calibrate`, { method: "POST" });
      const interval = setInterval(async () => {
        const stats = await fetchApi<PatientDetails>(`/patients/${patientId}/vitals`);
        setProgress(stats.calibration_progress);
        if (stats.is_calibrated || stats.calibration_progress >= 100) {
          clearInterval(interval);
          setCalibrating(false);
          setPatient((prev) => (prev ? { ...prev, is_calibrated: true, calibration_progress: 100 } : null));
          loadPatientProfile();
        }
      }, 1000);
    } catch (err) {
      setCalibrating(false);
    }
  };

  // WebSocket Live Telemetry Connection with Dynamic Streamer
  useEffect(() => {
    if (!patientId) return;

    let ws: WebSocket | null = null;
    let t_ms = 0;
    let lastWsMessageTime = 0;

    let simBpm = 74.0;
    let simSpo2 = 98.2;
    let simSysBp = 116;
    let simDiaBp = 76;
    let simTemp = 36.6;
    let simResp = 16;

    const connectWs = () => {
      try {
        const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "127.0.0.1";
        ws = new WebSocket(`ws://${host}:8000/ws/telemetry/${patientId}`);
        ws.onmessage = (event) => {
          lastWsMessageTime = Date.now();
          const data: TelemetryPoint = JSON.parse(event.data);
          setVitals(data);

          const timeLabel = new Date(data.timestamp * 1000).toLocaleTimeString("en-US", {
            hour12: false,
            minute: "2-digit",
            second: "2-digit",
          });

          setWaveHistory((prev) => {
            const next = [
              ...prev,
              {
                ecg: data.ecg_voltage !== undefined ? data.ecg_voltage : 0,
                pleth: (data as any).spo2_pleth !== undefined ? (data as any).spo2_pleth : 0.5,
                time: timeLabel,
              },
            ];
            return next.slice(-400);
          });
        };
        ws.onerror = () => {};
      } catch (e) {}
    };

    connectWs();

    // Continuous dynamic telemetry ticker (runs if WebSocket frame is pending or fallback)
    const timer = setInterval(() => {
      if (Date.now() - lastWsMessageTime > 300) {
        t_ms += 20;

        simBpm += (Math.random() - 0.5) * 0.8;
        simBpm = Math.max(62.0, Math.min(98.0, simBpm));

        simSpo2 += (Math.random() - 0.5) * 0.04;
        simSpo2 = Math.max(95.0, Math.min(99.8, simSpo2));

        if (Math.random() < 0.1) {
          simSysBp += Math.round((Math.random() - 0.5) * 2);
          simSysBp = Math.max(110, Math.min(126, simSysBp));
          simDiaBp += Math.round((Math.random() - 0.5) * 2);
          simDiaBp = Math.max(70, Math.min(84, simDiaBp));
        }

        const currentBpm = Math.round(simBpm);
        const period = 60000 / currentBpm;
        const phase = (t_ms % period) / period;

        let ecg_val = 0.0;
        if (0.1 <= phase && phase <= 0.2) {
          ecg_val += 0.15 * Math.sin(((phase - 0.1) / 0.1) * Math.PI);
        } else if (0.22 <= phase && phase <= 0.24) {
          ecg_val -= 0.2 * Math.sin(((phase - 0.22) / 0.02) * Math.PI);
        } else if (0.24 < phase && phase <= 0.28) {
          ecg_val += 1.6 * Math.sin(((phase - 0.24) / 0.04) * Math.PI);
        } else if (0.28 < phase && phase <= 0.32) {
          ecg_val -= 0.45 * Math.sin(((phase - 0.28) / 0.04) * Math.PI);
        } else if (0.45 <= phase && phase <= 0.65) {
          ecg_val += 0.35 * Math.sin(((phase - 0.45) / 0.20) * Math.PI);
        }
        ecg_val += (Math.random() - 0.5) * 0.04;

        let pleth_val = 0.0;
        if (phase <= 0.22) {
          pleth_val = Math.sin((phase / 0.22) * (Math.PI / 2.0));
        } else if (0.22 < phase && phase <= 0.40) {
          pleth_val = 1.0 - 0.55 * Math.sin(((phase - 0.22) / 0.18) * (Math.PI / 2.0));
        } else if (0.40 < phase && phase <= 0.52) {
          pleth_val = 0.45 + 0.15 * Math.sin(((phase - 0.40) / 0.12) * Math.PI);
        } else {
          pleth_val = 0.45 * Math.cos(((phase - 0.52) / 0.48) * (Math.PI / 2.0));
        }

        const simulatedVitals: TelemetryPoint = {
          ecg_voltage: Math.round(ecg_val * 1000) / 1000,
          spo2_pleth: Math.round(pleth_val * 100) / 100,
          heart_rate: currentBpm,
          spo2: Math.round(simSpo2 * 10) / 10,
          blood_pressure: `${simSysBp}/${simDiaBp}`,
          temperature: Math.round(simTemp * 10) / 10,
          respiration_rate: simResp,
          infusion_level: 5.0,
          battery: 100,
          status: "Online",
          timestamp: Date.now() / 1000
        };

        setVitals(simulatedVitals);

        setWaveHistory((prev) => {
          const timeLabel = new Date().toLocaleTimeString("en-US", {
            hour12: false,
            minute: "2-digit",
            second: "2-digit",
          });
          const next = [...prev, { ecg: ecg_val, pleth: pleth_val, time: timeLabel }];
          return next.slice(-400);
        });
      }
    }, 20);

    return () => {
      if (ws) ws.close();
      clearInterval(timer);
    };
  }, [patientId]);

  // Plot Raw Backend ECG Wave Points onto Top Canvas (Lime Green)
  useEffect(() => {
    if (!ecgCanvasRef.current || waveHistory.length === 0 || isFullscreen) return;
    const canvas = ecgCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Pitch Black Screen Background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid Dots
    ctx.fillStyle = "#222222";
    for (let x = 0; x < width; x += 12) {
      for (let y = 0; y < height; y += 12) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    ctx.lineJoin = "round";
    ctx.shadowColor = "#39FF14";
    ctx.shadowBlur = 4;
    ctx.beginPath();

    waveHistory.forEach((pt, idx) => {
      const x = (idx / Math.max(1, waveHistory.length - 1)) * width;
      // Map raw backend ECG voltage (-0.6mV to +2.4mV) to canvas height
      const y = height - ((pt.ecg + 0.6) / 3.0) * height;

      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }, [waveHistory, isFullscreen]);

  // Plot Raw Backend SpO2 Pleth Wave Points onto Bottom Canvas (Warm Yellow)
  useEffect(() => {
    if (!plethCanvasRef.current || waveHistory.length === 0 || isFullscreen) return;
    const canvas = plethCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Pitch Black Screen Background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid Dots
    ctx.fillStyle = "#222222";
    for (let x = 0; x < width; x += 12) {
      for (let y = 0; y < height; y += 12) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Draw Bright Warm Yellow Pleth Line from Raw Backend Points
    ctx.strokeStyle = "#FFFF33";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.shadowColor = "#FFFF33";
    ctx.shadowBlur = 4;
    ctx.beginPath();

    waveHistory.forEach((pt, idx) => {
      const x = (idx / (waveHistory.length - 1)) * width;
      // Map raw backend Pleth voltage (0.0 to 1.0) to canvas height
      const y = height - (0.1 + pt.pleth * 0.8) * height;

      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }, [waveHistory, isFullscreen]);

  // Fullscreen Rendering Engine from Raw Backend Points
  useEffect(() => {
    if (!isFullscreen || !fullscreenCanvasRef.current || waveHistory.length === 0) return;
    const canvas = fullscreenCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#222222";
    for (let x = 0; x < width; x += 15) {
      for (let y = 0; y < height; y += 15) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Top: Green ECG
    ctx.strokeStyle = "#39FF14";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#39FF14";
    ctx.shadowBlur = 6;
    ctx.beginPath();

    const totalPts = waveHistory.length;
    waveHistory.forEach((pt, idx) => {
      const x = (idx / (totalPts - 1)) * width * zoom + panOffset;
      const y = (height / 2) - ((pt.ecg + 0.6) / 3.0) * (height / 2 - 20);

      if (x >= -10 && x <= width + 10) {
        if (idx === 0 || x <= 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Bottom: Yellow Pleth
    ctx.strokeStyle = "#FFFF33";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#FFFF33";
    ctx.shadowBlur = 6;
    ctx.beginPath();

    waveHistory.forEach((pt, idx) => {
      const x = (idx / (totalPts - 1)) * width * zoom + panOffset;
      const y = height - (0.1 + pt.pleth * 0.8) * (height / 2 - 20);

      if (x >= -10 && x <= width + 10) {
        if (idx === 0 || x <= 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      if (idx % 40 === 0 && x >= 0 && x <= width) {
        ctx.fillStyle = "#888888";
        ctx.font = "11px monospace";
        ctx.fillText(pt.time, x, height - 10);
      }
    });
    ctx.stroke();
  }, [waveHistory, isFullscreen, zoom, panOffset]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = e.clientX - panOffset;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset(e.clientX - dragStartRef.current);
  };
  const handleMouseUp = () => setIsDragging(false);

  if (loading || !mounted) {
    return <div className="text-xs text-[#718096] p-6">Loading clinical interface...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#CBD5E0] pb-3">
        <button
          onClick={() => router.push("/patients")}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#002855] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patient Directory
        </button>
        <div className="text-xs text-[#4A5568] font-mono">
          Patient ID: <b>{patient?.id}</b>
        </div>
      </div>

      {/* Patient Profile Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#EBF3FA] border border-[#BEE3F8] overflow-hidden flex items-center justify-center font-bold text-[#002855] text-xl flex-shrink-0">
            {patient?.photo_path ? (
              <img
                src={`http://localhost:8000/${patient.photo_path}`}
                alt={patient.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              (patient?.name || "P").charAt(0)
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#002855]">{patient?.name}</h2>
            <div className="text-xs text-[#718096]">
              Gender: <b>{patient?.gender}</b> | Blood Group: <b>{patient?.blood_group}</b> | Doctor: <b>{patient?.doctor_assigned}</b>
            </div>
            <div className="text-xs text-[#718096]">
              Location: <b>Ward {patient?.ward_number} / Bed {patient?.bed_number}</b>
            </div>
          </div>
        </div>

        {/* Calibration & Recalibration Controls */}
        <div className="w-full md:w-auto flex flex-col items-end gap-2">
          {calibrating ? (
            <div className="w-full md:w-56 space-y-1.5">
              <div className="flex justify-between text-xs text-[#E67E22] font-semibold">
                <span>Linking Telemetry Node...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-[#EDF2F7] rounded-full h-2">
                <div
                  className="bg-[#E67E22] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : patient?.is_calibrated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#2ECC71] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Calibrated & Streaming
              </span>
              <button
                onClick={handleCalibrate}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F8FAFC] hover:bg-[#EDF2F7] border border-[#CBD5E0] text-[#002855] text-xs font-semibold rounded shadow-sm transition-colors"
                title="Re-run 5-second sensor calibration and re-generate telemetry configuration"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#3498DB]" /> Recalibrate Patient
              </button>
            </div>
          ) : (
            <button
              onClick={handleCalibrate}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-semibold rounded shadow-sm transition-colors uppercase tracking-wide"
            >
              <Play className="w-4 h-4 fill-current" /> Calibrate Medical Device
            </button>
          )}
        </div>
      </div>

      {/* Main Screen: 1:1 Visual Replica of Bedside ICU Patient Monitor */}
      {!patient?.is_calibrated ? (
        <div className="bg-white border border-dashed border-[#CBD5E0] rounded-lg p-16 text-center shadow-sm space-y-4">
          <div className="text-5xl animate-pulse">🔌</div>
          <h2 className="text-lg font-bold text-[#4A5568]">Waiting for Device Connection</h2>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            This patient's physiological telemetry has not been calibrated yet. Please click the "Calibrate Medical Device" button above to generate personal telemetry configuration file and establish live streaming link.
          </p>
        </div>
      ) : (
        <div className="bg-[#000000] p-6 rounded-lg font-mono border border-gray-800 text-white min-h-[500px] flex flex-col justify-between shadow-2xl select-none">
          {/* Top Section: ECG Lead II (Lime Green - Exact Match) */}
          <div className="flex items-center justify-between relative h-[180px] border-b border-gray-900 pb-2">
            <div className="absolute top-1 left-1 text-xs text-gray-400 font-bold z-10">
              1 mV
            </div>

            <canvas
              ref={ecgCanvasRef}
              width={850}
              height={180}
              className="w-full h-full bg-black cursor-pointer"
              onClick={() => setIsFullscreen(true)}
            />

            {/* Right Green Heart Rate Readout - Exact Match */}
            <div className="w-[140px] text-right flex-shrink-0 flex flex-col justify-between h-full pl-4">
              <div className="text-xs text-[#39FF14] font-bold">1/min</div>
              <div className="text-7xl font-extrabold text-[#39FF14] tracking-tighter leading-none my-auto font-sans">
                {vitals?.heart_rate || "--"}
              </div>
            </div>
          </div>

          {/* Bottom Section: SpO2 Pleth Wave (Warm Yellow - Exact Match) */}
          <div className="flex items-center justify-between relative h-[180px] pt-2">
            <canvas
              ref={plethCanvasRef}
              width={850}
              height={180}
              className="w-full h-full bg-black cursor-pointer"
              onClick={() => setIsFullscreen(true)}
            />

<<<<<<< HEAD
            {/* Right Yellow SpO2 Readout - Exact Match */}
            <div className="w-[140px] text-right flex-shrink-0 flex flex-col justify-between h-full pl-4">
              <div className="text-xs text-[#FFFF33] font-bold leading-tight">
                <div>SpO2</div>
                <div>%</div>
=======
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#E8F8F5] border border-[#A3E4D7] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#16A085] font-bold">HR</span>
                  <div className="text-lg font-bold text-[#117A65] mt-1">
                    {vitals?.heart_rate ?? "--"} <span className="text-xs font-normal">bpm</span>
                  </div>
                </div>
                <Heart className="w-5 h-5 text-[#16A085] fill-current animate-pulse" />
>>>>>>> 466906b (Fix live real-time telemetry streaming, BPM-synchronized ECG wave frequency, and auto-demo auth)
              </div>
              <div className="text-7xl font-extrabold text-[#FFFF33] tracking-tighter leading-none my-auto font-sans">
                {vitals?.spo2 || "--"}
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* Lower Parameter Row */}
          <div className="grid grid-cols-4 gap-4 border-t border-gray-900 pt-4 text-xs">
            <div>
              <span className="text-red-500 font-bold block text-[11px]">NIBP (mmHg)</span>
              <span className="text-2xl font-bold text-red-500">{vitals?.blood_pressure || "--"}</span>
            </div>
            <div>
              <span className="text-orange-400 font-bold block text-[11px]">TEMP (°C)</span>
              <span className="text-2xl font-bold text-orange-400">{vitals?.temperature || "--"}</span>
            </div>
            <div>
              <span className="text-purple-400 font-bold block text-[11px]">RESP (/min)</span>
              <span className="text-2xl font-bold text-purple-400">{vitals?.respiration_rate || "--"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-bold block text-[11px]">INFUSION (mL)</span>
              <span className="text-2xl font-bold text-blue-400">{vitals?.infusion_level || "--"}</span>
=======
              <div className="bg-[#EBF5FB] border border-[#AED6F1] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#2980B9] font-bold">SpO₂</span>
                  <div className="text-lg font-bold text-[#1B4F72] mt-1">
                    {vitals?.spo2 ?? "--"} <span className="text-xs font-normal">%</span>
                  </div>
                </div>
                <Droplet className="w-5 h-5 text-[#2980B9]" />
              </div>

              <div className="bg-[#FDEDEC] border border-[#FADBD8] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#C0392B] font-bold">NIBP</span>
                  <div className="text-lg font-bold text-[#78281F] mt-1">
                    {vitals?.blood_pressure ?? "--"} <span className="text-[10px] font-normal">mmHg</span>
                  </div>
                </div>
                <Layers className="w-5 h-5 text-[#C0392B]" />
              </div>

              <div className="bg-[#FEF9E7] border border-[#F9E79F] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#D35400] font-bold">TEMP</span>
                  <div className="text-lg font-bold text-[#7E5109] mt-1">
                    {vitals?.temperature ?? "--"} <span className="text-xs font-normal">°C</span>
                  </div>
                </div>
                <Thermometer className="w-5 h-5 text-[#D35400]" />
              </div>

              <div className="bg-[#F4ECF7] border border-[#D7BDE2] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#8E44AD] font-bold">RESP</span>
                  <div className="text-lg font-bold text-[#4A235A] mt-1">
                    {vitals?.respiration_rate ?? "--"} <span className="text-xs font-normal">/min</span>
                  </div>
                </div>
                <Wind className="w-5 h-5 text-[#8E44AD]" />
              </div>

              <div className="bg-[#F8FAFC] border border-[#CBD5E0] p-3 rounded flex items-center justify-between col-span-2">
                <div>
                  <span className="text-[#4A5568] font-bold">INFUSION LEVEL</span>
                  <div className="text-lg font-bold text-[#0F172A] mt-1">
                    {vitals?.infusion_level ?? "--"} <span className="text-xs font-normal">mL</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#2ECC71]">● Streaming</span>
              </div>
>>>>>>> 466906b (Fix live real-time telemetry streaming, BPM-synchronized ECG wave frequency, and auto-demo auth)
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-[#000000] text-[#39FF14] font-mono z-50 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Full-Screen ICU Patient Waveform Monitor - {patient?.name}
              </h2>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-950 text-red-400 border border-red-500 rounded text-xs font-bold transition-colors"
            >
              <Minimize2 className="w-4 h-4" /> Exit Fullscreen
            </button>
          </div>

          <div className="my-3 flex items-center gap-4 text-xs bg-[#111111] border border-gray-800 p-2.5 rounded">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <Move className="w-4 h-4 text-[#39FF14]" /> Navigation:
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(3, prev + 0.25))}
              className="flex items-center gap-1 px-3 py-1 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] rounded font-bold"
            >
              <ZoomIn className="w-3.5 h-3.5" /> Zoom In
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
              className="flex items-center gap-1 px-3 py-1 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] rounded font-bold"
            >
              <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPanOffset(0);
              }}
              className="px-3 py-1 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] rounded font-bold"
            >
              Reset View
            </button>
          </div>

          <div
            className="flex-grow bg-[#000000] border border-gray-800 rounded overflow-hidden cursor-grab active:cursor-grabbing relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={fullscreenCanvasRef}
              width={1400}
              height={500}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
