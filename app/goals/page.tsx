'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Send, 
  Sparkles, 
  Bot,
  User,
  Loader2,
  Plus,
  Trash2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

interface Goal {
  id: string;
  title: string;
  category: 'SPIRITUAL' | 'PHYSICAL' | 'FINANCIAL' | 'CAREER' | 'PERSONAL';
  timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  target: string;
  status: 'active' | 'completed' | 'paused';
  tasks: { id: string; label: string; completed: boolean }[];
  createdAt: string;
}

const CATEGORIES = [
  { value: 'SPIRITUAL', label: 'Spiritual', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { value: 'PHYSICAL', label: 'Physical', color: 'text-green-400', bg: 'bg-green-500/10' },
  { value: 'FINANCIAL', label: 'Financial', color: 'text-green-500', bg: 'bg-green-500/10' },
  { value: 'CAREER', label: 'Career', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { value: 'PERSONAL', label: 'Personal', color: 'text-purple-400', bg: 'bg-purple-500/10' },
] as const;

export default function GoalsPage() {
  const { user, addToast } = useStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateGoalsFromChat = async (userInput: string) => {
    setLoading(true);
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userInput }]);
    setInput('');
    
    // Simulate AI processing - in production this calls backend
    const aiResponse = `I understand your goal: "${userInput}"

Let me break this down and create a structured plan for you:

🎯 **Goal Identified:** ${userInput}

I'll create:
- Daily tasks aligned with this goal
- Weekly milestones  
- Monthly targets

This will now appear in your Daily Execution Panel.`;

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      
      // Extract goal category and create task
      const newGoal: Goal = {
        id: `goal_${Date.now()}`,
        title: userInput,
        category: 'PERSONAL',
        timeframe: 'QUARTERLY',
        target: userInput,
        status: 'active',
        tasks: [
          { id: `task_${Date.now()}_1`, label: 'Take first action step', completed: false },
          { id: `task_${Date.now()}_2`, label: 'Track progress daily', completed: false },
          { id: `task_${Date.now()}_3`, label: 'Review weekly', completed: false },
        ],
        createdAt: new Date().toISOString(),
      };
      
      setGoals(prev => [...prev, newGoal]);
      addToast({ type: 'success', title: 'Goal Created', message: 'Added to your goals list' });
      setLoading(false);
    }, 1500);
  };

  const addManualGoal = () => {
    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      title: 'New Goal',
      category: 'PERSONAL',
      timeframe: 'MONTHLY',
      target: '',
      status: 'active',
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    setGoals(prev => [...prev, newGoal]);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const toggleTask = (goalId: string, taskId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          tasks: g.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
      }
      return g;
    }));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-black tracking-tighter uppercase italic">Goals</h1>
          </div>
          <button
            onClick={() => setChatMode(!chatMode)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors',
              chatMode 
                ? 'bg-amber-500 text-zinc-950' 
                : 'bg-zinc-900 border border-zinc-800'
            )}
          >
            <Sparkles className="w-4 h-4" />
            AI Planner
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* AI Chat Mode */}
        <AnimatePresence>
          {chatMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/20 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-bold">AI Goal Planner</span>
                </div>
                
                <p className="text-sm text-zinc-400">
                  Tell me your goals, dreams, plans — anything you want to achieve. 
                  I'll understand, structure it, and create a daily system for you.
                </p>

                {/* Messages */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {messages.length === 0 && (
                    <div className="text-center py-4">
                      <Bot className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">
                        Start by telling me what you want to achieve...
                      </p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={cn(
                      'flex gap-2',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      <div className={cn(
                        'max-w-[85%] p-3 rounded-xl text-sm',
                        msg.role === 'user'
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-100'
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-2">
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    </div>
                  )}
                  <div ref={messagesEnd} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && generateGoalsFromChat(input)}
                    placeholder="I want to build..."
                    className="flex-1 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    onClick={() => generateGoalsFromChat(input)}
                    disabled={!input.trim() || loading}
                    className="p-3 rounded-xl bg-amber-500 text-zinc-950 disabled:opacity-50 hover:bg-amber-400"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goals List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-500">
              Your Goals ({goals.length})
            </h2>
            <button
              onClick={addManualGoal}
              className="flex items-center gap-1 text-xs font-bold text-amber-500"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          </div>

          {goals.length === 0 && !chatMode ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 mb-4">No goals yet</p>
              <button
                onClick={() => setChatMode(true)}
                className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-sm font-bold hover:bg-amber-400"
              >
                Tell AI Your Goals
              </button>
            </div>
          ) : (
            goals.map(goal => {
              const cat = CATEGORIES.find(c => c.value === goal.category);
              const completedTasks = goal.tasks.filter(t => t.completed).length;
              
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={goal.title}
                        onChange={(e) => updateGoal(goal.id, { title: e.target.value })}
                        className="bg-transparent font-bold focus:outline-none w-full"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('text-[10px] font-bold', cat?.color)}>
                          {cat?.label}
                        </span>
                        <span className="text-[10px] text-zinc-600">•</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {goal.timeframe}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-zinc-600 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Target */}
                  <input
                    type="text"
                    value={goal.target}
                    onChange={(e) => updateGoal(goal.id, { target: e.target.value })}
                    placeholder="What do you want to achieve?"
                    className="w-full text-sm text-zinc-400 bg-transparent focus:outline-none mb-3"
                  />

                  {/* Tasks */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
                      <span>TASKS</span>
                      <span>{completedTasks}/{goal.tasks.length}</span>
                    </div>
                    {goal.tasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 group"
                      >
                        <button
                          onClick={() => toggleTask(goal.id, task.id)}
                          className={cn(
                            'w-4 h-4 rounded-full border transition-colors',
                            task.completed 
                              ? 'bg-amber-500 border-amber-500' 
                              : 'border-zinc-700 group-hover:border-zinc-500'
                          )}
                        />
                        <span className={cn(
                          'text-sm flex-1',
                          task.completed && 'line-through text-zinc-600'
                        )}>
                          {task.label}
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newTask = {
                          id: `task_${Date.now()}`,
                          label: 'New task',
                          completed: false,
                        };
                        updateGoal(goal.id, { tasks: [...goal.tasks, newTask] });
                      }}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-500 mt-2"
                    >
                      <Plus className="w-3 h-3" />
                      Add task
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Example Prompts */}
        {!chatMode && goals.length > 0 && (
          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800">
            <p className="text-xs text-zinc-500 mb-3">💡 Try telling AI:</p>
            <div className="space-y-2 text-sm">
              <button 
                onClick={() => { setInput('I want to make $100k this year'); setChatMode(true); }}
                className="block w-full text-left text-zinc-400 hover:text-amber-500"
              >
                "I want to make $100k this year"
              </button>
              <button 
                onClick={() => { setInput('I want to get an international tech job'); setChatMode(true); }}
                className="block w-full text-left text-zinc-400 hover:text-amber-500"
              >
                "I want to get an international tech job"
              </button>
              <button 
                onClick={() => { setInput('I want to build a SaaS that makes $10k/mo'); setChatMode(true); }}
                className="block w-full text-left text-zinc-400 hover:text-amber-500"
              >
                "I want to build a SaaS that makes $10k/mo"
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}