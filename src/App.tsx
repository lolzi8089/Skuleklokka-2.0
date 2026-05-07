import { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Moon, Sun, Clock, Circle, Type, 
  Users, Sparkles, Settings, X, Plus, Trash2, Save, RotateCcw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isFirebaseConfigured, database, ref, onValue, onDisconnect, set, push, remove } from './firebase';
import { isGeminiConfigured, getBreakTip } from './gemini';

// --- Types ---
interface ScheduleItem {
  id: string;
  time: string;
  name: string;
}

type ThemeType = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'neon';

// --- Constants & Defaults ---
const DEFAULT_NORMAL_SCHEDULE: ScheduleItem[] = [
  { id: '1', time: "08:15", name: "Skulestart" },
  { id: '2', time: "09:00", name: "Andre time" },
  { id: '3', time: "09:45", name: "Friminutt" },
  { id: '4', time: "10:00", name: "Tredje time" },
  { id: '5', time: "10:45", name: "Matpause" },
  { id: '6', time: "11:05", name: "Friminutt" },
  { id: '7', time: "11:35", name: "Fjerde time" },
  { id: '8', time: "12:20", name: "Femte time" },
  { id: '9', time: "13:05", name: "Friminutt" },
  { id: '10', time: "13:15", name: "Sjette time" },
  { id: '11', time: "14:00", name: "Skuleslutt" }
];

const DEFAULT_FRIDAY_SCHEDULE: ScheduleItem[] = [
  { id: 'f1', time: "08:15", name: "Skulestart" },
  { id: 'f2', time: "09:00", name: "Andre time" },
  { id: 'f3', time: "09:45", name: "Friminutt" },
  { id: 'f4', time: "10:00", name: "Tredje time" },
  { id: 'f5', time: "10:45", name: "Matpause" },
  { id: 'f6', time: "11:05", name: "Friminutt" },
  { id: 'f7', time: "11:35", name: "Fjerde time" },
  { id: 'f8', time: "12:20", name: "Femte time" },
  { id: 'f9', time: "13:05", name: "Skuleslutt" }
];

const THEMES: { id: ThemeType; name: string; color: string }[] = [
  { id: 'light', name: 'Lys', color: '#ffffff' },
  { id: 'dark', name: 'Mørk', color: '#111827' },
  { id: 'blue', name: 'Blå', color: '#3b82f6' },
  { id: 'green', name: 'Grøn', color: '#10b981' },
  { id: 'purple', name: 'Lilla', color: '#a855f7' },
  { id: 'neon', name: 'Neon', color: '#00ff41' },
];

// --- Utilities ---
const parseTime = (timeStr: string, baseDate: Date) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

const playChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 2);
    
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

