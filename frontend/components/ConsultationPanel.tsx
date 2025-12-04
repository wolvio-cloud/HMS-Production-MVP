"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Printer } from "lucide-react";
import PatientInfo from "./PatientInfo";
import PrescriptionBuilder from "./PrescriptionBuilder";
import LabOrders from "./LabOrders";
import LifestyleAdvice from "./LifestyleAdvice";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
// ...existing code...
export default function ConsultationPanel({
  patient,
  onComplete,
  onCancel,
}: ConsultationPanelProps) {
  const [activeTab, setActiveTab] = useState<"prescription" | "history">("prescription");
  const [prescriptionItems, setPrescriptionItems] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [lifestyleAdvice, setLifestyleAdvice] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // New UX states
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const DRAFT_KEY = `consultation_draft_${patient.id}`;

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        setPrescriptionItems(draft.prescriptionItems || []);
        setLabTests(draft.labTests || []);
        setLifestyleAdvice(draft.lifestyleAdvice || []);
        setDiagnosis(draft.diagnosis || "");
        setNotes(draft.notes || "");
        setLastSavedAt(draft.savedAt || Date.now());
      }
    } catch (e) {
      console.warn("Failed to load draft:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = () => {
    try {
      const payload = {
        prescriptionItems,
        labTests,
        lifestyleAdvice,
        diagnosis,
        notes,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setLastSavedAt(payload.savedAt);
      toast.dismiss();
      toast.success("Draft saved", { duration: 1000 });
    } catch (e) {
      console.warn("Failed to save draft:", e);
    }
  };

  // Debounced autosave when inputs change
  useEffect(() => {
    const t = setTimeout(() => saveDraft(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescriptionItems, labTests, lifestyleAdvice, diagnosis, notes]);

  // Periodic autosave as safety net
  useEffect(() => {
    const interval = setInterval(() => saveDraft(), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + Enter to finish
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        handleFinishConsultation();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescriptionItems, labTests, diagnosis, notes, lifestyleAdvice, saving]);

  const handlePrintPrescription = async (prescriptionId: string) => {
    try {
      toast.loading("Generating prescription PDF...");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const token = localStorage.getItem("hms_token");
      const response = await fetch(`${API_URL}/prescriptions/${prescriptionId}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();

      // Try derive filename from headers
      const disposition = response.headers.get("content-disposition") || "";
      let filename = `prescription-${prescriptionId}.pdf`;
      const match = /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i.exec(disposition);
      if (match && match[1]) filename = decodeURIComponent(match[1]);

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
      toast.dismiss();
      toast.success("Prescription PDF downloaded/opened!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate prescription PDF");
      console.error("Error generating PDF:", error);
    }
  };

  const handleFinishConsultation = async () => {
    if (prescriptionItems.length === 0 && labTests.length === 0) {
      toast.error("Please add at least one prescription or lab test");
      return;
    }

    // Confirm before finalizing
    const ok = window.confirm(
      "Finish consultation and route patient to the next stage? This action cannot be undone."
    );
    if (!ok) return;

    setSaving(true);
    try {
      // Create prescription if items exist
      if (prescriptionItems.length > 0) {
        await api.createPrescription({
          patientId: patient.id,
          diagnosis,
          notes: `${notes}\n\nLifestyle Advice: ${lifestyleAdvice.join(", ")}`,
          items: prescriptionItems,
        });
      }

      // Create lab orders if tests exist
      if (labTests.length > 0) {
        await api.createLabOrder({
          patientId: patient.id,
          testIds: labTests.map((t) => t.id),
          clinicalNotes: diagnosis,
        });
      }

      // Auto-route patient to next stage
      await api.autoRoutePatient(patient.id);

      // Clear draft on success
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}

      toast.success("Consultation completed! Patient routed to next stage.");
      onComplete();
    } catch (error: any) {
      console.error("Error finishing consultation:", error);
      toast.error(error?.response?.data?.message || "Failed to complete consultation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-6 h-[calc(100vh-240px)] flex flex-col relative">
      {/* Saving overlay */}
      {saving && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-50">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Saving consultation...</span>
          </div>
        </div>
      )}

      {/* Patient Info & Vitals */}
      <PatientInfo patient={patient} />

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("prescription")}
          className={`pb-3 px-2 font-medium transition-all ${
            activeTab === "prescription"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          aria-pressed={activeTab === "prescription"}
        >
          Prescription & Advice
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 px-2 font-medium transition-all ${
            activeTab === "history"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          aria-pressed={activeTab === "history"}
        >
          Medical History
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === "prescription" ? (
            <motion.div
              key="prescription"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="input-glass"
                  placeholder="Enter diagnosis..."
                  aria-label="Diagnosis"
                />
              </div>

              {/* 1. Medications */}
              <PrescriptionBuilder
                patientId={patient.id}
                items={prescriptionItems}
                onItemsChange={setPrescriptionItems}
              />

              {/* 2. Lab Investigations */}
              <LabOrders
                patientId={patient.id}
                tests={labTests}
                onTestsChange={setLabTests}
              />

              {/* 3. Lifestyle & Advice */}
              <LifestyleAdvice
                advice={lifestyleAdvice}
                onAdviceChange={setLifestyleAdvice}
              />

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-glass h-24 resize-none"
                  placeholder="Type custom advice here..."
                  aria-label="Additional notes"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="font-semibold text-gray-800 mb-3">
                Previous Prescriptions
              </h3>
              {patient.prescriptions && patient.prescriptions.length > 0 ? (
                patient.prescriptions.map((rx: any) => (
                  <div
                    key={rx.id}
                    className="bg-white/60 rounded-lg p-4 border border-white/40"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">
                          {new Date(rx.createdAt).toLocaleDateString()}
                        </p>
                        <p className="font-medium text-gray-800">
                          {rx.diagnosis}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePrintPrescription(rx.id)}
                        className="ml-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded-lg transition-colors flex items-center gap-2"
                        title="Print Prescription"
                      >
                        <Printer className="w-4 h-4" />
                        <span className="text-sm font-medium">Print</span>
                      </button>
                    </div>
                    <div className="space-y-1">
                      {rx.items.map((item: any) => (
                        <p key={item.id} className="text-sm text-gray-700">
                          • {item.medicine.name} - {item.dosage}, {item.frequency},{" "}
                          {item.duration}
                        </p>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No previous prescriptions
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          {lastSavedAt ? (
            <>Auto-saved <span className="text-indigo-600">{new Date(lastSavedAt).toLocaleTimeString()}</span></>
          ) : (
            <>No draft saved yet</>
          )}
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleFinishConsultation}
            disabled={saving || (prescriptionItems.length === 0 && labTests.length === 0)}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
            title={prescriptionItems.length === 0 && labTests.length === 0 ? "Add a prescription or lab test before finishing" : "Finish consultation (Ctrl/Cmd + Enter)"}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Finish Consultation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Info */}
      <p className="text-center text-xs text-indigo-600 mt-3">
        ✓ Solution: Live Stock, One-Click Labs, Holistic Advice.
      </p>
    </div>
  );
}