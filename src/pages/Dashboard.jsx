import React, { useEffect, useState } from 'react';
import { format, endOfDay, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertCircle, Calendar as CalendarIcon, ChevronRight, Clock, Info, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPostpone, setShowPostpone] = useState(false);
  const [postponeForm, setPostponeForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    adjustType: 'temp',
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: false,
  });

  useEffect(() => {
    fetchTodaySchedule();
  }, []);

  const fetchTodaySchedule = async () => {
    setLoading(true);
    setError('');

    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    const { data, error: fetchError } = await supabase
      .from('schedule')
      .select(`
        *,
        students (*),
        enrollments (
          *,
          classes (*)
        )
      `)
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error(fetchError);
      setTodaySchedule([]);
      setError('오늘 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } else {
      setTodaySchedule(data || []);
    }

    setLoading(false);
  };

  const openPostponeModal = () => {
    if (!selectedStudent) return;

    setPostponeForm({
      date: format(new Date(selectedStudent.scheduled_at), 'yyyy-MM-dd'),
      adjustType: 'temp',
    });
    setShowPostpone(true);
  };

  const handlePostpone = async () => {
    if (!selectedStudent || !postponeForm.date) {
      return;
    }

    const currentTime = format(new Date(selectedStudent.scheduled_at), 'HH:mm');
    const scheduledAt = new Date(`${postponeForm.date}T${currentTime}:00`);

    const { error: updateError } = await supabase
      .from('schedule')
      .update({
        scheduled_at: scheduledAt.toISOString(),
        status: 'postponed',
        is_permanent_change: postponeForm.adjustType === 'perm',
      })
      .eq('id', selectedStudent.id);

    if (updateError) {
      console.error(updateError);
      setConfirmModal({
        isOpen: true,
        title: '오류',
        message: '일정 변경에 실패했습니다. 다시 시도해주세요.',
        isDanger: true,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '성공',
      message: '일정이 연기되었습니다.',
      isDanger: false,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setShowPostpone(false);
        setSelectedStudent(null);
        fetchTodaySchedule();
      },
    });
  };

  return (
    <div className="page-shell">
      <section className="glass-panel hero-panel" style={{ marginBottom: '28px' }}>
        <header className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="brand-mark">Today</div>
            <h1 className="page-title" style={{ marginTop: '14px' }}>오늘의 타임라인</h1>
            <p className="page-subtitle">
              {format(new Date(), 'yyyy년 MM월 dd일 (eeee)', { locale: ko })}의 수업 흐름을 한눈에 확인하고 필요한 조정을 빠르게 진행하세요.
            </p>
          </div>
          <div className="status-pill neutral">
            <CalendarIcon size={14} />
            예정 수업 {todaySchedule.length}건
          </div>
        </header>
      </section>

      {error ? (
        <div className="card" style={{ marginBottom: '18px', color: 'var(--danger)' }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="muted">데이터를 동기화 중입니다...</p>
      ) : todaySchedule.length === 0 ? (
        <div className="empty-state glass-panel">
          <CalendarIcon size={40} style={{ color: 'var(--text-soft)', marginBottom: '1.2rem' }} />
          <p>오늘 준비된 수업 일정이 없습니다.</p>
        </div>
      ) : (
        <div className="section-grid">
          {todaySchedule.map((item) => (
            <div
              key={item.id}
              className="card card-interactive fade-up"
              onClick={() => setSelectedStudent(item)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: '18px',
                cursor: 'pointer',
              }}
            >
              <div style={{
                backgroundColor: 'var(--bg-accent-soft)',
                padding: '0.9rem',
                borderRadius: '18px',
                color: 'var(--bg-accent-deep)',
              }}>
                <User size={20} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.08rem', marginBottom: '0.2rem', fontWeight: 700 }}>{item.students?.name || '이름 없음'}</h3>
                <p className="muted" style={{ fontSize: '0.9rem' }}>
                  {item.enrollments?.classes?.name || '일반 수업'}
                </p>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--bg-accent-deep)' }}>
                    <Clock size={14} />
                    {format(new Date(item.scheduled_at), 'HH:mm')}
                  </div>
                  <span className={`status-pill ${item.status === 'attended' ? '' : 'neutral'}`}>
                    {item.status === 'attended' ? '출석 완료' : '예정'}
                  </span>
                </div>
                <ChevronRight size={18} color="var(--text-soft)" />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedStudent ? (
        <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => setSelectedStudent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
              <Info size={24} color="var(--bg-accent-deep)" />
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>수강생 프로필</h2>
            </div>

            <div style={{ marginBottom: '2rem', display: 'grid', gap: '1.2rem' }}>
              <div>
                <p className="field-label">대상자</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.5rem' }}>{selectedStudent.students?.name || '-'}</p>
              </div>
              <div>
                <p className="field-label">연락처</p>
                <p style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.5rem' }}>{selectedStudent.students?.phone || '-'}</p>
              </div>
              <div>
                <p className="field-label">현재 클래스</p>
                <p style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.5rem' }}>{selectedStudent.enrollments?.classes?.name || '미지정'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={openPostponeModal}>
                일정 조정
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setSelectedStudent(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPostpone ? (
        <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowPostpone(false)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '2rem', fontSize: '1.2rem', fontWeight: 800 }}>언제 수업을 진행할까요?</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="field-label">조정 날짜 선택</label>
              <input
                type="date"
                value={postponeForm.date}
                onChange={(e) => setPostponeForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <p className="field-label" style={{ marginBottom: '1rem' }}>변경 성격</p>
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {[
                  { value: 'temp', label: '일회성 변경' },
                  { value: 'perm', label: '고정 수업 요일 변경' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      borderColor: postponeForm.adjustType === option.value ? 'var(--border-strong)' : 'var(--border-soft)',
                    }}
                  >
                    <input
                      type="radio"
                      name="adjustType"
                      value={option.value}
                      checked={postponeForm.adjustType === option.value}
                      onChange={(e) => setPostponeForm(prev => ({ ...prev, adjustType: e.target.value }))}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handlePostpone}>
                완료
              </button>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowPostpone(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal.isOpen ? (
        <div className="modal-backdrop" style={{ zIndex: 1200 }} onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-card" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '1.5rem', color: confirmModal.isDanger ? 'var(--danger)' : 'var(--bg-accent-deep)' }}>
              <AlertCircle size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>{confirmModal.title}</h2>
            <p className="muted" style={{ fontSize: '0.92rem', marginBottom: '2rem' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={confirmModal.onConfirm}
                className="btn-primary"
                style={{ flex: 1, background: confirmModal.isDanger ? 'linear-gradient(135deg, #d86b59 0%, #b64d3d 100%)' : undefined }}
              >
                확인
              </button>
              {!confirmModal.title.includes('성공') && !confirmModal.title.includes('알림') ? (
                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="btn-ghost" style={{ flex: 1 }}>
                  취소
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
