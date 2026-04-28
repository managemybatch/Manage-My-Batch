export interface Holiday {
  date: string;
  name: string;
  nameBn: string;
  type: string;
}

export const BANGLADESH_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-02-21', name: 'Shaheed Day & International Mother Language Day', nameBn: 'শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস', type: 'Public' },
  { date: '2026-03-17', name: "Sheikh Mujibur Rahman's Birthday", nameBn: 'শেখ মুজিবুর রহমান-এর জন্মদিন', type: 'Public' },
  { date: '2026-03-20', name: 'Eid-ul-Fitr*', nameBn: 'ঈদুল ফিতর*', type: 'Islamic' },
  { date: '2026-03-21', name: 'Eid-ul-Fitr Holiday*', nameBn: 'ঈদুল ফিতরের ছুটি*', type: 'Islamic' },
  { date: '2026-03-22', name: 'Eid-ul-Fitr Holiday*', nameBn: 'ঈদুল ফিতরের ছুটি*', type: 'Islamic' },
  { date: '2026-03-26', name: 'Independence Day', nameBn: 'স্বাধীনতা দিবস', type: 'Public' },
  { date: '2026-04-14', name: 'Bengali New Year', nameBn: 'পহেলা বৈশাখ', type: 'Public' },
  { date: '2026-05-01', name: 'May Day', nameBn: 'মে দিবস', type: 'Public' },
  { date: '2026-05-27', name: 'Eid-ul-Adha*', nameBn: 'ঈদুল আযহা*', type: 'Islamic' },
  { date: '2026-05-28', name: 'Eid-ul-Adha Holiday*', nameBn: 'ঈদুল আযহার ছুটি*', type: 'Islamic' },
  { date: '2026-05-29', name: 'Eid-ul-Adha Holiday*', nameBn: 'ঈদুল আযহার ছুটি*', type: 'Islamic' },
  { date: '2026-07-25', name: 'Ashura*', nameBn: 'আশুরা*', type: 'Islamic' },
  { date: '2026-08-15', name: 'National Mourning Day', nameBn: 'জাতীয় শোক দিবস', type: 'Public' },
  { date: '2026-08-25', name: 'Eid-e-Miladunnabi*', nameBn: 'ঈদে মিলাদুন্নবী*', type: 'Islamic' },
  { date: '2026-09-03', name: 'Janmashtami', nameBn: 'জন্মাষ্টমী', type: 'Public' },
  { date: '2026-10-19', name: 'Durga Puja (Dashami)', nameBn: 'দুর্গাপূজা (বিজয়ী দশমী)', type: 'Public' },
  { date: '2026-12-16', name: 'Victory Day', nameBn: 'বিজয় দিবস', type: 'Public' },
  { date: '2026-12-25', name: 'Christmas Day', nameBn: 'বড় দিন', type: 'Public' }
];

export function getUpcomingHolidays(count = 5): Holiday[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return BANGLADESH_HOLIDAYS_2026
    .filter(h => new Date(h.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, count);
}

export function getHolidayForDate(date: Date): Holiday | undefined {
  const dateStr = date.toISOString().split('T')[0];
  return BANGLADESH_HOLIDAYS_2026.find(h => h.date === dateStr);
}
