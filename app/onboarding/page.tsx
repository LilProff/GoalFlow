'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  ArrowLeft,
  User,
  Target,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import type { CoachingStyle, UserPhase } from '@/lib/types';

const STEPS = [
  { id: 1, label: 'Identity', icon: User },
  { id: 2, label: '4 Pillars', icon: Target },
  { id: 3, label: 'Goals', icon: Target },
  { id: 4, label: 'Schedule', icon: Clock },
  { id: 5, label: 'Coach Style', icon: Sparkles },
];

const PHASES: { value: UserPhase; label: string; description: string }[] = [
  { value: 1, label: 'Phase 1: Just Starting', description: 'Building foundation, learning skills' },
  { value: 2, label: 'Phase 2: Growing', description: 'Getting clients, building audience' },
  { value: 3, label: 'Phase 3: Scaling', description: 'Automating, hiring, scaling revenue' },
];

const COACHING_STYLES: { value: CoachingStyle; label: string; description: string; emoji: string }[] = [
  { value: 'drill_sergeant', label: 'Drill Sergeant', description: 'Strict, high accountability, no excuses', emoji: '🪖' },
  { value: 'balanced', label: 'Balanced Mentor', description: 'Direct but encouraging', emoji: '⚖️' },
  { value: 'gentle', label: 'Gentle Guide', description: 'Soft nudges, patient, supportive', emoji: '🤝' },
];

