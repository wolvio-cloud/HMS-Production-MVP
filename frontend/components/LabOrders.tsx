"use client";

import { useState, useEffect } from "react";
import { Plus, FlaskConical, X } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface LabOrdersProps {
  patientId: string;
  tests: any[];
  onTestsChange: (tests: any[]) => void;
}

export default function LabOrders({
  patientId,
  tests,
  onTestsChange,
}: LabOrdersProps) {
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestMenu, setShowTestMenu] = useState(false);

  useEffect(() => {
    fetchLabTests();
  }, []);

  const fetchLabTests = async () => {
    try {
      const data = await api.getAllLabTests();
      setAvailableTests(data);
    } catch (error) {
      console.error("Error fetching lab tests:", error);
      toast.error("Failed to load lab tests");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = (test: any) => {
    if (tests.some((t) => t.id === test.id)) {
      toast.error("Test already added");
      return;
    }

    onTestsChange([...tests, test]);
    setShowTestMenu(false);
    toast.success(`${test.name} added`);
  };

  const handleRemoveTest = (testId: string) => {
    const newTests = tests.filter((t) => t.id !== testId);
    onTestsChange(newTests);
  };

  // Common lab tests for quick access
  const commonTests = ["CBC", "Blood Sugar", "Lipid Profile", "Thyroid", "LFT", "KFT"];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 uppercase mb-3">
        2. Lab Investigations
      </h3>

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableTests
          .filter((test) =>
            commonTests.some((common) => test.name.includes(common))
          )
          .slice(0, 3)
          .map((test) => (
            <button
              key={test.id}
              onClick={() => handleAddTest(test)}
              className="btn-chip flex items-center gap-2"
            >
              <Plus className="w-3 h-3" />
              {test.name}
            </button>
          ))}

        <button
          onClick={() => setShowTestMenu(!showTestMenu)}
          className="btn-chip flex items-center gap-2 border-dashed"
        >
          <Plus className="w-3 h-3" />
          More Tests
        </button>
      </div>

      {/* Test Menu Dropdown */}
      <AnimatePresence>
        {showTestMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 glass-card p-3 max-h-48 overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-2">
              {availableTests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => handleAddTest(test)}
                  className="text-left p-2 hover:bg-white/60 rounded-lg transition-all text-sm"
                >
                  <p className="font-medium text-gray-800">{test.name}</p>
                  <p className="text-xs text-gray-600">₹{test.price}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ordered Tests */}
      {tests.length > 0 && (
        <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-200/50">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-medium text-indigo-700">
              Ordered: {tests.map((t) => t.name).join(", ")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tests.map((test) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white/60 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
              >
                <span className="font-medium text-gray-800">{test.name}</span>
                <button
                  onClick={() => handleRemoveTest(test.id)}
                  className="text-red-600 hover:bg-red-100 p-0.5 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {tests.length === 0 && (
        <p className="text-center text-gray-500 py-4 text-sm">
          No lab tests ordered
        </p>
      )}
    </div>
  );
}
