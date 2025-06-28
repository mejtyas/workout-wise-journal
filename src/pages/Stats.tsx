
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, TrendingUp, Weight, Zap, Clock } from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface StatsData {
  date: string;
  weight: number | null;
  calories: number | null;
  workoutDuration: number;
  totalVolume: number;
}

const chartConfig = {
  weight: {
    label: "Weight (kg)",
    color: "hsl(var(--chart-1))",
  },
  calories: {
    label: "Calories",
    color: "hsl(var(--chart-2))",
  },
  duration: {
    label: "Duration (min)",
    color: "hsl(var(--chart-3))",
  },
  volume: {
    label: "Volume (kg)",
    color: "hsl(var(--chart-4))",
  },
};

export default function Stats() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState(30); // days

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['stats', dateRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);
      
      // Get daily logs
      const { data: dailyLogs, error: dailyError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date');

      if (dailyError) throw dailyError;

      // Get workout sessions with set records
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          set_records (
            reps,
            weight
          )
        `)
        .eq('user_id', user?.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date');

      if (sessionsError) throw sessionsError;

      // Create data for each day
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      const statsData: StatsData[] = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dailyLog = dailyLogs?.find(log => log.date === dateStr);
        const daySession = sessions?.find(session => session.date === dateStr);
        
        let totalVolume = 0;
        if (daySession?.set_records) {
          totalVolume = daySession.set_records.reduce((sum, record) => 
            sum + (record.reps * record.weight), 0
          );
        }

        return {
          date: dateStr,
          weight: dailyLog?.weight || null,
          calories: dailyLog?.calories || null,
          workoutDuration: daySession?.duration_minutes || 0,
          totalVolume,
        };
      });

      return statsData;
    },
    enabled: !!user?.id,
  });

  const { data: overallStats } = useQuery({
    queryKey: ['overall-stats'],
    queryFn: async () => {
      // Get total workouts
      const { count: totalWorkouts, error: workoutsError } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (workoutsError) throw workoutsError;

      // Get total exercises created
      const { count: totalExercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (exercisesError) throw exercisesError;

      // Get average workout duration
      const { data: avgDuration, error: avgError } = await supabase
        .from('workout_sessions')
        .select('duration_minutes')
        .eq('user_id', user?.id)
        .not('duration_minutes', 'is', null);

      if (avgError) throw avgError;

      const averageDuration = avgDuration?.length > 0 
        ? avgDuration.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / avgDuration.length
        : 0;

      return {
        totalWorkouts: totalWorkouts || 0,
        totalExercises: totalExercises || 0,
        averageDuration: Math.round(averageDuration),
      };
    },
    enabled: !!user?.id,
  });

  const weightData = statsData?.filter(d => d.weight !== null) || [];
  const volumeData = statsData?.filter(d => d.totalVolume > 0) || [];
  const caloriesData = statsData?.filter(d => d.calories !== null) || [];
  const durationData = statsData?.filter(d => d.workoutDuration > 0) || [];

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
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
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
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalWorkouts || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercises Created</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalExercises || 0}</div>
            <p className="text-xs text-muted-foreground">Custom exercises</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.averageDuration || 0}</div>
            <p className="text-xs text-muted-foreground">minutes per workout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{durationData.length}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weight Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Progress</CardTitle>
            <CardDescription>Your weight tracking over time</CardDescription>
          </CardHeader>
          <CardContent>
            {weightData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--color-weight)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-weight)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No weight data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workout Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Volume</CardTitle>
            <CardDescription>Total weight lifted per session</CardDescription>
          </CardHeader>
          <CardContent>
            {volumeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="totalVolume"
                      fill="var(--color-volume)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No workout data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calories Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Calories Tracking</CardTitle>
            <CardDescription>Daily calorie intake over time</CardDescription>
          </CardHeader>
          <CardContent>
            {caloriesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={caloriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="var(--color-calories)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-calories)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No calorie data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workout Duration */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Duration</CardTitle>
            <CardDescription>Time spent per workout session</CardDescription>
          </CardHeader>
          <CardContent>
            {durationData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={durationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="workoutDuration"
                      fill="var(--color-duration)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No duration data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
