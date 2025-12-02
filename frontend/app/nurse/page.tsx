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
  Activity,
  Heart,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useQueueUpdates } from "@/hooks/useQueueUpdates";
import VitalsEntryForm from "@/components/VitalsEntryForm";

export default function NurseConsole() {
  const router = useRouter();
  const { user, isAuthenticated, logout, initAuth } = useAuthStore();
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // WebSocket connection for real-time queue updates
  const { isConnected } = useQueueUpdates({
    onQueueUpdate: (event) => {
      console.log("🔔 Nurse Console: Real-time queue update:", event);
      fetchQueue();
    },
    autoConnect: isAuthenticated,
  });

  useEffect(() => {
    initAuth();
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Only nurses can access this page
    if (user?.role !== "NURSE") {
      toast.error("Access denied: Nurses only");
      router.push("/login");
      return;
    }

    fetchQueue();
  }, [isAuthenticated, user, router, initAuth]);

  const fetchQueue = async () => {
    try {
      const data = await api.getVitalsQueue();
      setQueue(data);
    } catch (error) {
      console.error("Error fetching vitals queue:", error);
      toast.error("Failed to load patient queue");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleVitalsComplete = () => {
    setSelectedPatient(null);
    fetchQueue();
    toast.success("Vitals recorded successfully!");
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
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Nurse Console
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome, {user?.name || "Nurse"} • Vitals Entry Station
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

          {/* Queue Stats */}
          <div className="mt-6 bg-white/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-indigo-600" />
                <p className="text-sm text-gray-600">
                  Patients Waiting for Vitals:
                </p>
              </div>
              <p className="text-3xl font-bold text-indigo-600">
                {queue.length}
              </p>
            </div>
          </div>
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
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Patient Queue
              </h2>

              {queue.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No patients waiting</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {queue.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                        selectedPatient?.id === patient.id
                          ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg scale-105"
                          : "bg-white/60 hover:bg-white/80 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold">
                          #{patient.token}
                        </span>
                        <span className="text-xs opacity-75">
                          {new Date(patient.registeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-semibold">{patient.name}</p>
                      <p className="text-sm opacity-75">
                        Age: {patient.age} • {patient.gender}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Vitals Entry Form - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {selectedPatient ? (
              <VitalsEntryForm
                patient={selectedPatient}
                onComplete={handleVitalsComplete}
                onCancel={() => setSelectedPatient(null)}
              />
            ) : (
              <div className="glass-card p-12 text-center">
                <Thermometer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Patient Selected
                </h3>
                <p className="text-gray-500">
                  Select a patient from the queue to record vitals
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
