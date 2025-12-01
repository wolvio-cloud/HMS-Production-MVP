"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { getStockIndicator } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface PrescriptionBuilderProps {
  patientId: string;
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function PrescriptionBuilder({
  patientId,
  items,
  onItemsChange,
}: PrescriptionBuilderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Search medicines with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchMedicines(searchQuery, 10);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error("Error searching medicines:", error);
        toast.error("Failed to search medicines");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleAddMedicine = (medicine: any) => {
    // Check if already added
    if (items.some((item) => item.medicineId === medicine.medicineId)) {
      toast.error("Medicine already added");
      return;
    }

    // Add with default values
    const newItem = {
      medicineId: medicine.medicineId,
      medicineName: medicine.medicineName,
      dosage: "1 tablet",
      frequency: "3 times daily",
      duration: "5 days",
      instructions: "After food",
      stockStatus: medicine.status,
      stockIndicator: medicine.indicator,
    };

    onItemsChange([...items, newItem]);
    setSearchQuery("");
    setShowResults(false);
    toast.success(`${medicine.medicineName} added`);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const handleUpdateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    onItemsChange(newItems);
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 uppercase mb-3">
        1. Add Medication
      </h3>

      {/* Search Box */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          className="input-glass pl-10"
          placeholder="Search Meds..."
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showResults && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 glass-card p-2 max-h-64 overflow-y-auto"
            >
              {searchResults.map((medicine) => {
                const stock = getStockIndicator(medicine.status);
                return (
                  <button
                    key={medicine.medicineId}
                    onClick={() => handleAddMedicine(medicine)}
                    className="w-full text-left p-3 hover:bg-white/60 rounded-lg transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {medicine.medicineName}
                      </p>
                      <p className="text-xs text-gray-600">
                        Stock: {medicine.currentStock} units
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl ${stock.emoji}`}>
                        {medicine.indicator}
                      </span>
                      <Plus className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Added Medicines */}
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item, index) => {
            const stock = getStockIndicator(item.stockStatus);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-xl border-2 ${
                  item.stockStatus === "OUT_OF_STOCK"
                    ? "bg-red-50 border-red-300"
                    : "bg-white/60 border-white/40"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.stockIndicator}</span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {item.medicineName}
                      </p>
                      <p className={`text-xs ${stock.color}`}>{stock.label}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      value={item.dosage}
                      onChange={(e) =>
                        handleUpdateItem(index, "dosage", e.target.value)
                      }
                      className="input-glass text-sm"
                      placeholder="1 tablet"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Frequency
                    </label>
                    <input
                      type="text"
                      value={item.frequency}
                      onChange={(e) =>
                        handleUpdateItem(index, "frequency", e.target.value)
                      }
                      className="input-glass text-sm"
                      placeholder="3 times daily"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={item.duration}
                      onChange={(e) =>
                        handleUpdateItem(index, "duration", e.target.value)
                      }
                      className="input-glass text-sm"
                      placeholder="5 days"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Instructions
                    </label>
                    <input
                      type="text"
                      value={item.instructions}
                      onChange={(e) =>
                        handleUpdateItem(index, "instructions", e.target.value)
                      }
                      className="input-glass text-sm"
                      placeholder="After food"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {items.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No medications added yet
          </p>
        )}
      </div>
    </div>
  );
}
