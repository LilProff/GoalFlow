import type { User, DailyData, Task, Goal, HistoryEntry, WeeklyReport, ChatMessage, KPISummary, LeaderboardEntry, AppNotification, TimeBlock } from '../types';
import { format } from 'date-fns';
import { DEFAULT_PILLARS, LIFE_CATEGORIES } from './constants';

function daysFromNow(days: number): string {
  return format(new Date(Date.now() + days * 86400000), 'yyyy-MM-dd');
}

export const MOCK_USER: User = {
  id: 'usr_01', name: 'Alex Rivera', email: 'alex@goalflow.ai',
  timezone: 'America/New_York', occupation: 'founder', weeklyHours: 50,
  level: 4, xp: 3200, streak: 12, longestStreak: 18,
  onboardingComplete: true, onboardingMode: 'form',
  coachStyle: 'strategist',
  pillars: DEFAULT_PILLARS,
  categories: LIFE_CATEGORIES.filter(c => ['spiritual','physical','financial','mental','learning','social'].includes(c.id)),
  has9to5: false, workStartTime: '09:00', workEndTime: '17:00',
  createdAt: '2024-01-15T00:00:00Z',
  badges: [
    { id:'first-task',   label:'First Step',      description:'Completed your first task',  icon:'▷', rarity:'common',    earnedAt:'2024-01-15T00:00:00Z' },
    { id:'week-streak',  label:'7-Day Warrior',   description:'7-day execution streak',     icon:'🔥', rarity:'common',    earnedAt:'2024-01-22T00:00:00Z' },
    { id:'deep-worker',  label:'Deep Worker',     description:'100 hours of deep work',     icon:'◈', rarity:'rare',      earnedAt:'2024-02-01T00:00:00Z' },
    { id:'all-pillars',  label:'Full Stack Human',description:'All 4 pillars in one day',   icon:'◉', rarity:'epic',      earnedAt:'2024-02-10T00:00:00Z' },
  ],
  totalTasksCompleted: 147,
  weeklyScore: 7.2,
};

const today = format(new Date(), 'yyyy-MM-dd');

export const MOCK_TASKS: Task[] = [
  { id:'t1', pillarId:'BUILD',     categoryId:'learning',   title:'Implement auth flow with Supabase',      description:'Complete sign-up and login pages with JWT + RLS',          estimatedMinutes:90, status:'completed', isAIGenerated:true,  dateKey:today, startTime:'09:00', endTime:'10:30', createdAt:new Date().toISOString(), aiContext:'Critical path to MVP — unblocks all downstream features' },
  { id:'t2', pillarId:'BUILD',     categoryId:'learning',   title:'Design database schema for tasks',       description:'Model tasks, pillars, categories, and daily data',         estimatedMinutes:60, status:'pending',   isAIGenerated:true,  dateKey:today, startTime:'10:30', endTime:'11:30', createdAt:new Date().toISOString(), aiContext:'Schema needs to be right before building API layer' },
  { id:'t3', pillarId:'SHOW',      categoryId:'creative',   title:'Post build log on Twitter/X',            description:'Share progress update with screenshots and learnings',     estimatedMinutes:20, status:'pending',   isAIGenerated:true,  dateKey:today, startTime:'13:00', endTime:'13:20', createdAt:new Date().toISOString(), aiContext:'Consistency in SHOW builds audience compounding' },
  { id:'t4', pillarId:'SHOW',      categoryId:'creative',   title:'Write LinkedIn article draft',           description:'Document the GoalFlow concept and vision',                estimatedMinutes:45, status:'completed', isAIGenerated:false, dateKey:today, startTime:'11:30', endTime:'12:15', createdAt:new Date().toISOString() },
  { id:'t5', pillarId:'EARN',      categoryId:'financial',  title:'Send 3 cold outreach emails',            description:'Target potential early adopters in the productivity niche', estimatedMinutes:30, status:'pending',   isAIGenerated:true,  dateKey:today, startTime:'13:30', endTime:'14:00', createdAt:new Date().toISOString(), aiContext:'EARN pillar needs daily outreach to build pipeline' },
  { id:'t6', pillarId:'EARN',      categoryId:'social',     title:'Follow up with beta prospect',           description:'Check in with Sarah from yesterday — she was interested',  estimatedMinutes:15, status:'pending',   isAIGenerated:false, dateKey:today, startTime:'14:00', endTime:'14:15', createdAt:new Date().toISOString() },
  { id:'t7', pillarId:'SYSTEMIZE', categoryId:'learning',   title:'Set up CI/CD pipeline',                  description:'GitHub Actions for auto-deploy to Vercel',                estimatedMinutes:60, status:'pending',   isAIGenerated:true,  dateKey:today, startTime:'16:00', endTime:'17:00', createdAt:new Date().toISOString(), aiContext:'Automation frees time for higher-leverage work' },
  { id:'t8', pillarId:'SYSTEMIZE', categoryId:'learning',   title:'Document API endpoints',                 description:'OpenAPI spec for all routes — needed before mobile build', estimatedMinutes:45, status:'pending',   isAIGenerated:false, dateKey:today, startTime:'15:00', endTime:'15:45', createdAt:new Date().toISOString() },
];