const HOURS_OPTIONS = [2, 4, 6, 8];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    timezone: 'Africa/Lagos',
    phase: 1 as UserPhase,
    buildGoal: '',
    showGoal: '',
    earnGoal: '',
    systemizeGoal: '',
    targetIncome: '',
    targetContent: '',
    wakeTime: '05:00',
    sleepTime: '22:00',
    hoursAvailable: 4,
    coachingStyle: 'balanced' as CoachingStyle,
  });
  const [loading, setLoading] = useState(false);
  const { setUser, setOnboardingStep, setPillarGoals } = useStore();

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.name && formData.email && formData.password;
      case 2: return formData.buildGoal && formData.showGoal && formData.earnGoal && formData.systemizeGoal;
      case 3: return formData.targetIncome;
      case 4: return true;
      case 5: return formData.coachingStyle;
      default: return false;
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const user = {
        id: Date.now().toString(),
        email: formData.email,
        name: formData.name,
        timezone: formData.timezone,
        phase: formData.phase,
        coachingStyle: formData.coachingStyle,
        wakeTime: formData.wakeTime,
        sleepTime: formData.sleepTime,
        hoursAvailable: formData.hoursAvailable,
        onboardingComplete: true,
        createdAt: new Date(),
      };
      
      setUser(user);
      setOnboardingStep(5);
      setPillarGoals({
        build: formData.buildGoal,
        show: formData.showGoal,
        earn: formData.earnGoal,
        systemize: formData.systemizeGoal,
        targetIncome: formData.targetIncome,
        targetContent: formData.targetContent,
      });
      
      window.location.href = '/';
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Progress */}
      <div className="p-6 border-b border-zinc-800/50">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-2',
                  step >= s.id ? 'text-amber-500' : 'text-zinc-600'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  step > s.id
                    ? 'bg-amber-500 text-zinc-950'
                    : step === s.id
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-500'
                    : 'bg-zinc-800 text-zinc-500'
                )}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'w-8 h-px',
                    step > s.id ? 'bg-amber-500' : 'bg-zinc-800'
                  )} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs font-bold text-zinc-500 tracking-widest uppercase">
            Step {step} of {STEPS.length}: {STEPS[step - 1].label}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black tracking-tight">Welcome to GoalFlow</h2>
                  <p className="text-zinc-500 mt-2">Let's get started with the basics</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="What's your name?"
                      className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      placeholder="you@example.com"
                      className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateForm('password', e.target.value)}
                      placeholder="Create a password"
                      className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-2">
                      Current Phase
                    </label>
                    <div className="space-y-2">
                      {PHASES.map((phase) => (
                        <button
                          key={phase.value}
                          onClick={() => updateForm('phase', phase.value)}
                          className={cn(
                            'w-full p-4 rounded-xl border text-left transition-all',
                            formData.phase === phase.value
                              ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                              : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          )}
                        >
                          <div className="font-bold">{phase.label}</div>
                          <div className="text-xs opacity-70">{phase.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black tracking-tight">The 4 Pillars</h2>
                  <p className="text-zinc-500 mt-2">Define your focus areas for each pillar</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-400 tracking-widest uppercase mb-2">
                      BUILD — What are you building?
                    </label>
                    <input
                      type="text"
                      value={formData.buildGoal}
                      onChange={(e) => updateForm('buildGoal', e.target.value)}
                      placeholder="e.g., Flutter app, Data science skills, Design system"
                      className="w-full p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-400 tracking-widest uppercase mb-2">
                      SHOW — What's your content?
                    </label>
                    <input
                      type="text"
                      value={formData.showGoal}
                      onChange={(e) => updateForm('showGoal', e.target.value)}
                      placeholder="e.g., Tech tweets, YouTube videos, LinkedIn posts"
                      className="w-full p-4 rounded-xl bg-purple-950/20 border border-purple-900/30 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-green-400 tracking-widest uppercase mb-2">
                      EARN — How do you make money?
                    </label>
                    <input
                      type="text"
                      value={formData.earnGoal}
                      onChange={(e) => updateForm('earnGoal', e.target.value)}
                      placeholder="e.g., Freelance clients, SaaS product, Consulting"
                      className="w-full p-4 rounded-xl bg-green-950/20 border border-green-900/30 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-orange-400 tracking-widest uppercase mb-2">
                      SYSTEMIZE — What needs automation?
                    </label>
                    <input
                      type="text"
                      value={formData.systemizeGoal}
                      onChange={(e) => updateForm('systemizeGoal', e.target.value)}
                      placeholder="e.g., Client onboarding, Invoicing, Email responses"
                      className="w-full p-4 rounded-xl bg-orange-950/20 border border-orange-900/30 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black tracking-tight">90-Day Goals</h2>
                  <p className="text-zinc-500 mt-2">Set your targets for the next 90 days</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-green-400 tracking-widest uppercase mb-2">
                      Target Monthly Income
                    </label>
                    <input
                      type="text"
                      value={formData.targetIncome}
                      onChange={(e) => updateForm('targetIncome', e.target.value)}
                      placeholder="e.g., $5,000/month"
                      className="w-full p-4 rounded-xl bg-green-950/20 border border-green-900/30 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-400 tracking-widest uppercase mb-2">
                      Target Content Output
                    </label>
                    <input
                      type="text"
                      value={formData.targetContent}
                      onChange={(e) => updateForm('targetContent', e.target.value)}
                      placeholder="e.g., 12 blog posts, 24 tweets, 4 videos"
                      className="w-full p-4 rounded-xl bg-purple-950/20 border border-purple-900/30 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black tracking-tight">Your Schedule</h2>
                  <p className="text-zinc-500 mt-2">When are you at your best?</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-2">
                        Wake Time
                      </label>
                      <input
                        type="time"
                        value={formData.wakeTime}
                        onChange={(e) => updateForm('wakeTime', e.target.value)}
                        className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-2">
                        Sleep Time
                      </label>
                      <input
                        type="time"
                        value={formData.sleepTime}
                        onChange={(e) => updateForm('sleepTime', e.target.value)}
                        className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 tracking-widest uppercase mb-2">
                      Available Hours Per Day
                    </label>
                    <div className="flex gap-2">
                      {HOURS_OPTIONS.map((hours) => (
                        <button
                          key={hours}
                          onClick={() => updateForm('hoursAvailable', hours)}
                          className={cn(
                            'flex-1 py-3 rounded-xl border font-bold transition-all',
                            formData.hoursAvailable === hours
                              ? 'bg-amber-500 text-zinc-950'
                              : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          )}
                        >
                          {hours}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black tracking-tight">Your AI Coach</h2>
                  <p className="text-zinc-500 mt-2">How should Ryna support you?</p>
                </div>

                <div className="space-y-3">
                  {COACHING_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => updateForm('coachingStyle', style.value)}
                      className={cn(
                        'w-full p-4 rounded-xl border text-left transition-all',
                        formData.coachingStyle === style.value
                          ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                          : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{style.emoji}</span>
                        <div>
                          <div className="font-bold">{style.label}</div>
                          <div className="text-xs opacity-70">{style.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-zinc-800/50">
        <div className="max-w-md mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 font-bold hover:border-zinc-700 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all',
                canProceed()
                  ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              )}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed() || loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all',
                canProceed() && !loading
                  ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              )}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}