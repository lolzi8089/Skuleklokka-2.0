import { DaySchedule } from './types';

export const DEFAULT_SCHEDULE: DaySchedule[] = [
  {
    day: 1, // Monday
    periods: [
      { id: '1', name: '1. Time', startTime: '08:30', endTime: '09:15', type: 'lesson' },
      { id: '2', name: '2. Time', startTime: '09:15', endTime: '10:00', type: 'lesson' },
      { id: 'b1', name: 'Friminutt', startTime: '10:00', endTime: '10:15', type: 'break' },
      { id: '3', name: '3. Time', startTime: '10:15', endTime: '11:00', type: 'lesson' },
      { id: '4', name: '4. Time', startTime: '11:00', endTime: '11:45', type: 'lesson' },
      { id: 'l', name: 'Storefri', startTime: '11:45', endTime: '12:30', type: 'lunch' },
      { id: '5', name: '5. Time', startTime: '12:30', endTime: '13:15', type: 'lesson' },
      { id: '6', name: '6. Time', startTime: '13:15', endTime: '14:00', type: 'lesson' },
      { id: 'b2', name: 'Friminutt', startTime: '14:00', endTime: '14:15', type: 'break' },
      { id: '7', name: '7. Time', startTime: '14:15', endTime: '15:00', type: 'lesson' },
    ]
  },
  // Repeat for Tue-Fri (mostly the same in Norwegian schools except maybe early finish on Fridays)
  {
    day: 2, // Tuesday
    periods: [
      { id: '1', name: '1. Time', startTime: '08:30', endTime: '09:15', type: 'lesson' },
      { id: '2', name: '2. Time', startTime: '09:15', endTime: '10:00', type: 'lesson' },
      { id: 'b1', name: 'Friminutt', startTime: '10:00', endTime: '10:15', type: 'break' },
      { id: '3', name: '3. Time', startTime: '10:15', endTime: '11:00', type: 'lesson' },
      { id: '4', name: '4. Time', startTime: '11:00', endTime: '11:45', type: 'lesson' },
      { id: 'l', name: 'Storefri', startTime: '11:45', endTime: '12:30', type: 'lunch' },
      { id: '5', name: '5. Time', startTime: '12:30', endTime: '13:15', type: 'lesson' },
      { id: '6', name: '6. Time', startTime: '13:15', endTime: '14:00', type: 'lesson' },
      { id: 'b2', name: 'Friminutt', startTime: '14:00', endTime: '14:15', type: 'break' },
      { id: '7', name: '7. Time', startTime: '14:15', endTime: '15:00', type: 'lesson' },
    ]
  },
  {
    day: 3, // Wednesday
    periods: [
      { id: '1', name: '1. Time', startTime: '08:30', endTime: '09:15', type: 'lesson' },
      { id: '2', name: '2. Time', startTime: '09:15', endTime: '10:00', type: 'lesson' },
      { id: 'b1', name: 'Friminutt', startTime: '10:00', endTime: '10:15', type: 'break' },
      { id: '3', name: '3. Time', startTime: '10:15', endTime: '11:00', type: 'lesson' },
      { id: '4', name: '4. Time', startTime: '11:00', endTime: '11:45', type: 'lesson' },
      { id: 'l', name: 'Storefri', startTime: '11:45', endTime: '12:30', type: 'lunch' },
      { id: '5', name: '5. Time', startTime: '12:30', endTime: '13:15', type: 'lesson' },
      { id: '6', name: '6. Time', startTime: '13:15', endTime: '14:00', type: 'lesson' },
    ]
  },
  {
    day: 4, // Thursday
    periods: [
      { id: '1', name: '1. Time', startTime: '08:30', endTime: '09:15', type: 'lesson' },
      { id: '2', name: '2. Time', startTime: '09:15', endTime: '10:00', type: 'lesson' },
      { id: 'b1', name: 'Friminutt', startTime: '10:00', endTime: '10:15', type: 'break' },
      { id: '3', name: '3. Time', startTime: '10:15', endTime: '11:00', type: 'lesson' },
      { id: '4', name: '4. Time', startTime: '11:00', endTime: '11:45', type: 'lesson' },
      { id: 'l', name: 'Storefri', startTime: '11:45', endTime: '12:30', type: 'lunch' },
      { id: '5', name: '5. Time', startTime: '12:30', endTime: '13:15', type: 'lesson' },
      { id: '6', name: '6. Time', startTime: '13:15', endTime: '14:00', type: 'lesson' },
      { id: 'b2', name: 'Friminutt', startTime: '14:00', endTime: '14:15', type: 'break' },
      { id: '7', name: '7. Time', startTime: '14:15', endTime: '15:00', type: 'lesson' },
    ]
  },
  {
    day: 5, // Friday
    periods: [
      { id: '1', name: '1. Time', startTime: '08:30', endTime: '09:15', type: 'lesson' },
      { id: '2', name: '2. Time', startTime: '09:15', endTime: '10:00', type: 'lesson' },
      { id: 'b1', name: 'Friminutt', startTime: '10:00', endTime: '10:15', type: 'break' },
      { id: '3', name: '3. Time', startTime: '10:15', endTime: '11:00', type: 'lesson' },
      { id: '4', name: '4. Time', startTime: '11:00', endTime: '11:45', type: 'lesson' },
      { id: 'l', name: 'Storefri', startTime: '11:45', endTime: '12:30', type: 'lunch' },
      { id: '5', name: '5. Time', startTime: '12:30', endTime: '13:15', type: 'lesson' },
      { id: '6', name: '6. Time', startTime: '13:15', endTime: '14:00', type: 'lesson' },
    ]
  }
];