export const MOCK_DAILY_DATA: DailyData = {
  id: 'dly_01', dateKey: today, userId: 'usr_01', buildHours: 4.5, score: 7.2,
  tasks: MOCK_TASKS,
  reflection: { accomplished: '', blocked: '', grateful: '', tomorrowFocus: '' },
  pillarCompletion: { BUILD:false, SHOW:false, EARN:false, SYSTEMIZE:false },
  updatedAt: new Date().toISOString(),
};

export const MOCK_GOALS: Goal[] = [
  { id:'g1', userId:'usr_01', pillarId:'BUILD', categoryId:'learning',  title:'Launch GoalFlow MVP',            description:'Build and deploy a fully functional MVP with auth, dashboard, and AI coach', targetDate:format(new Date(Date.now()+90*86400000),'yyyy-MM-dd'), status:'active',   progress:35, type:'project',       weeklyKPIs:['Features shipped','Hours coded','Tests written'], milestones:[{id:'m1',goalId:'g1',title:'Complete frontend',dueDate:daysFromNow(-15),completed:false},{id:'m2',goalId:'g1',title:'Connect backend',dueDate:daysFromNow(-30),completed:false},{id:'m3',goalId:'g1',title:'Beta launch',dueDate:daysFromNow(-60),completed:false}], weeklyPlan:'This week: Complete auth flow, design system, and core dashboard.', strategy:'Ship fast, iterate based on user feedback. Focus on core loop first.', createdAt:'2024-01-15T00:00:00Z', timelineType:'long-term', origin:'manual', timelineHistory:[] },
  { id:'g2', userId:'usr_01', pillarId:'SHOW',  categoryId:'creative',  title:'Grow audience to 5,000',         description:'Build in public, share progress, grow an engaged audience',                  targetDate:format(new Date(Date.now()+90*86400000),'yyyy-MM-dd'), status:'active',   progress:18, type:'outcome',       weeklyKPIs:['Posts published','Followers gained','Engagement rate'], milestones:[{id:'m4',goalId:'g2',title:'1,000 followers',dueDate:format(daysFromNow(-20),'yyyy-MM-dd'),completed:false},{id:'m5',goalId:'g2',title:'3,000 followers',dueDate:format(daysFromNow(-50),'yyyy-MM-dd'),completed:false}], weeklyPlan:'Post daily build logs, one long-form article per week.', strategy:'Build in public. Document everything. Engage with 10 creators daily.', createdAt:'2024-01-15T00:00:00Z', timelineType:'long-term', origin:'manual', timelineHistory:[] },
  { id:'g3', userId:'usr_01', pillarId:'EARN',  categoryId:'financial', title:'Reach $5K MRR',                  description:'Convert beta users to paid, close first 50 customers at $99/mo',              targetDate:format(new Date(Date.now()+90*86400000),'yyyy-MM-dd'), status:'at-risk',  progress:8,  type:'outcome',       weeklyKPIs:['Outreach sent','Demos booked','MRR added'], milestones:[{id:'m6',goalId:'g3',title:'First paying customer',dueDate:format(daysFromNow(-10),'yyyy-MM-dd'),completed:false},{id:'m7',goalId:'g3',title:'$1K MRR',dueDate:format(daysFromNow(-40),'yyyy-MM-dd'),completed:false}], weeklyPlan:'Send 15 outreach emails, schedule 3 demos, publish pricing page.', strategy:'Outreach first, build second. Revenue validates the product.', createdAt:'2024-01-15T00:00:00Z', timelineType:'short-term', origin:'manual', timelineHistory:[] },
  { id:'g4', userId:'usr_01', pillarId:'SYSTEMIZE', categoryId:'learning', title:'AWS Solutions Architect Cert', description:'Pass the AWS SAA-C03 certification exam',                                   targetDate:format(new Date(Date.now()+120*86400000),'yyyy-MM-dd'),status:'active',   progress:22, type:'certification', weeklyKPIs:['Study hours','Practice tests','Modules completed'], milestones:[{id:'m8',goalId:'g4',title:'Complete IAM & EC2 modules',dueDate:format(daysFromNow(-14),'yyyy-MM-dd'),completed:true},{id:'m9',goalId:'g4',title:'First practice exam (70%+)',dueDate:format(daysFromNow(-35),'yyyy-MM-dd'),completed:false}], weeklyPlan:'2 hours study daily, one practice test per week.', strategy:'Structured curriculum + spaced repetition. Practice exams from week 4.', createdAt:'2024-01-15T00:00:00Z', timelineType:'long-term', origin:'manual', timelineHistory:[] },
];

