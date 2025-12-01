import { Clock, User, Activity } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface PatientQueueProps {
  queue: any[];
  selectedPatient: any;
  onSelectPatient: (patient: any) => void;
}

export default function PatientQueue({
  queue,
  selectedPatient,
  onSelectPatient,
}: PatientQueueProps) {
  return (
    <div className="glass-card p-6 h-[calc(100vh-240px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Patient Queue</h2>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
          {queue.length} Waiting
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {queue.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No patients in queue</p>
          </div>
        ) : (
          queue.map((patient) => (
            <button
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                selectedPatient?.id === patient.id
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105"
                  : "bg-white/60 hover:bg-white/80 border border-white/40"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-bold ${
                        selectedPatient?.id === patient.id
                          ? "text-white"
                          : "text-gray-800"
                      }`}
                    >
                      #{patient.token}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedPatient?.id === patient.id
                          ? "bg-white/20 text-white"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {patient.consultationType}
                    </span>
                  </div>
                  <p
                    className={`font-semibold mt-1 ${
                      selectedPatient?.id === patient.id
                        ? "text-white"
                        : "text-gray-800"
                    }`}
                  >
                    {patient.name}
                  </p>
                </div>

                {patient.vitals && (
                  <Activity
                    className={`w-5 h-5 ${
                      selectedPatient?.id === patient.id
                        ? "text-white"
                        : "text-green-600"
                    }`}
                  />
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span
                  className={`flex items-center gap-1 ${
                    selectedPatient?.id === patient.id
                      ? "text-white/90"
                      : "text-gray-600"
                  }`}
                >
                  <User className="w-4 h-4" />
                  {patient.gender}, {patient.age}Y
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    selectedPatient?.id === patient.id
                      ? "text-white/90"
                      : "text-gray-600"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {formatTime(patient.registeredAt)}
                </span>
              </div>

              {patient.vitals && (
                <div
                  className={`mt-3 pt-3 border-t ${
                    selectedPatient?.id === patient.id
                      ? "border-white/20"
                      : "border-gray-200"
                  } text-xs grid grid-cols-3 gap-2`}
                >
                  <div>
                    <span
                      className={`block ${
                        selectedPatient?.id === patient.id
                          ? "text-white/70"
                          : "text-gray-500"
                      }`}
                    >
                      BP
                    </span>
                    <span
                      className={`font-medium ${
                        selectedPatient?.id === patient.id
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {patient.vitals.bloodPressure}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`block ${
                        selectedPatient?.id === patient.id
                          ? "text-white/70"
                          : "text-gray-500"
                      }`}
                    >
                      Temp
                    </span>
                    <span
                      className={`font-medium ${
                        selectedPatient?.id === patient.id
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {patient.vitals.temperature}°F
                    </span>
                  </div>
                  <div>
                    <span
                      className={`block ${
                        selectedPatient?.id === patient.id
                          ? "text-white/70"
                          : "text-gray-500"
                      }`}
                    >
                      Wt
                    </span>
                    <span
                      className={`font-medium ${
                        selectedPatient?.id === patient.id
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {patient.vitals.weight}kg
                    </span>
                  </div>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
