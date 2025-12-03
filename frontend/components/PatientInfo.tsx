import { User, Activity, Heart, Weight, Thermometer } from "lucide-react";

interface PatientInfoProps {
  patient: any;
}

export default function PatientInfo({ patient }: PatientInfoProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{patient.name}</h2>
          <p className="text-gray-600">
            {patient.gender}, {patient.age} Years
          </p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium">
          Token #{patient.token}
        </span>
      </div>

      {/* Vitals */}
      {patient.vitals && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 uppercase mb-3">
            Vitals (Just Now)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="vitals-item">
              <Heart className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600">BP</p>
              <p className="text-lg font-bold text-indigo-600">
                {patient.vitals.bloodPressure}
              </p>
            </div>
            <div className="vitals-item">
              <Thermometer className="w-5 h-5 text-orange-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Temp</p>
              <p className="text-lg font-bold text-red-600">
                {patient.vitals.temperature}°F
              </p>
            </div>
            <div className="vitals-item">
              <Weight className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Weight</p>
              <p className="text-lg font-bold text-gray-800">
                {patient.vitals.weight} kg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chief Complaint */}
      {patient.chiefComplaint && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600 uppercase mb-2">
            Chief Complaint
          </h3>
          <p className="text-gray-800 italic">"{patient.chiefComplaint}"</p>
        </div>
      )}
    </div>
  );
}
