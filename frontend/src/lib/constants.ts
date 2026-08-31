import type { Pillar, LifeCategory, CoachStyle, QuickAction } from '../types';

// ─── Default Pillars ────────────────────────────────────────────────────────────────
export const DEFAULT_PILLARS: Pillar[] = [
  { id:'BUILD',     label:'Build',     description:'Deep work, creation, craft — the hours that compound',         icon:'◈', color:'#ff6b35', enabled:true, categories:['deepwork','learning'], weeklyKPIs:['Hours of deep work','Features shipped','Skills practiced'] },
  { id:'SHOW',      label:'Show',      description:'Publish, distribute, be visible — make the work real',          icon:'◎', color:'#00d4b4', enabled:true, categories:['content','networking'],  weeklyKPIs:['Posts published','Audience growth','Engagements'] },
  { id:'EARN',      label:'Earn',      description:'Pitch, close, monetize — convert output into revenue',           icon:'◆', color:'#f5c842', enabled:true, categories:['sales','finance'],      weeklyKPIs:['Outreach sent','Deals closed','Revenue generated'] },
  { id:'SYSTEMIZE', label:'Systemize', description:'Automate, delegate, optimize — build leverage',                  icon:'◉', color:'#7b8fa8', enabled:true, categories:['systems','productivity'],weeklyKPIs:['Processes automated','Hours saved','Systems documented'] },
];

// ─── Life Categories (complete person) ───────────────────────────────────────────────────
export const LIFE_CATEGORIES: LifeCategory[] = [
  { id:'spiritual',   label:'Spiritual',      description:'Prayer, Bible, faith practices, meditation',              icon:'✡️',  color:'#d4f53c', enabled:true },
  { id:'physical',    label:'Physical',       description:'Exercise, gym, sport, health, nutrition',                 icon:'🏋️',  color:'#ff6b35', enabled:true },
  { id:'financial',   label:'Financial',      description:'Income, savings, investing, budgeting, wealth-building',  icon:'💰',  color:'#f5c842', enabled:true },
  { id:'mental',      label:'Mental',         description:'Reading, podcasts, courses, journaling, therapy',         icon:'🧠',  color:'#a78bfa', enabled:true },
  { id:'social',      label:'Social',         description:'Relationships, networking, community, family',             icon:'🤝',  color:'#00d4b4', enabled:true },
  { id:'career',      label:'Career / Work',  description:'9-5 job performance, promotions, skills, projects',       icon:'💼',  color:'#7b8fa8', enabled:true },
  { id:'creative',    label:'Creative',       description:'Art, music, writing, design, side projects',              icon:'🎨',  color:'#f472b6', enabled:true },
  { id:'learning',    label:'Learning',       description:'Courses, certifications, books, skill acquisition',       icon:'📚',  color:'#60a5fa', enabled:true },
  { id:'news',        label:'Stay Current',   description:'News, industry trends, market awareness, podcasts',       icon:'📰',  color:'#94a3b8', enabled:true },
  { id:'family',      label:'Family',         description:'Partner, children, parents, home responsibilities',       icon:'🏡',  color:'#fb923c', enabled:true },
  { id:'health',      label:'Health',         description:'Medical check-ups, sleep, nutrition, mental health',      icon:'🌿',  color:'#34d399', enabled:true },
  { id:'purpose',     label:'Purpose',        description:'Reflection, vision, values, legacy, contribution',        icon:'⭐',  color:'#fbbf24', enabled:true },
];

// ─── Pillar color map ──────────────────────────────────────────────────────────────────────
export const PILLAR_THEME: Record<string, { accent:string; bg:string; border:string; text:string }> = {
  BUILD:     { accent:'#ff6b35', bg:'rgba(255,107,53,0.08)',  border:'rgba(255,107,53,0.25)',  text:'#ff6b35' },
  SHOW:      { accent:'#00d4b4', bg:'rgba(0,212,180,0.08)',   border:'rgba(0,212,180,0.25)',   text:'#00d4b4' },
  EARN:      { accent:'#f5c842', bg:'rgba(245,200,66,0.08)',  border:'rgba(245,200,66,0.25)',  text:'#f5c842' },
  SYSTEMIZE: { accent:'#7b8fa8', bg:'rgba(123,143,168,0.08)', border:'rgba(123,143,168,0.25)', text:'#7b8fa8' },
};

export const getPillarTheme = (id: string) =>
  PILLAR_THEME[id] ?? { accent:'#5a5448', bg:'rgba(90,84,72,0.08)', border:'rgba(90,84,72,0.2)', text:'#5a5448' };

