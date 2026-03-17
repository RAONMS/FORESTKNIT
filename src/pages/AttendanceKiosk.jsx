import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AttendanceKiosk = () => {
  const [currentStudents, setCurrentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchIncomingStudents();
    const interval = setInterval(fetchIncomingStudents, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchIncomingStudents = async () => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

      await supabase
        .from('schedule')
        .update({ status: 'absent' })
        .eq('status', 'scheduled')
        .lt('scheduled_at', oneHourAgo);

      const { data, error } = await supabase
        .from('schedule')
        .select('*, students(*)')
        .eq('status', 'scheduled')
        .gte('scheduled_at', oneHourAgo)
        .lte('scheduled_at', tenMinutesFromNow)
        .order('scheduled_at');

      if (error) {
        throw error;
      }

      setCurrentStudents(data || []);
    } catch (error) {
      console.error('Error in fetchIncomingStudents:', error);
      setCurrentStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (item) => {
    if (processingId === item.id) {
      return;
    }

    setProcessingId(item.id);

    try {
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('schedule_id', item.id)
        .limit(1);

      if (!existingAttendance || existingAttendance.length === 0) {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{ student_id: item.student_id, schedule_id: item.id }]);

        if (insertError) {
          throw insertError;
        }
      }

      const { error: updateError } = await supabase
        .from('schedule')
        .update({ status: 'attended' })
        .eq('id', item.id);

      if (updateError) {
        throw updateError;
      }

      setShowSuccess(item.students?.name || '수강생');
      fetchIncomingStudents();
      setTimeout(() => setShowSuccess(null), 2500);
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="kiosk-shell">
      <div className="page-shell" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', gap: '28px', justifyContent: 'space-between' }}>
        <section className="glass-panel hero-panel" style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ margin: '0 auto', width: 'fit-content' }}>Self Check-In</div>
          <div className="kiosk-clock" style={{ marginTop: '18px' }}>
            {format(currentTime, 'HH:mm')}
          </div>
          <p className="page-subtitle" style={{ margin: '8px auto 0', textAlign: 'center' }}>
            {format(currentTime, 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
          </p>
        </section>

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '18px',
          flex: 1,
          alignContent: 'start',
        }}>
          {loading ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '56px 24px' }}>
              <p className="muted">수강 정보를 동기화 중입니다...</p>
            </div>
          ) : currentStudents.length === 0 ? (
            <div className="empty-state glass-panel" style={{ gridColumn: '1 / -1' }}>
              현재 체크인 가능한 수강 일정이 없습니다.
            </div>
          ) : currentStudents.map((item) => (
            <button
              key={item.id}
              onClick={() => handleCheckIn(item)}
              className="card card-interactive fade-up"
              disabled={processingId === item.id}
              style={{
                minHeight: '210px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                textAlign: 'center',
              }}
            >
              <div style={{
                backgroundColor: 'var(--bg-accent-soft)',
                padding: '0.95rem',
                borderRadius: '999px',
                color: 'var(--bg-accent-deep)',
              }}>
                <User size={24} />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{item.students?.name}</div>
              <div className="status-pill">{format(new Date(item.scheduled_at), 'HH:mm')}</div>
              <div className="muted" style={{ fontSize: '0.86rem' }}>
                {processingId === item.id ? '체크인 처리 중...' : '터치하여 출석 체크'}
              </div>
            </button>
          ))}
        </section>

        <footer style={{ textAlign: 'center', paddingBottom: '8px' }}>
          <h1 style={{
            fontFamily: '"Manrope", "Noto Sans KR", sans-serif',
            fontSize: '1.1rem',
            fontWeight: 800,
            letterSpacing: '-0.06em',
            color: 'var(--bg-accent-deep)',
            opacity: 0.7,
          }}>
            포레스트 니트
          </h1>
        </footer>
      </div>

      {showSuccess ? (
        <div className="modal-backdrop" style={{ zIndex: 1000, background: 'rgba(24, 33, 29, 0.18)' }}>
          <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <CheckCircle2 size={72} color="var(--bg-accent-deep)" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.06em' }}>{showSuccess}님</h2>
            <p className="page-subtitle" style={{ textAlign: 'center', marginTop: '10px' }}>
              체크인이 완료되었습니다. 편안한 시간 되세요.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AttendanceKiosk;