export const MOCK_HISTORY: HistoryEntry[] = Array.from({length:14},(_,i)=>({
  dateKey: format(new Date(Date.now() + (13 - i) * 86400000),'yyyy-MM-dd'),
  score: +(4+Math.random()*5).toFixed(1),
  buildHours: +(2+Math.random()*5).toFixed(1),
  tasksCompleted: Math.floor(3+Math.random()*6),
  tasksTotal: 8,
  disciplineScore: Math.floor(50+Math.random()*50),
}));

export const MOCK_KPI: KPISummary = {
  currentScore:7.2, streak:12, level:4, xp:3200,
  weeklyAvgScore:6.8, totalTasksCompleted:147, buildHoursThisWeek:28.5,
  pillarDistribution:{ BUILD:42, SHOW:22, EARN:18, SYSTEMIZE:18 },
  categoryDistribution:{ spiritual:15, physical:12, financial:18, mental:20, learning:22, social:13 },
  disciplineScore:74,
  consistencyScore:68,
};

export const MOCK_WEEKLY_REPORT: WeeklyReport = {
  weekStart: format(new Date(Date.now() - 7 * 86400000),'yyyy-MM-dd'),
  weekEnd: today,
  summary: 'Strong execution week. BUILD dominated at 42% of output. Consistency score improved +6 points. EARN pillar underperformed — avoidance pattern detected around outreach.',
  highlights: ['Completed auth flow ahead of schedule','12-day streak maintained \u2014 longest this month','First cold email sent \u2014 broke the avoidance barrier'],
  improvements: ['EARN: only 2/6 tasks completed \u2014 sales avoidance pattern','Morning deep work window underutilized (avg 2.1h vs 4h target)','Spiritual block skipped twice this week'],
  aiInsight: 'Your BUILD momentum is exceptional. The bottleneck is distribution \u2014 pair every BUILD session with a SHOW task. Your EARN gap is behavioral, not capability. Schedule outreach as your first task tomorrow, before you open your IDE.',
  coachMessage: 'You\u2019re building well but hiding. The world can\u2019t pay for what it can\u2019t see. This week: ship one thing AND tell someone about it every single day.',
  nextWeekFocus: ['Prioritize EARN outreach \u2014 minimum 3 emails/day','Protect morning deep work window \u2014 no meetings before 11am','Restore spiritual morning block \u2014 it anchors everything else'],
};