// ─── Coach Styles ────────────────────────────────────────────────────────────────────
export const COACH_STYLES: { id:CoachStyle; label:string; description:string; tagline:string; symbol:string; trigger:string }[] = [
  { id:'drill-sergeant', label:'Drill Sergeant', description:'No excuses. Raw accountability. You either execute or you explain.',     tagline:'"Comfort is the enemy of progress."',   symbol:'▲', trigger:'Low discipline score, missed fixed blocks, broken streaks' },
  { id:'mentor',         label:'Wise Mentor',    description:'Long-view guidance. Pattern recognition. Wisdom over pressure.',        tagline:'"Every master was once a disaster."',    symbol:'◈', trigger:'Consistent performer needing strategic depth' },
  { id:'cheerleader',    label:'High Energy',    description:'Momentum-first. Every win matters. Keep the fire burning.',             tagline:'"You\'ve got this — let\'s go!"',          symbol:'◎', trigger:'New user, low confidence, needs motivation' },
  { id:'strategist',     label:'Cold Strategist',description:'Data-driven. Optimize ruthlessly. Emotion-free execution.',            tagline:'"What gets measured, gets managed."',    symbol:'◉', trigger:'High performer wanting efficiency gains' },
  { id:'philosopher',    label:'Stoic',          description:'Meaning over metrics. Depth over speed. The long game.',                tagline:'"The obstacle is the way."',             symbol:'◆', trigger:'Burnout risk, needs perspective and purpose' },
];

// ─── Occupation presets ──────────────────────────────────────────────────────────────────
export const OCCUPATION_PRESETS: Record<string, { label:string; icon:string; suggestedPillars:string[]; suggestedCategories:string[] }> = {
  developer:  { label:'Developer / Engineer',     icon:'{ }', suggestedPillars:['BUILD','SHOW','EARN','SYSTEMIZE'], suggestedCategories:['learning','mental','physical','spiritual','financial'] },
  designer:   { label:'Designer / Creative',      icon:'◈',   suggestedPillars:['BUILD','SHOW','EARN','SYSTEMIZE'], suggestedCategories:['creative','learning','social','physical','spiritual'] },
  marketer:   { label:'Marketer / Growth',        icon:'◎',   suggestedPillars:['SHOW','EARN','SYSTEMIZE','BUILD'], suggestedCategories:['news','social','financial','mental','physical'] },
  student:    { label:'Student / Learner',        icon:'▷',   suggestedPillars:['BUILD','SHOW','SYSTEMIZE'],        suggestedCategories:['learning','spiritual','physical','social','mental'] },
  founder:    { label:'Founder / Entrepreneur',   icon:'◆',   suggestedPillars:['BUILD','SHOW','EARN','SYSTEMIZE'], suggestedCategories:['financial','mental','physical','spiritual','social'] },
  freelancer: { label:'Freelancer / Consultant',  icon:'◉',   suggestedPillars:['BUILD','EARN','SHOW','SYSTEMIZE'], suggestedCategories:['financial','learning','physical','spiritual','social'] },
  employee:   { label:'9-5 Professional',         icon:'💼',  suggestedPillars:['BUILD','SHOW','EARN','SYSTEMIZE'], suggestedCategories:['career','learning','physical','spiritual','family'] },
  researcher: { label:'Researcher / Academic',    icon:'⊕',   suggestedPillars:['BUILD','SHOW','SYSTEMIZE'],        suggestedCategories:['learning','mental','spiritual','health','social'] },
  other:      { label:'Other',                    icon:'—',   suggestedPillars:['BUILD','SHOW','EARN','SYSTEMIZE'], suggestedCategories:['spiritual','physical','mental','financial','social'] },
};

// ─── Timezones ──────────────────────────────────────────────────────────────────────────
export const TIMEZONES = [
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'America/Toronto','America/Vancouver','Europe/London','Europe/Paris',
  'Europe/Berlin','Europe/Amsterdam','Asia/Dubai','Asia/Kolkata',
  'Asia/Singapore','Asia/Tokyo','Asia/Seoul','Australia/Sydney','Pacific/Auckland',
  'Africa/Lagos','Africa/Nairobi','Africa/Johannesburg','Africa/Accra',
];

