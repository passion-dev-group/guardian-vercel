
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DefaultHeatmapProps {
  startDate: string;
  endDate: string;
  frequency?: string;
}

interface DefaultData {
  date: string;
  default_count: number;
  color: string;
}

export const DefaultHeatmap: React.FC<DefaultHeatmapProps> = ({
  startDate,
  endDate,
  frequency,
}) => {
  const [data, setData] = useState<DefaultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_payment_defaults_by_day', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_frequency: frequency === 'all' ? null : frequency
        });

        if (error) throw error;

        // Transform and color the data
        const formattedData = (data || []).map(item => {
          // Determine color intensity based on default count
          const intensity = Math.min(item.default_count / 10, 1); // Normalize between 0 and 1
          const colorValue = Math.floor(255 - intensity * 220); // Higher intensity = darker red
          
          return {
            ...item,
            color: `rgba(234, 56, 76, ${intensity + 0.1})` // Red with variable intensity
          };
        });

        setData(formattedData);
      } catch (error) {
        console.error("Error loading default heatmap data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, frequency]);

  // Generate calendar days
  const renderCalendar = () => {
    if (loading) return <Skeleton className="h-[200px]" />;
    
    // Generate days for the calendar view
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    // Create calendar grid
    let calendarDays = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const defaultData = data.find(d => d.date === dateStr);
      
      calendarDays.push(
        <div 
          key={dateStr}
          className="relative h-10 w-10 flex items-center justify-center rounded hover:bg-muted/30 cursor-pointer"
          style={{ 
            backgroundColor: defaultData ? defaultData.color : 'transparent',
          }}
          title={defaultData ? `${defaultData.default_count} missed payments` : 'No missed payments'}
        >
          <span className={defaultData && defaultData.default_count > 5 ? 'text-white' : 'text-foreground'}>
            {day}
          </span>
          {defaultData && defaultData.default_count > 0 && (
            <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
          )}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {calendarDays}
      </div>
    );
  };
  
  const changeMonth = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };
  
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <button 
          className="rounded-md p-2 hover:bg-muted"
          onClick={() => changeMonth(-1)}
        >
          ←
        </button>
        <div>
          {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button 
          className="rounded-md p-2 hover:bg-muted"
          onClick={() => changeMonth(1)}
        >
          →
        </button>
      </div>
      
      <div className="overflow-x-auto">
        {renderCalendar()}
      </div>
      
      <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-transparent border border-gray-300 rounded"></div>
          <span>No missed payments</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-red-200 rounded"></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-red-400 rounded"></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-red-600 rounded"></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};
