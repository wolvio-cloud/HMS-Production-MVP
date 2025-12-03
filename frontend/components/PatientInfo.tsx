import { User, Activity, Heart, Weight, Thermometer } from "lucide-react";

interface PatientInfoProps {
  patient: any;
}

export default function PatientInfo({ patient }: PatientInfoProps) {
  return (
    <div className="mb-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{patient.name}</h2>
          <p className="text-sm text-gray-600">
            {patient.gender}, {patient.age} Years • Mobile: {patient.mobile}
          </p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium">
          #{patient.token}
        </span>
      </div>

      {/* Vitals - Compact Inline */}
      {patient.vitals && (
        <div className="flex items-center gap-4 text-xs bg-white/50 rounded-lg p-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-red-500" />
            <span className="text-gray-600">BP:</span>
            <span className="font-semibold text-indigo-600">{patient.vitals.bloodPressure}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-gray-600">Temp:</span>
            <span className="font-semibold text-red-600">{patient.vitals.temperature}°F</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-gray-600">Pulse:</span>
            <span className="font-semibold text-gray-800">{patient.vitals.pulse} bpm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Weight className="w-3.5 h-3.5 text-green-500" />
            <span className="text-gray-600">Wt:</span>
            <span className="font-semibold text-gray-800">{patient.vitals.weight} kg</span>
          </div>
        </div>
      )}

      {/* Chief Complaint - Compact */}
      {patient.chiefComplaint && (
        <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg">
          <p className="text-xs text-gray-600 font-medium mb-0.5">Chief Complaint:</p>
          <p className="text-sm text-gray-800 italic">"{patient.chiefComplaint}"</p>
        </div>
      )}
    </div>
  );
}
