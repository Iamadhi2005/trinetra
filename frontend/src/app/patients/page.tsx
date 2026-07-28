"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { UserPlus, Trash2, Phone, Shield, User as UserIcon } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string;
  guardian_name: string;
  guardian_phone: string;
  photo_path: string;
  status: string;
}

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState(45);
  const [phone, setPhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [devices, setDevices] = useState("ECG Monitor, Pulse Oximeter");

  // Fetch Patients
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: () => fetchApi<Patient[]>("/patients"),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/patients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  // Add Patient Form Submit
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("patient_id", patientId);
    formData.append("name", name);
    formData.append("age", age.toString());
    formData.append("phone", phone);
    formData.append("guardian_name", guardianName);
    formData.append("guardian_phone", guardianPhone);
    formData.append("devices", devices);

    try {
      await fetchApi("/patients", {
        method: "POST",
        body: formData,
      });

      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setShowAddForm(false);
      // Reset
      setPatientId("");
      setName("");
      setPhone("");
      setGuardianName("");
      setGuardianPhone("");
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
            Registered Patient Directory
          </h1>
          <p className="text-xs text-[#718096]">
            Clinical IoMT Device Monitoring & Profile Management
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#002855] hover:bg-[#001D40] text-white text-xs font-semibold rounded shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? "Close Form" : "Register New Patient"}</span>
        </button>
      </div>

      {/* Add Patient Modal/Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddPatient}
          className="bg-white border border-[#E2E8F0] rounded-lg p-6 shadow-sm space-y-4"
        >
          <h2 className="font-bold text-[#002855] text-sm uppercase">
            Add New Clinical Patient Record
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Patient ID (Unique)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. patient_104"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Michael Clark"
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
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+1-555-0401"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">
                Guardian Name
              </label>
              <input
                type="text"
                placeholder="Sarah Clark (Sister)"
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
                placeholder="+1-555-0402"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold rounded text-xs transition-colors shadow-sm"
            >
              Save Patient to Database
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
              className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#EBF3FA] border border-[#BEE3F8] flex items-center justify-center text-[#002855] font-bold text-lg">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#002855] text-sm">
                      {patient.name}
                    </h3>
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

              <div className="text-xs space-y-2 pt-2 border-t border-[#F0F0F0]">
                <div className="flex items-center justify-between text-[#4A5568]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-[#3498DB]" /> Contact:
                  </span>
                  <span>{patient.phone || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between text-[#4A5568]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Shield className="w-3.5 h-3.5 text-[#9B59B6]" /> Guardian:
                  </span>
                  <span>{patient.guardian_name || "N/A"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
