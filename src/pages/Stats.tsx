
import React, { useState } from 'react';
import { OverviewCards } from '@/components/stats/OverviewCards';
import { StatsChart } from '@/components/stats/StatsChart';
import { DateRangeSelector } from '@/components/stats/DateRangeSelector';
import { useStatsData } from '@/hooks/useStatsData';

export default function Stats() {
  const [dateRange, setDateRange] = useState(30);
  const { statsData, overallStats, isLoading } = useStatsData(dateRange);

  const weightData = statsData.filter(d => d.weight !== null);
  const volumeData = statsData.filter(d => d.totalVolume > 0);
  const caloriesData = statsData.filter(d => d.calories !== null);
  const durationData = statsData.filter(d => d.workoutDuration > 0);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Statistics</h1>
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      <OverviewCards 
        overallStats={overallStats}
        recentSessions={durationData.length}
        dateRange={dateRange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsChart
          title="Weight Progress"
          description="Your weight tracking over time"
          data={weightData}
          dataKey="weight"
          type="line"
          color="var(--color-weight)"
          emptyMessage="No weight data available"
        />

        <StatsChart
          title="Workout Volume"
          description="Total weight lifted per session"
          data={volumeData}
          dataKey="totalVolume"
          type="bar"
          color="var(--color-volume)"
          emptyMessage="No workout data available"
        />

        <StatsChart
          title="Calories Tracking"
          description="Daily calorie intake over time"
          data={caloriesData}
          dataKey="calories"
          type="line"
          color="var(--color-calories)"
          emptyMessage="No calorie data available"
        />

        <StatsChart
          title="Workout Duration"
          description="Time spent per workout session"
          data={durationData}
          dataKey="workoutDuration"
          type="bar"
          color="var(--color-duration)"
          emptyMessage="No duration data available"
        />
      </div>
    </div>
  );
}
