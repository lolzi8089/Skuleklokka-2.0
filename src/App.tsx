import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Moon, Sun, Clock, Circle, Type, Users, Sparkles } from 'lucide-react';
import { isFirebaseConfigured, database, ref, onValue, onDisconnect, set, push, remove } from './firebase';
import { isGeminiConfigured, getBreakTip } from './gemini';

const normalSchedule = [
  { time: "08:15", name: "Skulestart" },
  { time: "09:00", name: "Andre time" },
  { time: "09:45", name: "Friminutt" },
  { time: "10:00", name: "Tredje time" },
  { time: "10:45", name: "Matpause" },
  { time: "11:05", name: "Friminutt" },
  { time: "11:35", name: "Fjerde time" },
  { time: "12:20", name: "Femte time" },
  { time: "13:05", name: "Friminutt" },
  { time: "13:15", name: "Sjette time" },
  { time: "14:00", name: "Skuleslutt" }
];

const fridaySchedule = [
  { time: "08:15", name: "Skulestart" },
  { time: "09:00", name: "Andre time" },
  { time: "09:45", name: "Friminutt" },
  { time: "10:00", name: "Tredje time" },
  { time: "10:45", name: "Matpause" },
  { time: "11:05", name: "Friminutt" },
  { time: "11:35", name: "Fjerde time" },
  { time: "12:20", name: "Femte time" },
  { time: "13:05", name: "Skuleslutt" }
];

const parseTime = (timeStr: string, baseDate: Date) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Extracted for TS usage
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const playChime = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

export default function App() {
  const [now, setNow] = useState(new Date());
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [displayMode, setDisplayMode] = useState('text'); // 'text', 'circle', 'analog'
  const [viewersCount, setViewersCount] = useState(0);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const lastEventTriggered = useRef<string | null>(null);
  const lastTipEvent = useRef<string | null>(null);

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
      if (myUserRef) {
        remove(myUserRef);
      }
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;
  const activeSchedule = isFriday ? fridaySchedule : normalSchedule;
  const endTimeStr = isFriday ? "13:05" : "14:00";

  const dayStart = parseTime("08:15", now);
  const dayEnd = parseTime(endTimeStr, now);
  
  let isSchoolTime = !isWeekend && now >= dayStart && now < dayEnd;
  let nextEvent: any = null;
  let eventIndex = -1;

  if (isSchoolTime) {
    for (let i = 0; i < activeSchedule.length; i++) {
      const eventTime = parseTime(activeSchedule[i].time, now);
      if (now < eventTime) {
        nextEvent = activeSchedule[i];
        eventIndex = i;
        break;
      }
    }
  } else if (now < dayStart && now.getHours() >= 0) {
    isSchoolTime = false;
  }

  useEffect(() => {
    if (isSchoolTime && nextEvent) {
      if (lastEventTriggered.current !== null && lastEventTriggered.current !== nextEvent.time) {
        if (soundEnabled) {
          playChime();
        }
      }
      
      // AI Tip logic
      if (isGeminiConfigured && (nextEvent.name.toLowerCase().includes('friminutt') || nextEvent.name.toLowerCase().includes('matpause'))) {
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

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
      currentEventStartTime = parseTime(activeSchedule[eventIndex - 1].time, now);
    }
    
    const eventDuration = (target.getTime() - currentEventStartTime.getTime()) / 1000;
    const eventElapsed = (now.getTime() - currentEventStartTime.getTime()) / 1000;
    
    circlePercent = Math.max(0, 1 - (eventElapsed / eventDuration));
  }

  const totalSchoolSeconds = (dayEnd.getTime() - dayStart.getTime()) / 1000;
  const elapsedSchoolSeconds = isSchoolTime ? Math.max(0, (now.getTime() - dayStart.getTime()) / 1000) : (now >= dayEnd ? totalSchoolSeconds : 0);
  const progressPercent = isSchoolTime ? (elapsedSchoolSeconds / totalSchoolSeconds) * 100 : (now >= dayEnd ? 100 : 0);

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

  return (
    <div className="app-container">
      <div className="glass-panel">
        
        <div className="header">
          <div className="title">Skuleklokke</div>
          
          {isFirebaseConfigured && (
            <div className="viewers-count" title="Antall personar inne akkurat no">
              <Users size={16} />
              <span>{viewersCount}</span>
            </div>
          )}

          <div className="theme-switch">
            <button 
              className="volume-toggle" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Lyd på" : "Lyd av"}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <Sun size={18} className="text-muted" />
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isDark} 
                onChange={(e) => setIsDark(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
            <Moon size={18} className="text-muted" />
          </div>
        </div>

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

        <div className="main-display-area">
          {displayMode === 'text' && (
            <div className="text-display">
              <div className="clock-display">{formatTime(now)}</div>
              <div className="event-info">
                {!isSchoolTime ? (
                  <div className="event-name" style={{ color: 'var(--text-muted)' }}>
                    {isWeekend ? "Ingen skule i dag" : "Utanfor skuletid"}
                  </div>
                ) : (
                  <>
                    <div className="event-name">
                      Til {nextEvent.name.toLowerCase()} ({nextEvent.time})
                    </div>
                    <div className={`countdown-display ${colorClass}`}>
                      {countdownText}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {displayMode === 'circle' && (
            <div className="circle-display-container">
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
                    <div className="circle-event">Til {nextEvent.name.toLowerCase()}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {displayMode === 'analog' && (
            <div className="analog-display-container">
              <div className="analog-wrapper">
                <svg className="analog-clock" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" className="clock-face" />
                  {[...Array(12)].map((_, i) => (
                    <line key={i} x1="50" y1="4" x2="50" y2="10" className="clock-mark" transform={`rotate(${i * 30} 50 50)`} />
                  ))}
                  <line x1="50" y1="50" x2="50" y2="25" className="hour-hand" transform={`rotate(${now.getHours() * 30 + now.getMinutes() * 0.5} 50 50)`} />
                  <line x1="50" y1="50" x2="50" y2="15" className="minute-hand" transform={`rotate(${now.getMinutes() * 6 + now.getSeconds() * 0.1} 50 50)`} />
                  <line x1="50" y1="50" x2="50" y2="10" className="second-hand" transform={`rotate(${now.getSeconds() * 6} 50 50)`} />
                  <circle cx="50" cy="50" r="3" className="center-dot" />
                </svg>
              </div>
              {isSchoolTime ? (
                <div className="event-info-small">
                  <div className="event-name-small">Til {nextEvent.name.toLowerCase()}</div>
                  <div className={`countdown-small ${colorClass}`}>{countdownText}</div>
                </div>
              ) : (
                <div className="event-name-small" style={{ color: 'var(--text-muted)' }}>
                  {isWeekend ? "Ingen skule i dag" : "Utanfor skuletid"}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="progress-container">
          <div className="progress-label">
            <span>08:15</span>
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
        {aiTip && (
          <div className="ai-tip-container">
            <div className="ai-tip-header">
              <Sparkles size={14} />
              <span>Gemini Tips</span>
            </div>
            <div className="ai-tip-content">{aiTip}</div>
          </div>
        )}

      </div>
    </div>
  );
}