// ─── Ryna MCP Quick Actions ──────────────────────────────────────────────────────────────
export const RYNA_QUICK_ACTIONS: QuickAction[] = [
  { id:'plan-day',     label:'Plan my day',    prompt:'Plan my day and allocate time blocks based on my goals and tasks.',                          icon:'▷', mcpAction:{ type:'generate_tasks', preview:'Generate AI tasks for today' } },
  { id:'reshuffle',    label:'Reshuffle day',  prompt:'Something came up. Help me reshuffle my day plan around this change.',                       icon:'⇄', mcpAction:{ type:'reshuffle_day',  preview:'Reshuffle all flexible time blocks' } },
  { id:'stuck',        label:"I'm stuck",      prompt:"I'm feeling blocked. Analyse my current state and tell me exactly what to do right now.",     icon:'⊘' },
  { id:'add-task',     label:'Add a task',     prompt:'I need to add a task to my day. Ask me what it is and add it.',                              icon:'+',  mcpAction:{ type:'add_task',      preview:'Add a new task to today' } },
  { id:'content-idea', label:'Content idea',   prompt:'Give me a specific content idea I can post today based on my BUILD work and audience.',       icon:'◎', mcpAction:{ type:'generate_content_idea', preview:'Generate a content idea for SHOW' } },
  { id:'cold-email',   label:'Cold email',     prompt:'Draft a cold outreach email for my EARN goal. Ask me for the target and context.',           icon:'◆', mcpAction:{ type:'draft_cold_email', preview:'Draft a cold outreach email' } },
  { id:'week-review',  label:'Week review',    prompt:'Give me a deep weekly performance review with specific actions for next week.',               icon:'◉' },
  { id:'coach-switch', label:'Switch coach',   prompt:'I need a different coaching style right now. Analyse my mood and switch to what I need.',    icon:'◈', mcpAction:{ type:'switch_coach_style', preview:'Auto-switch coach style based on analysis' } },
];

// ─── Level system ──────────────────────────────────────────────────────────────────────────
export const LEVEL_THRESHOLDS = [
  { level:1, label:'INITIATE',   minXP:0,     color:'#5a5448' },
  { level:2, label:'BUILDER',    minXP:500,   color:'#7b8fa8' },
  { level:3, label:'EXECUTOR',   minXP:1200,  color:'#60a5fa' },
  { level:4, label:'OPERATOR',   minXP:2500,  color:'#a78bfa' },
  { level:5, label:'STRATEGIST', minXP:4500,  color:'#00d4b4' },
  { level:6, label:'ARCHITECT',  minXP:7500,  color:'#f5c842' },
  { level:7, label:'SOVEREIGN',  minXP:12000, color:'#ff6b35' },
  { level:8, label:'LEGEND',     minXP:20000, color:'#d4f53c' },
];

export const getLevelInfo = (level: number) =>
  LEVEL_THRESHOLDS.find(l => l.level === level) ?? LEVEL_THRESHOLDS[0];

// ─── Badges ────────────────────────────────────────────────────────────────────────────
export const BADGE_DEFINITIONS = [
  { id:'first-task',    label:'First Step',      description:'Completed your first task',            icon:'▷', rarity:'common'    as const },
  { id:'week-streak',   label:'7-Day Warrior',   description:'7-day execution streak',               icon:'🔥', rarity:'common'    as const },
  { id:'month-streak',  label:'Iron Discipline', description:'30-day unbroken streak',               icon:'⚡', rarity:'rare'      as const },
  { id:'first-goal',    label:'Goal Setter',     description:'Set your first 90-day goal',           icon:'◆', rarity:'common'    as const },
  { id:'goal-complete', label:'Goal Crusher',    description:'Completed a 90-day goal',              icon:'★', rarity:'epic'      as const },
  { id:'deep-worker',   label:'Deep Worker',     description:'Logged 100 hours of deep work',        icon:'◈', rarity:'rare'      as const },
  { id:'all-pillars',   label:'Full Stack Human',description:'Completed tasks in all 4 pillars in a day', icon:'◉', rarity:'epic'   as const },
  { id:'top-10',        label:'Top 10',          description:'Reached top 10 on leaderboard',        icon:'🏆', rarity:'legendary' as const },
  { id:'consistent',    label:'Consistent',      description:'90% completion rate for 2 weeks',      icon:'◎', rarity:'rare'      as const },
  { id:'spiritual',     label:'Grounded',        description:'30 consecutive days of spiritual block',icon:'✡️', rarity:'rare'     as const },
];

// ─── Goal types ───────────────────────────────────────────────────────────────────────────
export const GOAL_TYPES = [
  { id:'outcome',       label:'Outcome Goal',      description:'A specific result to achieve (revenue, followers, etc.)',   icon:'◆' },
  { id:'learning',      label:'Learning Goal',     description:'A skill or knowledge area to master',                      icon:'📚' },
  { id:'certification', label:'Certification',     description:'A formal credential or qualification to earn',             icon:'★' },
  { id:'habit',         label:'Habit Goal',        description:'A daily/weekly behaviour to build consistently',           icon:'◎' },
  { id:'project',       label:'Project Goal',      description:'A specific deliverable to ship or complete',               icon:'◈' },
];
