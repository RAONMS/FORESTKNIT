import React, { useEffect, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Schedule = () => {
  const [view, setView] = useState('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, [currentDate, view]);

  const fetchSchedules = async () => {
    setLoading(true);
    setError('');

    let start;
    let end;

    if (view === 'weekly') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      start = startOfDay(weekStart).toISOString();
      end = endOfDay(addDays(weekStart, 5)).toISOString();
    } else {
      start = startOfDay(startOfMonth(currentDate)).toISOString();
      end = endOfDay(endOfMonth(currentDate)).toISOString();
    }

    const { data, error: fetchError } = await supabase
      .from('schedule')
      .select(`
        *,
        students (name),
        enrollments (
          preferred_time,
          classes (name)
        )
      `)
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error(fetchError);
      setSchedules([]);
      setError('일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } else {
      setSchedules(data || []);
    }

    setLoading(false);
  };

  const days = ['월', '화', '수', '목', '금', '토'];
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const movePrev = () => {
    setCurrentDate(view === 'weekly' ? addDays(currentDate, -7) : subMonths(currentDate, 1));
  };

  const moveNext = () => {
    setCurrentDate(view === 'weekly' ? addDays(currentDate, 7) : addMonths(currentDate, 1));
  };

  const renderHeader = () => {
    const title = view === 'weekly'
      ? `${format(weekStart, 'yyyy.MM.dd')} - ${format(addDays(weekStart, 5), 'yyyy.MM.dd')}`
      : format(currentDate, 'yyyy년 MM월', { locale: ko });

    return (
      <section className="glass-panel hero-panel" style={{ marginBottom: '28px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="brand-mark">Schedule</div>
            <h1 className="page-title" style={{ marginTop: '14px' }}>{view === 'weekly' ? '주간 일정' : '월간 일정'}</h1>
            <p className="page-subtitle">{title}</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '6px', borderRadius: '999px' }}>
              {['weekly', 'monthly'].map((option) => (
                <button
                  key={option}
                  onClick={() => setView(option)}
                  className={view === option ? 'btn-primary' : 'btn-ghost'}
                  style={{
                    padding: '0.72rem 1rem',
                    minWidth: '92px',
                    fontSize: '0.88rem',
                    boxShadow: 'none',
                  }}
                >
                  {option === 'weekly' ? '주간' : '월간'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={movePrev} className="btn-ghost" style={{ padding: '0.9rem' }}>
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="btn-secondary">
                오늘
              </button>
              <button onClick={moveNext} className="btn-ghost" style={{ padding: '0.9rem' }}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderWeeklyGrid = () => {
    const hours = Array.from({ length: 13 }, (_, index) => index + 9);

    return (
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, minmax(140px, 1fr))', background: 'rgba(255,255,255,0.48)' }}>
          <div style={{ height: '68px' }} />
          {days.map((day, index) => {
            const date = addDays(weekStart, index);
            const isToday = isSameDay(date, new Date());

            return (
              <div
                key={day}
                style={{
                  height: '68px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderLeft: '1px solid rgba(24,33,29,0.06)',
                  background: isToday ? 'rgba(31, 107, 82, 0.08)' : 'transparent',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isToday ? 'var(--bg-accent-deep)' : 'var(--text-soft)' }}>{day}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{format(date, 'd')}</span>
              </div>
            );
          })}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, minmax(140px, 1fr))' }}>
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div style={{
                  minHeight: '88px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--text-soft)',
                  borderTop: '1px solid rgba(24,33,29,0.06)',
                }}>
                  {`${hour}:00`}
                </div>

                {days.map((_, dayIndex) => {
                  const day = addDays(weekStart, dayIndex);
                  const daySchedules = schedules.filter((schedule) => {
                    const scheduleDate = parseISO(schedule.scheduled_at);
                    return isSameDay(scheduleDate, day) && scheduleDate.getHours() === hour;
                  });

                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      style={{
                        minHeight: '88px',
                        borderTop: '1px solid rgba(24,33,29,0.06)',
                        borderLeft: '1px solid rgba(24,33,29,0.06)',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="card"
                          style={{
                            padding: '10px',
                            borderRadius: '16px',
                            borderLeft: '4px solid var(--bg-accent-strong)',
                            gap: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 800, fontSize: '0.78rem' }}>
                            <span>{schedule.students?.name}</span>
                            <span className="muted" style={{ fontSize: '0.68rem' }}>{format(parseISO(schedule.scheduled_at), 'HH:mm')}</span>
                          </div>
                          <div style={{ color: 'var(--bg-accent-deep)', fontWeight: 700, fontSize: '0.72rem' }}>
                            {schedule.enrollments?.classes?.name || '클래스 미지정'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const emptyDays = monthStart.getDay();

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '12px' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((label, index) => (
          <div key={label} style={{ textAlign: 'center', fontSize: '0.76rem', fontWeight: 800, color: index === 0 ? 'var(--danger)' : 'var(--text-soft)' }}>
            {label}
          </div>
        ))}

        {Array.from({ length: emptyDays }).map((_, index) => <div key={`empty-${index}`} />)}

        {daysInMonth.map((day) => {
          const isToday = isSameDay(day, new Date());
          const daySchedules = schedules.filter((schedule) => isSameDay(parseISO(schedule.scheduled_at), day));

          return (
            <div
              key={day.toISOString()}
              className="card"
              style={{
                minHeight: '140px',
                padding: '12px',
                background: isToday ? 'linear-gradient(180deg, rgba(31, 107, 82, 0.12) 0%, rgba(255,255,255,0.9) 100%)' : undefined,
                borderColor: isToday ? 'var(--border-strong)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '1rem' }}>{format(day, 'd')}</strong>
                {isToday ? <span className="status-pill">Today</span> : null}
              </div>

              <div style={{ display: 'grid', gap: '6px' }}>
                {daySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '12px',
                      background: schedule.status === 'attended' ? 'rgba(31, 107, 82, 0.08)' : 'rgba(255,255,255,0.74)',
                      border: '1px solid rgba(24,33,29,0.06)',
                      fontSize: '0.72rem',
                      display: 'grid',
                      gap: '2px',
                    }}
                  >
                    <strong>{schedule.students?.name}</strong>
                    <span className="muted">{format(parseISO(schedule.scheduled_at), 'HH:mm')} · {schedule.enrollments?.classes?.name || '일반 수업'}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-shell">
      {renderHeader()}
      {error ? <div className="card" style={{ marginBottom: '18px', color: 'var(--danger)' }}>{error}</div> : null}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '72px 24px' }}>
          <p className="muted">데이터를 불러오는 중입니다...</p>
        </div>
      ) : view === 'weekly' ? renderWeeklyGrid() : renderMonthlyGrid()}
    </div>
  );
};

export default Schedule;