export const MOCK_CHAT_HISTORY: ChatMessage[] = [
  { id:'msg1', role:'assistant', content:"Good morning, Alex. Day 12 of your streak \u2014 don't break it.\n\nYou have 8 tasks across 4 pillars. Your EARN goal is at-risk \u2014 8% progress with 77 days left. That needs attention today.\n\nWhere do we start?", timestamp:new Date(Date.now()-3600000).toISOString(),
    quickActions:[
      { id:'qa1', label:'Plan my day', prompt:'Plan my full day based on my goals and current task list.', icon:'\u25b7', mcpAction:{type:'generate_tasks',preview:'Generate optimized daily task plan'} },
      { id:'qa2', label:'Fix EARN gap', prompt:'My EARN goal is at-risk. What should I do today to course-correct?', icon:'\u25c6' },
    ]
  },
  { id:'msg2', role:'user', content:'Let\'s fix the EARN gap. What exactly should I do?', timestamp:new Date(Date.now()-3500000).toISOString() },
  { id:'msg3', role:'assistant', content:"Here's the diagnosis and the fix:\n\n**Problem:** You're avoiding outreach. 2/6 EARN tasks done this week. The pattern is: you open your IDE instead of your email.\n\n**Today's EARN plan:**\n01. Write 3 cold emails (30min) \u2014 I'll draft them if you give me the targets\n02. Follow up with Sarah \u2014 she's warm, don't let it go cold\n03. Update your pricing page (15min) \u2014 remove friction for buyers\n\n**Rule for this week:** EARN tasks before IDE. Every day.\n\nWant me to draft the cold emails now?",
    timestamp:new Date(Date.now()-3400000).toISOString(),
    quickActions:[
      { id:'qa3', label:'Draft cold emails', prompt:'Draft 3 cold outreach emails for my EARN goal. Ask me for the targets.', icon:'\u25c6', mcpAction:{type:'draft_cold_email',preview:'Draft personalized cold outreach emails'} },
      { id:'qa4', label:'Add EARN tasks', prompt:'Add the EARN tasks you just listed to my today\'s task list.', icon:'+', mcpAction:{type:'add_task',preview:'Add 3 EARN tasks to today'} },
    ]
  },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id:'n1', type:'start',       title:'Deep Work Starting',    message:'Build: Implement auth flow starts in 5 minutes \u2014 close distractions now',  time:'08:55', dismissed:false },
  { id:'n2', type:'coach',       title:'Ryna Nudge',            message:'You skipped EARN outreach yesterday. It\u2019s queued first today. Don\u2019t skip it again.', time:'07:00', dismissed:false },
  { id:'n3', type:'achievement', title:'Badge Unlocked!',       message:'12-Day Streak \u2014 you\u2019re building real discipline. Keep going.',              time:'00:01', dismissed:false },
  { id:'n4', type:'warning',     title:'Goal At Risk',          message:'EARN goal is at 8% with 77 days left. You need to accelerate this week.',      time:'06:00', dismissed:false },
  { id:'n5', type:'reshuffle',   title:'Day Reshuffled',        message:'Transit running late \u2014 Ryna moved Deep Work to 09:20 and compressed lunch to 30min.', time:'08:35', dismissed:false },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { userId:'u1',  name:'Sarah K.',    avatarInitial:'S', level:7, xp:13500, streak:34, weeklyScore:9.1, rank:1,  pillars:['BUILD','SHOW','EARN','SYSTEMIZE'], occupation:'founder',    badge:'\u2605' },
  { userId:'u2',  name:'Marcus T.',   avatarInitial:'M', level:6, xp:9200,  streak:21, weeklyScore:8.7, rank:2,  pillars:['BUILD','EARN','SYSTEMIZE'],        occupation:'developer',  badge:'\u25c8' },
  { userId:'u3',  name:'Priya S.',    avatarInitial:'P', level:6, xp:8800,  streak:19, weeklyScore:8.4, rank:3,  pillars:['BUILD','SHOW','SYSTEMIZE'],        occupation:'designer',   badge:'\u25ce' },
  { userId:'u4',  name:'Jordan M.',   avatarInitial:'J', level:5, xp:6100,  streak:15, weeklyScore:8.1, rank:4,  pillars:['BUILD','SHOW','EARN'],             occupation:'freelancer', badge:'' },
  { userId:'u5',  name:'Amara O.',    avatarInitial:'A', level:5, xp:5800,  streak:12, weeklyScore:7.9, rank:5,  pillars:['BUILD','EARN','SYSTEMIZE'],        occupation:'founder',    badge:'' },
  { userId:'usr_01', name:'Alex Rivera', avatarInitial:'A', level:4, xp:3200, streak:12, weeklyScore:7.2, rank:6, pillars:['BUILD','SHOW','EARN','SYSTEMIZE'], occupation:'founder',  badge:'' },
  { userId:'u7',  name:'David L.',    avatarInitial:'D', level:4, xp:3100,  streak:10, weeklyScore:7.0, rank:7,  pillars:['BUILD','SHOW'],                    occupation:'developer',  badge:'' },
  { userId:'u8',  name:'Fatima A.',   avatarInitial:'F', level:4, xp:2900,  streak:9,  weeklyScore:6.8, rank:8,  pillars:['BUILD','EARN','SHOW'],             occupation:'marketer',   badge:'' },
  { userId:'u9',  name:'Chen W.',     avatarInitial:'C', level:3, xp:2100,  streak:7,  weeklyScore:6.5, rank:9,  pillars:['BUILD','SYSTEMIZE'],               occupation:'student',    badge:'' },
  { userId:'u10', name:'Ryan B.',     avatarInitial:'R', level:3, xp:1800,  streak:5,  weeklyScore:6.1, rank:10, pillars:['BUILD','EARN'],                    occupation:'freelancer', badge:'' },
];

