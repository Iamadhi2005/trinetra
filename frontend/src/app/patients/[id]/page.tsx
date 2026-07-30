"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  Heart,
  Droplet,
  Thermometer,
  Wind,
  Layers,
  Shield,
  Activity,
  Play,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Move,
  ArrowLeft,
  CheckCircle,
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

  // Vitals State
  const [vitals, setVitals] = useState<TelemetryPoint | null>(null);
  const [ecgHistory, setEcgHistory] = useState<{ x: number; y: number; time: string }[]>([]);

  // Canvas Refs for live ECG
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
      // If patient exists but backend model didn't return metadata, reload profile
      const details = await fetchApi<any>("/patients");
      const matched = details.find((p: any) => p.id === patientId);
      if (matched) {
        setPatient((prev) => prev ? { ...prev, ...matched } : matched);
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

  // Trigger Device Calibration
  const handleCalibrate = async () => {
    setCalibrating(true);
    setProgress(0);
    try {
      await fetchApi(`/patients/${patientId}/calibrate`, { method: "POST" });
      
      // Poll progress bar
      const interval = setInterval(async () => {
        const stats = await fetchApi<PatientDetails>(`/patients/${patientId}/vitals`);
        setProgress(stats.calibration_progress);
        if (stats.is_calibrated || stats.calibration_progress >= 100) {
          clearInterval(interval);
          setCalibrating(false);
          loadPatientProfile();
        }
      }, 1000);
    } catch (err) {
      setCalibrating(false);
    }
  };

  // WebSocket Live Telemetry Connection
  useEffect(() => {
    if (!patient?.is_calibrated) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/telemetry/${patientId}`);
    let ecgCounter = 0;

    ws.onmessage = (event) => {
      const data: TelemetryPoint = JSON.parse(event.data);
      setVitals(data);

      const timeLabel = new Date(data.timestamp * 1000).toLocaleTimeString("en-US", {
        hour12: false,
        minute: "2-digit",
        second: "2-digit",
      });

      setEcgHistory((prev) => {
        ecgCounter++;
        const next = [...prev, { x: ecgCounter, y: data.ecg_voltage, time: timeLabel }];
        return next.slice(-800); // Buffer up to 800 points (~16 seconds)
      });
    };

    return () => {
      ws.close();
    };
  }, [patient?.is_calibrated, patientId]);

  // Canvas Drawing: Normal Live Scrolling View
  useEffect(() => {
    if (!canvasRef.current || ecgHistory.length === 0 || isFullscreen) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw Grid Lines (Hospital Monitor Style)
    ctx.strokeStyle = "#F0F3F4";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Plot ECG Line
    ctx.strokeStyle = "#2ECC71";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    const drawPoints = ecgHistory.slice(-250); // last 5 seconds in regular view
    drawPoints.forEach((pt, idx) => {
      const xCoord = (idx / (drawPoints.length - 1)) * width;
      // Map voltage (-0.5 to 2.0mV) to canvas coordinates
      const yCoord = height - ((pt.y + 0.5) / 2.5) * height;

      if (idx === 0) {
        ctx.moveTo(xCoord, yCoord);
      } else {
        ctx.lineTo(xCoord, yCoord);
      }
    });
    ctx.stroke();
  }, [ecgHistory, isFullscreen]);

  // Canvas Drawing: Fullscreen Panned/Zoomed View
  useEffect(() => {
    if (!isFullscreen || !fullscreenCanvasRef.current || ecgHistory.length === 0) return;
    const canvas = fullscreenCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Grid Lines
    ctx.strokeStyle = "#2C3E50";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Plot with Zoom and Pan offset
    ctx.strokeStyle = "#00FF66";
    ctx.lineWidth = 3.0;
    ctx.beginPath();

    const totalPoints = ecgHistory.length;
    ecgHistory.forEach((pt, idx) => {
      // Apply zoom ratio and pan drag offset
      const xCoord = (idx / (totalPoints - 1)) * width * zoom + panOffset;
      const yCoord = height - ((pt.y + 0.5) / 2.5) * height;

      // Draw within visible canvas bounds only
      if (xCoord >= -10 && xCoord <= width + 10) {
        if (idx === 0 || xCoord === -10) {
          ctx.moveTo(xCoord, yCoord);
        } else {
          ctx.lineTo(xCoord, yCoord);
        }
      }

      // Render timestamp markers along the X axis
      if (idx % 80 === 0 && xCoord >= 0 && xCoord <= width) {
        ctx.fillStyle = "#A0AEC0";
        ctx.font = "10px monospace";
        ctx.fillText(pt.time, xCoord, height - 10);
      }
    });
    ctx.stroke();
  }, [ecgHistory, isFullscreen, zoom, panOffset]);

  // Drag Panning Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = e.clientX - panOffset;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset(e.clientX - dragStartRef.current);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (loading) {
    return <div className="text-xs text-[#718096] p-6">Loading clinical interface...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <button
          onClick={() => router.push("/patients")}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#002855] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </button>
        <div className="text-xs text-[#718096]">
          Patient ID: <code>{patient?.id}</code>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#EBF3FA] border border-[#BEE3F8] overflow-hidden flex items-center justify-center font-bold text-[#002855] text-2xl flex-shrink-0">
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
            <h2 className="text-lg font-bold text-[#002855]">{patient?.name}</h2>
            <div className="text-xs text-[#718096] mt-0.5">
              Gender: <b>{patient?.gender}</b> | Blood Group: <b>{patient?.blood_group}</b> | Doctor: <b>{patient?.doctor_assigned}</b>
            </div>
            <div className="text-xs text-[#718096] mt-0.5">
              Location: <b>Ward {patient?.ward_number} / Bed {patient?.bed_number}</b>
            </div>
          </div>
        </div>

        {/* Calibration controls */}
        {!patient?.is_calibrated && (
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
            ) : (
              <button
                onClick={handleCalibrate}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-semibold rounded shadow-sm transition-colors uppercase tracking-wide"
              >
                <Play className="w-4 h-4 fill-current" /> Calibrate Medical Device
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Monitoring Screen */}
      {!patient?.is_calibrated ? (
        <div className="bg-white border border-dashed border-[#CBD5E0] rounded-lg p-16 text-center shadow-sm space-y-4">
          <div className="text-5xl animate-pulse">🔌</div>
          <h2 className="text-lg font-bold text-[#4A5568]">Waiting for Device Connection</h2>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            This patient's physiological telemetry has not been calibrated yet. Please click the "Calibrate Medical Device" button above to establish WebSocket data streaming link.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real-time Physiological Waveform Canvas */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#002855] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#2ECC71]" /> Live ECG Waveform
              </h3>
              <button
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1 text-[11px] text-[#718096] hover:text-[#002855] font-semibold"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Viewer
              </button>
            </div>

            <div className="relative border border-[#E2E8F0] bg-white rounded overflow-hidden">
              <canvas
                ref={canvasRef}
                width={700}
                height={200}
                className="w-full h-[200px]"
              />
            </div>
          </div>

          {/* Vitals Numeric Grid */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-[#002855] text-xs uppercase tracking-wider">
              Clinical Vital Signs
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#E8F8F5] border border-[#A3E4D7] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#16A085] font-bold">HR</span>
                  <div className="text-lg font-bold text-[#117A65] mt-1">
                    {vitals?.heart_rate || "--"} <span className="text-xs font-normal">bpm</span>
                  </div>
                </div>
                <Heart className="w-5 h-5 text-[#16A085] fill-current animate-pulse" />
              </div>

              <div className="bg-[#EBF5FB] border border-[#AED6F1] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#2980B9] font-bold">SpO₂</span>
                  <div className="text-lg font-bold text-[#1B4F72] mt-1">
                    {vitals?.spo2 || "--"} <span className="text-xs font-normal">%</span>
                  </div>
                </div>
                <Droplet className="w-5 h-5 text-[#2980B9]" />
              </div>

              <div className="bg-[#FDEDEC] border border-[#FADBD8] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#C0392B] font-bold">NIBP</span>
                  <div className="text-lg font-bold text-[#78281F] mt-1">
                    {vitals?.blood_pressure || "--"} <span className="text-[10px] font-normal">mmHg</span>
                  </div>
                </div>
                <Layers className="w-5 h-5 text-[#C0392B]" />
              </div>

              <div className="bg-[#FEF9E7] border border-[#F9E79F] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#D35400] font-bold">TEMP</span>
                  <div className="text-lg font-bold text-[#7E5109] mt-1">
                    {vitals?.temperature || "--"} <span className="text-xs font-normal">°C</span>
                  </div>
                </div>
                <Thermometer className="w-5 h-5 text-[#D35400]" />
              </div>

              <div className="bg-[#F4ECF7] border border-[#D7BDE2] p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[#8E44AD] font-bold">RESP</span>
                  <div className="text-lg font-bold text-[#4A235A] mt-1">
                    {vitals?.respiration_rate || "--"} <span className="text-xs font-normal">/min</span>
                  </div>
                </div>
                <Wind className="w-5 h-5 text-[#8E44AD]" />
              </div>

              <div className="bg-[#F8FAFC] border border-[#CBD5E0] p-3 rounded flex items-center justify-between col-span-2">
                <div>
                  <span className="text-[#4A5568] font-bold">INFUSION LEVEL</span>
                  <div className="text-lg font-bold text-[#0F172A] mt-1">
                    {vitals?.infusion_level || "--"} <span className="text-xs font-normal">mL</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#2ECC71]">● Streaming</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen ECG Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-[#0A0F1D] text-[#00FF66] font-mono z-50 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#00FF66]/30 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#00FF66] animate-pulse" />
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                ECG Live Grid Viewer - {patient?.name}
              </h2>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-950 text-red-400 border border-red-500 rounded text-xs font-bold transition-colors"
            >
              <Minimize2 className="w-4 h-4" /> Close Fullscreen
            </button>
          </div>

          {/* Interactive Zoom/Pan Toolbar */}
          <div className="my-4 flex items-center gap-4 text-xs bg-[#111827] border border-[#00FF66]/20 p-3 rounded">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <Move className="w-4 h-4 text-[#00FF66]" /> Navigation:
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(3, prev + 0.25))}
              className="flex items-center gap-1 px-3 py-1 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 border border-[#00FF66]/30 text-[#00FF66] rounded"
            >
              <ZoomIn className="w-3.5 h-3.5" /> Zoom In
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
              className="flex items-center gap-1 px-3 py-1 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 border border-[#00FF66]/30 text-[#00FF66] rounded"
            >
              <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPanOffset(0);
              }}
              className="px-3 py-1 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 border border-[#00FF66]/30 text-[#00FF66] rounded"
            >
              Reset view
            </button>
            <span className="text-[#00FF66]/70 ml-auto hidden md:block">
              ℹ️ Drag left/right on canvas to pan across historical heart waveform.
            </span>
          </div>

          {/* Fullscreen Canvas area */}
          <div
            className="flex-grow bg-black border border-[#00FF66]/30 rounded overflow-hidden cursor-grab active:cursor-grabbing relative"
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

          <div className="mt-4 text-[10px] text-[#00FF66]/70 text-right">
            TRINETRA CENTRAL PATIENT MONITORING STATION • SECURED CHANNEL
          </div>
        </div>
      )}
    </div>
  );
}
