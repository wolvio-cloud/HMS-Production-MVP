"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Printer } from "lucide-react";
import PatientInfo from "./PatientInfo";
import PrescriptionBuilder from "./PrescriptionBuilder";
import LabOrders from "./LabOrders";
import LifestyleAdvice from "./LifestyleAdvice";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface ConsultationPanelProps {
  patient: any;
  onComplete: () => void;
  onCancel: () => void;
}

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

  const handlePrintPrescription = async (prescriptionId: string) => {
    try {
      toast.loading("Generating prescription PDF...");

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const token = localStorage.getItem("hms_token");

      // Fetch PDF with proper authentication
      const response = await fetch(`${API_URL}/prescriptions/${prescriptionId}/pdf`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create blob URL and open in new tab
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");

      // Clean up blob URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);

      toast.dismiss();
      toast.success("Prescription PDF opened!");
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

      toast.success("Consultation completed! Patient routed to next stage.");
      onComplete();
    } catch (error: any) {
      console.error("Error finishing consultation:", error);
      toast.error(
        error.response?.data?.message || "Failed to complete consultation"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col max-h-[calc(100vh-200px)]">
      {/* Patient Info & Vitals - Compact */}
      <PatientInfo patient={patient} />

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("prescription")}
          className={`pb-2 px-2 text-sm font-medium transition-all ${
            activeTab === "prescription"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Prescription & Advice
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2 px-2 text-sm font-medium transition-all ${
            activeTab === "history"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Medical History
        </button>
      </div>

      {/* Tab Content - 2 Column Layout for Prescription */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "prescription" ? (
            <motion.div
              key="prescription"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* LEFT COLUMN: Diagnosis, Lab, Lifestyle, Notes */}
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Diagnosis */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="input-glass text-sm"
                    placeholder="Enter diagnosis..."
                  />
                </div>

                {/* Lab Investigations */}
                <LabOrders
                  patientId={patient.id}
                  tests={labTests}
                  onTestsChange={setLabTests}
                />

                {/* Lifestyle & Advice */}
                <LifestyleAdvice
                  advice={lifestyleAdvice}
                  onAdviceChange={setLifestyleAdvice}
                />

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Additional Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-glass text-sm h-20 resize-none"
                    placeholder="Type custom advice here..."
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: Medications */}
              <div className="overflow-y-auto pr-2">
                <PrescriptionBuilder
                  patientId={patient.id}
                  items={prescriptionItems}
                  onItemsChange={setPrescriptionItems}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto pr-2 space-y-4"
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

      {/* Footer Actions - Compact */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Auto-saved <span className="text-indigo-600">2s ago</span>
        </p>

        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleFinishConsultation}
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 text-sm px-4 py-2"
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
    </div>
  );
}