export const MOCK_TIME_BLOCKS: TimeBlock[] = [
  { id:'b1',  label:'Sleep',               category:'sleep',    startMinute:0,    durationMinutes:360, completed:false, skipped:false, flexible:false, priority:'fixed',  userEditable:false },
  { id:'b2',  label:'Morning Prayer',      category:'spiritual',startMinute:360,  durationMinutes:30,  completed:false, skipped:false, flexible:false, priority:'high',   userEditable:true  },
  { id:'b3',  label:'Bible Reading',       category:'spiritual',startMinute:390,  durationMinutes:20,  completed:false, skipped:false, flexible:true,  priority:'high',   userEditable:true  },
  { id:'b4',  label:'Exercise',            category:'exercise', startMinute:410,  durationMinutes:45,  completed:false, skipped:false, flexible:true,  priority:'high',   userEditable:true  },
  { id:'b5',  label:'Shower & Prep',       category:'personal', startMinute:455,  durationMinutes:25,  completed:false, skipped:false, flexible:false, priority:'fixed',  userEditable:false },
  { id:'b6',  label:'Breakfast',           category:'meals',    startMinute:480,  durationMinutes:20,  completed:false, skipped:false, flexible:true,  priority:'medium', userEditable:true  },
  { id:'b7',  label:'Transit to Office',   category:'transit',  startMinute:500,  durationMinutes:45,  completed:false, skipped:false, flexible:false, priority:'fixed',  userEditable:true  },
  { id:'b8',  label:'Deep Work — BUILD',   category:'deepwork', startMinute:545,  durationMinutes:90,  pillarId:'BUILD',completed:false, skipped:false, flexible:true,  priority:'high',   userEditable:true  },
  { id:'b9',  label:'Admin / Standup',     category:'admin',    startMinute:635,  durationMinutes:30,  completed:false, skipped:false, flexible:false, priority:'fixed',  userEditable:true  },
  { id:'b10', label:'Deep Work — BUILD',   category:'deepwork', startMinute:665,  durationMinutes:90,  pillarId:'BUILD',completed:false, skipped:false, flexible:true,  priority:'high',   userEditable:true  },
  { id:'b11', label:'Lunch',               category:'meals',    startMinute:755,  durationMinutes:45,  completed:false, skipped:false, flexible:true,  priority:'medium', userEditable:true  },
  { id:'b12', label:'SHOW — Post & Engage',category:'show',     startMinute:800,  durationMinutes:30,  pillarId:'SHOW', completed:false, skipped:false, flexible:true,  priority:'high',   userEditable:true  },
  { id:'b13', label:'EARN — Outreach',     category:'earn',     startMinute:830,  durationMinutes:60,  pillarId:'EARN', completed:false, skipped:false, flexible:true,  priority:'high',   userEditable:true  },
  { id:'b14', label:'Learning / Study',    category:'learning', startMinute:890,  durationMinutes:45,  completed:false, skipped:false, flexible:true,  priority:'medium', userEditable:true  },
  { id:'b15', label:'Buffer',              category:'buffer',   startMinute:935,  durationMinutes:25,  completed:false, skipped:false, flexible:true,  priority:'low',    userEditable:true  },
  { id:'b16', label:'Transit Home',        category:'transit',  startMinute:960,  durationMinutes:45,  completed:false, skipped:false, flexible:false, priority:'fixed',  userEditable:true  },
  { id:'b17', label:'Evening Prayer',      category:'spiritual',startMinute:1005, durationMinutes:20,  completed:false, skipped:false, flexible:false, priority:'high',   userEditable:true  },
  { id:'b18', label:'SYSTEMIZE',           category:'deepwork', startMinute:1025, durationMinutes:45,  pillarId:'SYSTEMIZE',completed:false, skipped:false, flexible:true, priority:'medium', userEditable:true },
  { id:'b19', label:'Dinner & Family',     category:'personal', startMinute:1070, durationMinutes:60,  completed:false, skipped:false, flexible:false, priority:'fixed',  userEditable:false },
  { id:'b20', label:'Wind Down / Read',    category:'personal', startMinute:1130, durationMinutes:30,  completed:false, skipped:false, flexible:true,  priority:'medium', userEditable:true  },
  { id:'b21', label:'Sleep',               category:'sleep',    startMinute:1380, durationMinutes:360, completed:false, skipped:false, flexible:false, priority:'fixed',  userEditable:false },
];
