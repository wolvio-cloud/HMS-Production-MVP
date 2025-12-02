"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Heart,
  Activity,
  Thermometer,
  Wind,
  Ruler,
  Weight,
  FileText,
  AlertTriangle,
  Save,
  SendHorizonal,
  X,
} from "lucide-react";

interface VitalsEntryFormProps {
  patient: any;
  onComplete: () => void;
  onCancel: () => void;
}

export default function VitalsEntryForm({
  patient,
  onComplete,
  onCancel,
}: VitalsEntryFormProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bp: "",
    pulse: "",
    temperature: "",
    spo2: "",
    height: "",
    weight: "",
    chiefComplaint: "",
    allergies: "",
  });

  const [bmi, setBmi] = useState<number | null>(null);

  // Calculate BMI whenever height or weight changes
  useEffect(() => {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);

    if (height > 0 && weight > 0) {
      const heightM = height / 100; // Convert cm to meters
      const calculatedBmi = weight / (heightM * heightM);
      setBmi(parseFloat(calculatedBmi.toFixed(2)));
    } else {
      setBmi(null);
    }
  }, [formData.height, formData.weight]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = (): boolean => {
    if (!formData.bp.trim()) {
      toast.error("Blood Pressure is required");
      return false;
    }

    const pulse = parseInt(formData.pulse);
    if (!pulse || pulse < 40 || pulse > 200) {
      toast.error("Pulse must be between 40-200 bpm");
      return false;
    }

    const temp = parseFloat(formData.temperature);
    if (!temp || temp < 90 || temp > 110) {
      toast.error("Temperature must be between 90-110°F");
      return false;
    }

    const spo2 = parseInt(formData.spo2);
    if (!spo2 || spo2 < 70 || spo2 > 100) {
      toast.error("SpO2 must be between 70-100%");
      return false;
    }

    const height = parseFloat(formData.height);
    if (!height || height < 50 || height > 250) {
      toast.error("Height must be between 50-250 cm");
      return false;
    }

    const weight = parseFloat(formData.weight);
    if (!weight || weight < 10 || weight > 300) {
      toast.error("Weight must be between 10-300 kg");
      return false;
    }

    if (!formData.chiefComplaint.trim()) {
      toast.error("Chief Complaint is required");
      return false;
    }

    return true;
  };

  const handleSaveVitals = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await api.createOrUpdateVitals({
        patientId: patient.id,
        bp: formData.bp,
        pulse: parseInt(formData.pulse),
        temperature: parseFloat(formData.temperature),
        spo2: parseInt(formData.spo2),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        chiefComplaint: formData.chiefComplaint,
        allergies: formData.allergies || undefined,
        recordedById: user?.id || "",
      });

      toast.success("Vitals saved successfully!");
    } catch (error: any) {
      console.error("Error saving vitals:", error);
      toast.error(error.response?.data?.message || "Failed to save vitals");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // First save vitals
      await api.createOrUpdateVitals({
        patientId: patient.id,
        bp: formData.bp,
        pulse: parseInt(formData.pulse),
        temperature: parseFloat(formData.temperature),
        spo2: parseInt(formData.spo2),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        chiefComplaint: formData.chiefComplaint,
        allergies: formData.allergies || undefined,
        recordedById: user?.id || "",
      });

      // Then complete vitals workflow (move to doctor queue)
      await api.completeVitals(patient.id);

      toast.success(
        `Patient ${patient.name} sent to doctor queue!`
      );
      onComplete();
    } catch (error: any) {
      console.error("Error submitting vitals:", error);
      toast.error(error.response?.data?.message || "Failed to submit vitals");
    } finally {
      setLoading(false);
    }
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-600" };
    if (bmi < 25) return { label: "Normal", color: "text-green-600" };
    if (bmi < 30) return { label: "Overweight", color: "text-yellow-600" };
    return { label: "Obese", color: "text-red-600" };
  };

  return (
    <div className="glass-card p-6">
      {/* Patient Info Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl p-4 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">#{patient.token} - {patient.name}</h3>
            <p className="text-sm opacity-90">
              Age: {patient.age} • Gender: {patient.gender} • Mobile: {patient.mobile}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Vitals Form */}
      <div className="space-y-6">
        {/* Vital Signs Section */}
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-pink-600" />
            Vital Signs
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blood Pressure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Heart className="w-4 h-4 inline mr-1" />
                Blood Pressure (mm Hg) *
              </label>
              <input
                type="text"
                name="bp"
                value={formData.bp}
                onChange={handleChange}
                placeholder="120/80"
                className="input-glass"
              />
            </div>

            {/* Pulse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                Pulse (bpm) *
              </label>
              <input
                type="number"
                name="pulse"
                value={formData.pulse}
                onChange={handleChange}
                placeholder="72"
                min="40"
                max="200"
                className="input-glass"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Thermometer className="w-4 h-4 inline mr-1" />
                Temperature (°F) *
              </label>
              <input
                type="number"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                placeholder="98.6"
                step="0.1"
                min="90"
                max="110"
                className="input-glass"
              />
            </div>

            {/* SpO2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Wind className="w-4 h-4 inline mr-1" />
                SpO2 (%) *
              </label>
              <input
                type="number"
                name="spo2"
                value={formData.spo2}
                onChange={handleChange}
                placeholder="98"
                min="70"
                max="100"
                className="input-glass"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Ruler className="w-4 h-4 inline mr-1" />
                Height (cm) *
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="170"
                step="0.1"
                min="50"
                max="250"
                className="input-glass"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Weight className="w-4 h-4 inline mr-1" />
                Weight (kg) *
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="70"
                step="0.1"
                min="10"
                max="300"
                className="input-glass"
              />
            </div>
          </div>

          {/* BMI Display */}
          {bmi && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-white/60 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Body Mass Index</p>
                  <p className="text-2xl font-bold text-gray-800">{bmi}</p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-lg font-semibold ${
                    getBMICategory(bmi).color
                  }`}
                >
                  {getBMICategory(bmi).label}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Clinical Info Section */}
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-pink-600" />
            Clinical Information
          </h4>

          <div className="space-y-4">
            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chief Complaint *
              </label>
              <textarea
                name="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={handleChange}
                placeholder="What brings the patient in today?"
                rows={3}
                className="input-glass resize-none"
              />
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-yellow-600" />
                Known Allergies (Optional)
              </label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="e.g., Penicillin, Aspirin (comma separated)"
                className="input-glass"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/40">
          <button
            onClick={handleSaveVitals}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 flex-1"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary flex items-center gap-2 flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <SendHorizonal className="w-4 h-4" />
                Submit & Send to Doctor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
