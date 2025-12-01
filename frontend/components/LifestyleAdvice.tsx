"use client";

import { Droplet, Bed, X as XIcon, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LifestyleAdviceProps {
  advice: string[];
  onAdviceChange: (advice: string[]) => void;
}

const predefinedAdvice = [
  { icon: Droplet, text: "Drink 3L Water", color: "blue" },
  { icon: Bed, text: "Complete Rest", color: "purple" },
  { icon: XIcon, text: "Avoid Spicy Food", color: "red" },
  { icon: TrendingUp, text: "Walk 30 Mins", color: "green" },
  { icon: Droplet, text: "Avoid Alcohol", color: "amber" },
  { icon: Bed, text: "Sleep 8 Hours", color: "indigo" },
];

export default function LifestyleAdvice({
  advice,
  onAdviceChange,
}: LifestyleAdviceProps) {
  const toggleAdvice = (text: string) => {
    if (advice.includes(text)) {
      onAdviceChange(advice.filter((a) => a !== text));
    } else {
      onAdviceChange([...advice, text]);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 uppercase mb-3">
        3. Lifestyle & Advice
      </h3>

      <div className="flex flex-wrap gap-2">
        {predefinedAdvice.map((item) => {
          const isSelected = advice.includes(item.text);
          const Icon = item.icon;

          return (
            <motion.button
              key={item.text}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleAdvice(item.text)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? `bg-${item.color}-100 text-${item.color}-700 border-2 border-${item.color}-400 shadow-md`
                  : "bg-white/60 text-gray-700 border border-white/40 hover:bg-white/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.text}
            </motion.button>
          );
        })}
      </div>

      {advice.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-green-50/60 rounded-xl border border-green-200/50"
        >
          <p className="text-sm font-medium text-green-700 mb-2">
            Selected Advice:
          </p>
          <ul className="space-y-1">
            {advice.map((item) => (
              <li key={item} className="text-sm text-green-800">
                ✓ {item}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
