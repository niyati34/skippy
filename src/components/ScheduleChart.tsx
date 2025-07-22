import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, X, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  date: string;
  type: 'assignment' | 'study' | 'exam' | 'note';
}

interface ScheduleChartProps {
  scheduleItems?: any[];
}

const ScheduleChart = ({ scheduleItems: externalItems = [] }: ScheduleChartProps) => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([
    { id: '1', title: 'Math Assignment', time: '14:00', date: '2024-07-21', type: 'assignment' },
    { id: '2', title: 'Science Review', time: '16:00', date: '2024-07-21', type: 'study' },
    { id: '3', title: 'History Essay', time: '10:00', date: '2024-07-22', type: 'assignment' },
  ]);
  const [newItem, setNewItem] = useState({ title: '', time: '', date: '', type: 'study' as const });
  const { toast } = useToast();

  useEffect(() => {
    if (externalItems.length > 0) {
      const newItems = externalItems.map((item, index) => ({
        id: (Date.now() + index).toString(),
        title: item.title || 'New Task',
        time: item.time || '12:00',
        date: item.dueDate || new Date().toISOString().split('T')[0],
        type: (item.category as any) || 'study'
      }));
      setScheduleItems(prev => [...prev, ...newItems]);
    }
  }, [externalItems]);

  const addScheduleItem = () => {
    if (newItem.title && newItem.time && newItem.date) {
      const item: ScheduleItem = {
        id: Date.now().toString(),
        ...newItem
      };
      setScheduleItems([...scheduleItems, item]);
      setNewItem({ title: '', time: '', date: '', type: 'study' });
      toast({
        title: "Added to schedule! 📅",
        description: `"${item.title}" scheduled for ${item.date} at ${item.time}`
      });
    }
  };

  const removeItem = (id: string) => {
    setScheduleItems(scheduleItems.filter(item => item.id !== id));
    toast({
      title: "Removed from schedule",
      description: "Item deleted successfully"
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment': return '📝';
      case 'study': return '📚';
      case 'exam': return '🎯';
      case 'note': return '📋';
      default: return '📚';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assignment': return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'study': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'exam': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'note': return 'bg-green-500/20 text-green-700 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    }
  };

  const sortedItems = [...scheduleItems].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <Card className="cyber-glow animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Smart Schedule Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new item */}
        <div className="p-4 rounded-lg bg-secondary/20 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Input
              placeholder="Task title..."
              value={newItem.title}
              onChange={(e) => setNewItem({...newItem, title: e.target.value})}
            />
            <Input
              type="date"
              value={newItem.date}
              onChange={(e) => setNewItem({...newItem, date: e.target.value})}
            />
            <Input
              type="time"
              value={newItem.time}
              onChange={(e) => setNewItem({...newItem, time: e.target.value})}
            />
            <select 
              className="px-3 py-2 rounded-md border border-input bg-background"
              value={newItem.type}
              onChange={(e) => setNewItem({...newItem, type: e.target.value as any})}
            >
              <option value="study">Study</option>
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
              <option value="note">Note</option>
            </select>
          </div>
          <Button onClick={addScheduleItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add to Schedule
          </Button>
        </div>

        {/* Schedule items */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No items scheduled yet. Add your first task above!</p>
            </div>
          ) : (
            sortedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getTypeIcon(item.type)}</span>
                  <div>
                    <h4 className="font-medium">{item.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                      <Clock className="w-3 h-3 ml-2" />
                      {item.time}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(item.type)}>
                    {item.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleChart;