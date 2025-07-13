
import React from 'react';

interface DateRangeSelectorProps {
  dateRange: number;
  onDateRangeChange: (range: number) => void;
}

export function DateRangeSelector({ dateRange, onDateRangeChange }: DateRangeSelectorProps) {
  return (
    <div className="flex gap-2">
      {[7, 30, 90].map((days) => (
        <button
          key={days}
          onClick={() => onDateRangeChange(days)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            dateRange === days
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {days}d
        </button>
      ))}
    </div>
  );
}
