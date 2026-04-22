'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { cn, PILLAR_CONFIG } from '@/lib/utils';
import { useStore } from '@/store';
import { useApi } from '@/hooks/useApi';
import type { Pillar } from '@/lib/types';

const PILARS: Pillar[] = ['BUILD', 'SHOW', 'EARN', 'SYSTEMIZE'];

export default function TasksPage() {
  const { user, pillarGoals, addToast } = useStore();
  const { generateTasks, getTodayTasks, loading } = useApi();
  const [tasks, setTasks] = useState<{ id: string; pillar: string; label: string; completed: boolean }[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<Pillar>('BUILD');

  const handleGenerateTasks = async () => {
    if (!user) return;
    
    const generated = await generateTasks(
      user.id, 
      pillarGoals as unknown as Record<string, string> || { BUILD: '', SHOW: '', EARN: '', SYSTEMIZE: '' }, 
      user.phase
    );
    
    if (generated.length > 0) {
      setTasks(generated);
      addToast({ type: 'success', title: 'Tasks Generated', message: 'AI has created your tasks for today' });
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    
    setTasks([...tasks, {
      id: `${selectedPillar}_${Date.now()}`,
      pillar: selectedPillar,
      label: newTask.trim(),
      completed: false,
    }]);
    setNewTask('');
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  if (!user) return null;

  const groupedTasks = PILARS.reduce((acc, pillar) => {
    acc[pillar] = tasks.filter(t => t.pillar === pillar);
    return acc;
  }, {} as Record<string, typeof tasks>);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Tasks</h1>
          <button
            onClick={handleGenerateTasks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-zinc-950 text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Generate
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Add Task */}
        <div className="flex gap-2">
          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value as Pillar)}
            className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm focus:outline-none focus:border-amber-500/50"
          >
            {PILARS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a task..."
            className="flex-1 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={addTask}
            disabled={!newTask.trim()}
            className="p-3 rounded-xl bg-amber-500 text-zinc-950 disabled:opacity-50 hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Tasks by Pillar */}
        {PILARS.map((pillar) => {
          const pillarTasks = groupedTasks[pillar];
          const config = PILLAR_CONFIG[pillar];
          const completedCount = pillarTasks.filter(t => t.completed).length;
          
          return (
            <motion.div
              key={pillar}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'p-4 rounded-2xl border',
                config.bg,
                config.border
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold tracking-[0.2em] uppercase', config.color)}>
                    {pillar}
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {completedCount}/{pillarTasks.length}
                </span>
              </div>
              
              <div className="space-y-2">
                {pillarTasks.length === 0 ? (
                  <p className="text-sm text-zinc-600 py-2">
                    No tasks yet. Generate AI tasks or add manually.
                  </p>
                ) : (
                  pillarTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 group"
                    >
                      <button onClick={() => toggleTask(task.id)}>
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />
                        )}
                      </button>
                      <span className={cn(
                        'flex-1 text-sm',
                        task.completed && 'line-through text-zinc-600'
                      )}>
                        {task.label}
                      </span>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </main>
    </div>
  );
}