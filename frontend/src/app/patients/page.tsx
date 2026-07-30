"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { UserPlus, Trash2, Phone, Shield, User as UserIcon, Link2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string;
  guardian_name: string;
  guardian_phone: string;
  photo_path: string;
  status: string;
  gender: string;
  blood_group: string;
  ward_number: string;
  bed_number: string;
  doctor_assigned: string;
  is_calibrated: boolean;
  calibration_progress: number;
}

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [age, setAge] = useState(45);
  const [gender, setGender] = useState("Male");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [phone, setPhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [wardNumber, setWardNumber] = useState("ICU-A");
  const [bedNumber, setBedNumber] = useState("Bed-01");
  const [doctorAssigned, setDoctorAssigned] = useState("Dr. Sarah Connor");
  const [devices, setDevices] = useState("ECG Monitor, Pulse Oximeter");
  const [photo, setPhoto] = useState<File | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Patients
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: () => fetchApi<Patient[]>("/patients"),
    enabled: mounted,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/patients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  if (!mounted) {
    return <div className="text-xs text-[#718096]">Loading patient directory...</div>;
  }

  // Add Patient Form Submit
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("age", age.toString());
    formData.append("gender", gender);
    formData.append("blood_group", bloodGroup);
    formData.append("phone", phone);
    formData.append("guardian_name", guardianName);
    formData.append("guardian_phone", guardianPhone);
    formData.append("ward_number", wardNumber);
    formData.append("bed_number", bedNumber);
    formData.append("doctor_assigned", doctorAssigned);
    formData.append("devices", devices);
    if (photo) {
      formData.append("photo", photo);
    }

    try {
      await fetchApi("/patients", {
        method: "POST",
        body: formData,
      });

      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setShowAddForm(false);
      // Reset
      setName("");
      setPhone("");
      setGuardianName("");
      setGuardianPhone("");
      setPhoto(null);
    } catch (err: any) {
      alert(err.message || "Failed to register patient");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#002855]">
            Admitted Patient Directory
          </h1>
          <p className="text-xs text-[#718096]">
            Clinical IoMT Device Monitoring, Vitals Telemetry & Profile Management
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#002855] hover:bg-[#001D40] text-white text-xs font-semibold rounded shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? "Close Form" : "Admit New Patient"}</span>
        </button>
      </div>

      {/* Add Patient Modal/Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddPatient}
          className="bg-white border border-[#E2E8F0] rounded-lg p-6 shadow-sm space-y-4"
        >
          <h2 className="font-bold text-[#002855] text-sm uppercase">
            Admit Patient & Register Telemetry Nodes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              >
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
                <option value="O+">O+</option>
                <option value="A-">A-</option>
                <option value="B-">B-</option>
                <option value="AB-">AB-</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+1-555-0101"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Assigned Doctor
              </label>
              <input
                type="text"
                placeholder="Dr. Sarah Connor"
                value={doctorAssigned}
                onChange={(e) => setDoctorAssigned(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Ward Number
              </label>
              <input
                type="text"
                placeholder="ICU-A"
                value={wardNumber}
                onChange={(e) => setWardNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Bed Number
              </label>
              <input
                type="text"
                placeholder="Bed-01"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Device Assignment (comma separated)
              </label>
              <input
                type="text"
                placeholder="ECG Monitor, Pulse Oximeter, Infusion Pump"
                value={devices}
                onChange={(e) => setDevices(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Guardian Name
              </label>
              <input
                type="text"
                placeholder="Jane Doe (Spouse)"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Guardian Phone
              </label>
              <input
                type="text"
                placeholder="+1-555-0102"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Patient Photograph
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs py-1 text-gray-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold rounded text-xs transition-colors shadow-sm"
            >
              Save Patient to SQL Database
            </button>
          </div>
        </form>
      )}

      {/* Patient Cards List */}
      {isLoading ? (
        <div className="text-xs text-[#718096]">Loading patient records...</div>
      ) : patients.length === 0 ? (
        <div className="bg-white border border-dashed border-[#CBD5E0] rounded-lg p-12 text-center text-xs text-[#A0AEC0]">
          No patients registered inside the database backend.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#EBF3FA] border border-[#BEE3F8] flex items-center justify-center text-[#002855] font-bold text-lg overflow-hidden">
                    {patient.photo_path ? (
                      <img
                        src={`http://localhost:8000/${patient.photo_path}`}
                        alt={patient.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      (patient.name || "P").charAt(0)
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="font-bold text-[#002855] text-sm hover:underline flex items-center gap-1"
                    >
                      {patient.name} <Link2 className="w-3.5 h-3.5 text-[#3498DB]" />
                    </Link>
                    <div className="text-xs text-[#718096]">
                      ID: <code>{patient.id}</code> | Age: {patient.age}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteMutation.mutate(patient.id)}
                  className="p-1.5 text-[#E74C3C] hover:bg-[#FDEDEC] rounded transition-colors"
                  title="Delete Patient Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs space-y-2 pt-2 border-t border-[#F0F0F0] text-[#4A5568]">
                <div className="flex justify-between">
                  <span>Location:</span>
                  <b className="text-[#0F172A]">
                    {patient.ward_number} - {patient.bed_number}
                  </b>
                </div>
                <div className="flex justify-between">
                  <span>Assigned Doctor:</span>
                  <b>{patient.doctor_assigned}</b>
                </div>
                <div className="flex justify-between">
                  <span>Telemetry State:</span>
                  {patient.is_calibrated ? (
                    <span className="text-[#2ECC71] font-semibold">● CALIBRATED</span>
                  ) : (
                    <span className="text-[#E67E22] font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> UNCALIBRATED
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/patients/${patient.id}`}
                  className="w-full block text-center py-2 bg-[#EBF3FA] hover:bg-[#D4E6F1] text-[#002855] text-xs font-semibold rounded transition-colors"
                >
                  Open Monitoring Console
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
