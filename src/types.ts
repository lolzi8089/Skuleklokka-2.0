export interface Period {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  type: 'lesson' | 'break' | 'lunch';
}

export interface DaySchedule {
  day: number; // 0-6 (Sun-Sat)
  periods: Period[];
}
