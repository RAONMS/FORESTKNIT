import { supabase } from './supabase';

export const countScheduledSessions = (schedule = [], enrollmentId) =>
  schedule.filter((item) => item.enrollment_id === enrollmentId && item.status === 'scheduled').length;

export const countConsumedSessions = (schedule = [], enrollmentId) =>
  schedule.filter((item) => item.enrollment_id === enrollmentId && item.status === 'attended').length;

export const generateScheduleEntries = ({ studentId, enrollmentId, totalSessions, time, scheduleDays }) => {
  if (!scheduleDays || scheduleDays.length === 0) {
    return [];
  }

  const dayMap = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
  const targetDays = scheduleDays.map((day) => dayMap[day]).filter((day) => day !== undefined);
  const [hourText = '10', minuteText = '00'] = (time || '10:00').split(':');
  const hour = parseInt(hourText, 10);
  const minute = parseInt(minuteText, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries = [];

  for (let i = 0; i < 90; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    if (targetDays.includes(date.getDay())) {
      date.setHours(hour, minute, 0, 0);
      entries.push({
        student_id: studentId,
        enrollment_id: enrollmentId,
        scheduled_at: date.toISOString(),
        status: 'scheduled',
      });
    }

    if (entries.length >= totalSessions) {
      break;
    }
  }

  return entries;
};

export const maybeAutoRenewEnrollment = async (enrollment) => {
  if (!enrollment?.renew_on_completion) {
    return { renewed: false };
  }

  const { data: existingSchedule, error: scheduleError } = await supabase
    .from('schedule')
    .select('id, scheduled_at, status')
    .eq('enrollment_id', enrollment.id)
    .order('scheduled_at', { ascending: true });

  if (scheduleError) {
    throw scheduleError;
  }

  const remainingScheduled = (existingSchedule || []).filter((item) => item.status === 'scheduled').length;
  if (remainingScheduled > 0) {
    return { renewed: false };
  }

  const totalSessions = enrollment.sessions_total || enrollment.classes?.total_sessions || 0;
  const newEntries = generateScheduleEntries({
    studentId: enrollment.student_id,
    enrollmentId: enrollment.id,
    totalSessions,
    time: enrollment.preferred_time,
    scheduleDays: enrollment.schedule_days,
  });

  if (newEntries.length > 0) {
    const { error: insertError } = await supabase.from('schedule').insert(newEntries);
    if (insertError) {
      throw insertError;
    }
  }

  const { error: updateError } = await supabase
    .from('enrollments')
    .update({
      renew_on_completion: false,
      sessions_left: totalSessions,
    })
    .eq('id', enrollment.id);

  if (updateError) {
    throw updateError;
  }

  return { renewed: true };
};
