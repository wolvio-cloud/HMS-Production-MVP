"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Users,
  LogOut,
  RefreshCw,
  Clock,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import PatientQueue from "@/components/PatientQueue";
import ConsultationPanel from "@/components/ConsultationPanel";
import { useQueueUpdates } from "@/hooks/useQueueUpdates";

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout, initAuth } = useAuthStore();
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // WebSocket connection for real-time queue updates
  const { isConnected } = useQueueUpdates({
    onQueueUpdate: (event) => {
      console.log("🔔 Real-time queue update:", event);
      // Auto-refresh queue and stats when any patient update occurs
      fetchQueue();
      fetchStats();

      // Show toast notification for important events
      if (event.type === "patient_added") {
        toast.success(`New patient added: Token #${event.patientToken}`);
      } else if (event.type === "stage_changed" && event.doctorId === user?.id) {
        toast.info(`Patient #${event.patientToken} moved to ${event.stage}`);
      }
    },
    doctorId: user?.id,
    autoConnect: isAuthenticated,
  });

  useEffect(() => {
    initAuth();
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchQueue();
    fetchStats();
  }, [isAuthenticated, router, initAuth]);

  const fetchQueue = async () => {
    try {
      const data = await api.getMyQueue();
      setQueue(data);
    } catch (error) {
      console.error("Error fetching queue:", error);
      toast.error("Failed to load patient queue");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.getQueueStats();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSelectPatient = async (patient: any) => {
    try {
      // Lock patient if in general queue
      if (!patient.doctorId) {
        await api.lockPatient(patient.id);
        toast.success(`Patient ${patient.name} assigned to you`);
      }

      // Fetch full patient details
      const fullPatient = await api.getPatientById(patient.id);
      setSelectedPatient(fullPatient);
    } catch (error: any) {
      console.error("Error selecting patient:", error);
      toast.error(error.response?.data?.message || "Failed to select patient");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleConsultationComplete = () => {
    setSelectedPatient(null);
    fetchQueue();
    fetchStats();
    toast.success("Consultation completed successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Doctor Console
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome, Dr. {user?.name || "Doctor"} •{" "}
                  <span className="text-indigo-600 font-medium">
                    {user?.specialty || "General"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* WebSocket Status Indicator */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  isConnected
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span className="text-xs font-medium">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-xs font-medium">Offline</span>
                  </>
                )}
              </div>

              <button
                onClick={fetchQueue}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-2 text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Waiting</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {stats.doctor || 0}
                </p>
              </div>
              <div className="bg-white/50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Lab Pending</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.lab || 0}
                </p>
              </div>
              <div className="bg-white/50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Pharmacy</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.pharmacy || 0}
                </p>
              </div>
              <div className="bg-white/50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.completedToday || 0}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Queue - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <PatientQueue
              queue={queue}
              selectedPatient={selectedPatient}
              onSelectPatient={handleSelectPatient}
            />
          </motion.div>

          {/* Consultation Panel - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {selectedPatient ? (
              <ConsultationPanel
                patient={selectedPatient}
                onComplete={handleConsultationComplete}
                onCancel={() => setSelectedPatient(null)}
              />
            ) : (
              <div className="glass-card p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Patient Selected
                </h3>
                <p className="text-gray-500">
                  Select a patient from the queue to start consultation
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