// --- Main App Component ---
export default function App() {
  const [now, setNow] = useState(new Date());
  
  // Persistent State
  const [normalSchedule, setNormalSchedule] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('skuleklokke_normal_schedule');
    return saved ? JSON.parse(saved) : DEFAULT_NORMAL_SCHEDULE;
  });
  
  const [fridaySchedule, setFridaySchedule] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('skuleklokke_friday_schedule');
    return saved ? JSON.parse(saved) : DEFAULT_FRIDAY_SCHEDULE;
  });

  const [theme, setTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('skuleklokke_theme');
    return (saved as ThemeType) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('skuleklokke_sound') === 'true';
  });

  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem('skuleklokke_display_mode') || 'text';
  });

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [aiTip, setAiTip] = useState<string | null>(null);
  
  // Refs
  const lastEventTriggered = useRef<string | null>(null);
  const lastTipEvent = useRef<string | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('skuleklokke_normal_schedule', JSON.stringify(normalSchedule));
    localStorage.setItem('skuleklokke_friday_schedule', JSON.stringify(fridaySchedule));
    localStorage.setItem('skuleklokke_theme', theme);
    localStorage.setItem('skuleklokke_sound', soundEnabled.toString());
    localStorage.setItem('skuleklokke_display_mode', displayMode);

    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark' || theme === 'neon') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [normalSchedule, fridaySchedule, theme, soundEnabled, displayMode]);

  // Firebase Viewers Counter
  useEffect(() => {
    if (!isFirebaseConfigured || !database) return;

    const connectedRef = ref(database, '.info/connected');
    const onlineUsersRef = ref(database, 'onlineUsers');
    let myUserRef: any = null;

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        myUserRef = push(onlineUsersRef);
        onDisconnect(myUserRef).remove().then(() => {
          set(myUserRef, true);
        });
      }
    });

    const unsubUsers = onValue(onlineUsersRef, (snap) => {
      if (snap.exists()) {
        setViewersCount(Object.keys(snap.val()).length);
      } else {
        setViewersCount(0);
      }
    });

    return () => {
      unsubConnected();
      unsubUsers();
      if (myUserRef) remove(myUserRef);
    };
  }, []);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Logic to determine current and next events
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;
  const activeSchedule = isFriday ? fridaySchedule : normalSchedule;
  
  // Sort schedule by time to be safe
  const sortedSchedule = [...activeSchedule].sort((a, b) => a.time.localeCompare(b.time));
  
  const startTimeStr = sortedSchedule.length > 0 ? sortedSchedule[0].time : "08:15";
  const endTimeStr = sortedSchedule.length > 0 ? sortedSchedule[sortedSchedule.length - 1].time : "14:00";

  const dayStart = parseTime(startTimeStr, now);
  const dayEnd = parseTime(endTimeStr, now);
  
  let isSchoolTime = !isWeekend && now >= dayStart && now < dayEnd;
  let nextEvent: ScheduleItem | null = null;
  let eventIndex = -1;

  if (isSchoolTime) {
    for (let i = 0; i < sortedSchedule.length; i++) {
      const eventTime = parseTime(sortedSchedule[i].time, now);
      if (now < eventTime) {
        nextEvent = sortedSchedule[i];
        eventIndex = i;
        break;
      }
    }
  }

  // Chime and AI Tips
  useEffect(() => {
    if (isSchoolTime && nextEvent) {
      if (lastEventTriggered.current !== null && lastEventTriggered.current !== nextEvent.time) {
        if (soundEnabled) playChime();
      }
      
      const eventLower = nextEvent.name.toLowerCase();
      if (isGeminiConfigured && (eventLower.includes('friminutt') || eventLower.includes('matpause') || eventLower.includes('slutt'))) {
        if (lastTipEvent.current !== nextEvent.time) {
          getBreakTip(nextEvent.name).then(tip => setAiTip(tip));
          lastTipEvent.current = nextEvent.time;
        }
      } else {
        setAiTip(null);
      }

      lastEventTriggered.current = nextEvent.time;
    } else {
      lastEventTriggered.current = null;
      setAiTip(null);
    }
  }, [nextEvent, isSchoolTime, soundEnabled]);

  // Calculations for UI
  let countdownText = "00:00:00";
  let secondsLeft = 0;
  let circlePercent = 0;
  
  if (isSchoolTime && nextEvent) {
    const target = parseTime(nextEvent.time, now);
    const diff = Math.max(0, target.getTime() - now.getTime());
    secondsLeft = Math.floor(diff / 1000);
    
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    
    countdownText = `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    let currentEventStartTime = dayStart;
    if (eventIndex > 0) {
      currentEventStartTime = parseTime(sortedSchedule[eventIndex - 1].time, now);
    }
    
    const eventDuration = Math.max(1, (target.getTime() - currentEventStartTime.getTime()) / 1000);
    const eventElapsed = (now.getTime() - currentEventStartTime.getTime()) / 1000;
    
    circlePercent = Math.max(0, 1 - (eventElapsed / eventDuration));
  }

  const totalSchoolSeconds = Math.max(1, (dayEnd.getTime() - dayStart.getTime()) / 1000);
  const elapsedSchoolSeconds = isSchoolTime ? Math.max(0, (now.getTime() - dayStart.getTime()) / 1000) : (now >= dayEnd ? totalSchoolSeconds : 0);
  const progressPercent = isSchoolTime ? (elapsedSchoolSeconds / totalSchoolSeconds) * 100 : (now >= dayEnd ? 100 : 0);

  // Color logic
  let colorClass = "color-green";
  let strokeColor = "var(--success)";
  if (secondsLeft > 0 && secondsLeft <= 300) {
    colorClass = "color-red";
    strokeColor = "var(--danger)";
  } else if (secondsLeft > 0 && secondsLeft <= 900) {
    colorClass = "color-yellow";
    strokeColor = "var(--warning)";
  }

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (circlePercent * circumference);

  // Format digital clock
  const digitalTime = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Settings Handlers
  const handleUpdateScheduleItem = (day: 'normal' | 'friday', id: string, field: 'time' | 'name', value: string) => {
    const setter = day === 'normal' ? setNormalSchedule : setFridaySchedule;
    setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddScheduleItem = (day: 'normal' | 'friday') => {
    const newItem = { id: Math.random().toString(36).substr(2, 9), time: "12:00", name: "Ny hending" };
    const setter = day === 'normal' ? setNormalSchedule : setFridaySchedule;
    setter(prev => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)));
  };

  const handleRemoveScheduleItem = (day: 'normal' | 'friday', id: string) => {
    const setter = day === 'normal' ? setNormalSchedule : setFridaySchedule;
    setter(prev => prev.filter(item => item.id !== id));
  };

  const handleResetSchedule = () => {
    if (confirm("Vil du nullstille alle timeplanar til standard?")) {
      setNormalSchedule(DEFAULT_NORMAL_SCHEDULE);
      setFridaySchedule(DEFAULT_FRIDAY_SCHEDULE);
    }
  };

  return (
    <div className="app-container">
      <div className="glass-panel">
        
        {/* Header Section */}
        <div className="header">
          <div className="title">Skuleklokke</div>
          
          <div className="flex items-center gap-4">
            {isFirebaseConfigured && (
              <div className="viewers-count" title="Antall personar inne akkurat no">
                <Users size={16} />
                <span>{viewersCount}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button 
                className="icon-btn" 
                onClick={() => setShowSettings(true)}
                title="Innstillingar"
              >
                <Settings size={20} />
              </button>
  
              <button 
                className="icon-btn" 
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Lyd på" : "Lyd av"}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Display Mode Selection */}
        <div className="mode-selector">
          <button className={`mode-btn ${displayMode === 'text' ? 'active' : ''}`} onClick={() => setDisplayMode('text')} title="Nedtelling">
            <Type size={18} />
          </button>
          <button className={`mode-btn ${displayMode === 'circle' ? 'active' : ''}`} onClick={() => setDisplayMode('circle')} title="Sirkel">
            <Circle size={18} />
          </button>
          <button className={`mode-btn ${displayMode === 'analog' ? 'active' : ''}`} onClick={() => setDisplayMode('analog')} title="Klokke">
            <Clock size={18} />
          </button>
        </div>

        {/* Main Display Area */}
        <div className="main-display-area">
          <AnimatePresence mode="wait">
            {displayMode === 'text' && (
              <motion.div 
                key="text" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="text-display"
              >
                <div className="clock-display">{digitalTime}</div>
                <div className="event-info">
                  {!isSchoolTime ? (
                    <div className="event-name" style={{ color: 'var(--text-muted)' }}>
                      {isWeekend ? "Ingen skule i dag" : now < dayStart ? "Før skulestart" : "Skulen er slutt"}
                    </div>
                  ) : (
                    <>
                      <div className="event-name">
                        Til {nextEvent?.name.toLowerCase()} ({nextEvent?.time})
                      </div>
                      <div className={`countdown-display ${colorClass}`}>
                        {countdownText}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {displayMode === 'circle' && (
              <motion.div 
                key="circle"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="circle-display-container"
              >
                {!isSchoolTime ? (
                  <div className="event-name" style={{ color: 'var(--text-muted)' }}>
                    {isWeekend ? "Ingen skule i dag" : "Utanfor skuletid"}
                  </div>
                ) : (
                  <div className="circle-wrapper">
                    <svg viewBox="0 0 100 100" className="progress-circle">
                      <circle cx="50" cy="50" r="45" className="circle-bg" />
                      <circle 
                        cx="50" cy="50" r="45" 
                        className="circle-fill" 
                        style={{ 
                          strokeDasharray: circumference, 
                          strokeDashoffset: strokeDashoffset,
                          stroke: strokeColor 
                        }} 
                      />
                    </svg>
                    <div className="circle-content">
                      <div className={`circle-countdown ${colorClass}`}>{countdownText}</div>
                      <div className="circle-event">Til {nextEvent?.name.toLowerCase()}</div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {displayMode === 'analog' && (
              <motion.div 
                key="analog"
                initial={{ opacity: 0, rotate: -10 }} 
                animate={{ opacity: 1, rotate: 0 }} 
                exit={{ opacity: 0, rotate: 10 }}
                className="analog-display-container"
              >
                <div className="analog-wrapper">
                  <svg className="analog-clock" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" className="clock-face" />
                    {[...Array(12)].map((_, i) => (
                      <line key={i} x1="50" y1="4" x2="50" y2="10" className="clock-mark" transform={`rotate(${i * 30} 50 50)`} />
                    ))}
                    {/* Hour Hand */}
                    <line x1="50" y1="50" x2="50" y2="25" className="hour-hand" transform={`rotate(${now.getHours() * 30 + now.getMinutes() * 0.5} 50 50)`} />
                    {/* Minute Hand */}
                    <line x1="50" y1="50" x2="50" y2="15" className="minute-hand" transform={`rotate(${now.getMinutes() * 6 + now.getSeconds() * 0.1} 50 50)`} />
                    {/* Second Hand */}
                    <line x1="50" y1="50" x2="50" y2="10" className="second-hand" transform={`rotate(${now.getSeconds() * 6} 50 50)`} />
                    <circle cx="50" cy="50" r="3" className="center-dot" />
                  </svg>
                </div>
                {isSchoolTime ? (
                  <div className="event-info-small">
                    <div className="event-name-small">Til {nextEvent?.name.toLowerCase()}</div>
                    <div className={`countdown-small ${colorClass}`}>{countdownText}</div>
                  </div>
                ) : (
                  <div className="event-name-small" style={{ color: 'var(--text-muted)' }}>
                    {isWeekend ? "Ingen skule i dag" : "Utanfor skuletid"}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Progress Section */}
        <div className="progress-container">
          <div className="progress-label">
            <span>{startTimeStr}</span>
            <span>Skuledag fremdrift</span>
            <span>{endTimeStr}</span>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* AI Tip Section */}
        {aiTip && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="ai-tip-container"
          >
            <div className="ai-tip-header">
              <Sparkles size={14} />
              <span>Gemini Tips</span>
            </div>
            <div className="ai-tip-content">{aiTip}</div>
          </motion.div>
        )}

      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <motion.div 
              className="modal-content" 
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <div className="modal-header">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings size={20} /> Innstillingar
                </h2>
                <button className="icon-btn" onClick={() => setShowSettings(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="modal-body">
                {/* Theme Section */}
                <div className="settings-section">
                  <div className="settings-section-title">Tema</div>
                  <div className="theme-grid">
                    {THEMES.map(t => (
                      <div 
                        key={t.id}
                        className={`theme-option ${theme === t.id ? 'active' : ''}`}
                        style={{ background: t.color }}
                        onClick={() => setTheme(t.id)}
                        title={t.name}
                      >
                        {theme === t.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <span className="text-white text-xs font-bold">VALT</span>
                          </div>
                        )}
                        <div className="absolute bottom-1 left-2 text-[10px] font-bold text-gray-500 mix-blend-difference">
                          {t.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Normal Schedule Section */}
                <div className="settings-section">
                  <div className="flex justify-between items-center">
                    <div className="settings-section-title">Måndag - Torsdag</div>
                    <button className="text-xs font-bold text-accent flex items-center gap-1" onClick={() => handleAddScheduleItem('normal')}>
                      <Plus size={14} /> LEGG TIL
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {normalSchedule.map(item => (
                      <div key={item.id} className="schedule-item">
                        <input 
                          type="time" 
                          value={item.time} 
                          onChange={e => handleUpdateScheduleItem('normal', item.id, 'time', e.target.value)}
                          className="w-20"
                        />
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={e => handleUpdateScheduleItem('normal', item.id, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <button className="text-danger p-1" onClick={() => handleRemoveScheduleItem('normal', item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Friday Schedule Section */}
                <div className="settings-section">
                  <div className="flex justify-between items-center">
                    <div className="settings-section-title">Fredag</div>
                    <button className="text-xs font-bold text-accent flex items-center gap-1" onClick={() => handleAddScheduleItem('friday')}>
                      <Plus size={14} /> LEGG TIL
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {fridaySchedule.map(item => (
                      <div key={item.id} className="schedule-item">
                        <input 
                          type="time" 
                          value={item.time} 
                          onChange={e => handleUpdateScheduleItem('friday', item.id, 'time', e.target.value)}
                          className="w-20"
                        />
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={e => handleUpdateScheduleItem('friday', item.id, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <button className="text-danger p-1" onClick={() => handleRemoveScheduleItem('friday', item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-footer">
                <button className="btn btn-primary flex-1" onClick={() => setShowSettings(false)}>
                  <Save size={18} /> LAGRE ENDRINGAR
                </button>
                <button className="btn btn-secondary" onClick={handleResetSchedule}>
                  <RotateCcw size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
