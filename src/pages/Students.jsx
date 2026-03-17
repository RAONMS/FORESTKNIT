import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, User, Phone, Calendar, Edit2, Trash2, X, Check, BookOpen, ChevronRight, Clock, AlertCircle } from 'lucide-react';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [enrollingStudent, setEnrollingStudent] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [selectedStudentForLog, setSelectedStudentForLog] = useState(null);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({ enrollmentId: '', date: '', time: '09:00', consumeSlot: true });
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: null,
    isDanger: false 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch students with their enrollments and classes
    // We also need to fetch their total schedule to calculate lessons left and last attended
    const { data: studentsData, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        enrollments (
          *,
          classes (*)
        ),
        schedule (*)
      `)
      .order('name');
    
    // Fetch all classes for the enrollment dropdown
    const { data: classesData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .order('name');

    if (!studentError) {
      // Calculate derived data
      const processed = studentsData.map(s => {
        const attendedDates = s.schedule
          .filter(sch => sch.status === 'attended')
          .map(sch => new Date(sch.scheduled_at))
          .sort((a, b) => b - a);
        
        return {
          ...s,
          lastAttended: attendedDates.length > 0 ? attendedDates[0].toLocaleDateString() : '기록 없음'
        };
      });
      setStudents(processed);
    }
    if (!classError) setClasses(classesData);
    setLoading(false);
  };

  const fetchAttendanceLog = async (student) => {
    setIsLogLoading(true);
    setSelectedStudentForLog(student);
    const { data, error } = await supabase
      .from('schedule')
      .select('*, enrollment:enrollments(classes(name))')
      .eq('student_id', student.id)
      .order('scheduled_at', { ascending: false });
    
    if (!error) {
      setAttendanceLog(data || []);
    }
    setIsLogLoading(false);
  };

  const handleAddManualSession = async (e) => {
    e.preventDefault();
    try {
      const scheduledAt = new Date(`${newSessionData.date}T${newSessionData.time}:00`).toISOString();
      
      // 0. Check for existing session at the same time
      const { data: existing, error: checkError } = await supabase
        .from('schedule')
        .select('id')
        .eq('student_id', selectedStudentForLog.id)
        .eq('scheduled_at', scheduledAt)
        .limit(1);
      
      if (checkError) {
        throw checkError;
      }

      if (existing && existing.length > 0) {
        alert('해당 시간에 이미 일정이 존재합니다.');
        return;
      }

      // 1. Add the new session
      const { error: insertError } = await supabase
        .from('schedule')
        .insert([{
          student_id: selectedStudentForLog.id,
          enrollment_id: newSessionData.enrollmentId,
          scheduled_at: scheduledAt,
          status: 'scheduled'
        }]);

      if (insertError) throw insertError;

      // 2. If "Consume Slot" is ticked, remove the last scheduled session
      if (newSessionData.consumeSlot) {
        const { data: futureSessions, error: fetchError } = await supabase
          .from('schedule')
          .select('id')
          .eq('enrollment_id', newSessionData.enrollmentId)
          .eq('status', 'scheduled')
          .neq('scheduled_at', scheduledAt) // Don't delete the one we just added
          .order('scheduled_at', { ascending: false })
          .limit(1);

        if (!fetchError && futureSessions && futureSessions.length > 0) {
          await supabase
            .from('schedule')
            .delete()
            .eq('id', futureSessions[0].id);
        }
      }

      setIsAddSessionModalOpen(false);
      fetchAttendanceLog(selectedStudentForLog);
      fetchData(); // Refresh main view
    } catch (err) {
      console.error('Error adding manual session:', err);
      alert('일정을 추가하는 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    setConfirmModal({
      isOpen: true,
      title: '일정 삭제',
      message: '이 일정을 삭제하시겠습니까? 출석 기록도 함께 삭제됩니다.',
      isDanger: true,
      onConfirm: async () => {
        try {
          // 1. Delete linked attendance
          await supabase.from('attendance').delete().eq('schedule_id', sessionId);
          
          // 2. Delete schedule entry
          const { error } = await supabase.from('schedule').delete().eq('id', sessionId);
          if (error) throw error;

          setAttendanceLog(prev => prev.filter(item => item.id !== sessionId));
          fetchData(); // Refresh main view to update counts
        } catch (err) {
          console.error(err);
          alert('일정 삭제 중 오류가 발생했습니다.');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleUpdateStatus = async (scheduleId, newStatus) => {
    const { error } = await supabase
      .from('schedule')
      .update({ status: newStatus })
      .eq('id', scheduleId);
    
    if (!error) {
      setAttendanceLog(prev => prev.map(item => 
        item.id === scheduleId ? { ...item, status: newStatus } : item
      ));
      fetchData(); // Refresh main view to update "lessons left"
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('students').insert([formData]);
    if (!error) {
      setIsAddModalOpen(false);
      setFormData({ name: '', phone: '' });
      fetchData();
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('students').update({
      name: editingStudent.name,
      phone: editingStudent.phone
    }).eq('id', editingStudent.id);

    if (!error) {
      setEditingStudent(null);
      fetchData();
    }
  };

  const handleDeleteStudent = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: '수강생 삭제',
      message: '정말 이 수강생 정보를 삭제하시겠습니까? 모든 수강 정보와 일정, 출석 기록이 영구적으로 삭제됩니다.',
      isDanger: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          // 1. Delete attendance
          const { error: attError } = await supabase.from('attendance').delete().eq('student_id', id);
          if (attError) throw attError;
          
          // 2. Delete schedule
          const { error: schError } = await supabase.from('schedule').delete().eq('student_id', id);
          if (schError) throw schError;
          
          // 3. Delete enrollments
          const { error: enrError } = await supabase.from('enrollments').delete().eq('student_id', id);
          if (enrError) throw enrError;
          
          // 4. Delete student
          const { error: stuError } = await supabase.from('students').delete().eq('id', id);
          if (stuError) throw stuError;
          
          fetchData();
        } catch (err) {
          console.error(err);
          alert(`수강생 삭제 중 오류가 발생했습니다: ${err.message}`);
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const generateSchedule = async (studentId, enrollmentId, targetClass, time) => {
    if (!targetClass.schedule_days || targetClass.schedule_days.length === 0) return true;

    const scheduleEntries = [];
    const dayMap = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
    const targetDays = targetClass.schedule_days.map(d => dayMap[d]);
    
    // Parse time
    const timeParts = (time || '10:00').split(':');
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1] || '0');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate for the next 8 weeks (or until total sessions)
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      if (targetDays.includes(date.getDay())) {
        date.setHours(hour, minute, 0, 0);
        scheduleEntries.push({
          student_id: studentId,
          enrollment_id: enrollmentId,
          scheduled_at: date.toISOString(),
          status: 'scheduled'
        });
        
        if (scheduleEntries.length >= (targetClass.total_sessions || 4)) break;
      }
    }

    if (scheduleEntries.length > 0) {
      const { error } = await supabase.from('schedule').insert(scheduleEntries);
      if (error) throw error;
    }
    return true;
  };

  const handleSyncSchedule = async (student, enrollment) => {
    try {
      setLoading(true);
      // Check if schedule already exists
      const { data: existing } = await supabase
        .from('schedule')
        .select('id')
        .eq('enrollment_id', enrollment.id);
      
      if (existing && existing.length > 0) {
        setConfirmModal({
          isOpen: true,
          title: '일정 중복 생성 확인',
          message: '이미 생성된 일정이 있습니다. 무시하고 추가로 생성하시겠습니까?',
          onConfirm: async () => {
            const targetClass = classes.find(c => c.id === enrollment.class_id);
            await generateSchedule(student.id, enrollment.id, targetClass, enrollment.preferred_time);
            alert('일정이 성공적으로 생성되었습니다.');
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            fetchData();
          }
        });
        setLoading(false);
        return;
      }

      const targetClass = classes.find(c => c.id === enrollment.class_id);
      await generateSchedule(student.id, enrollment.id, targetClass, enrollment.preferred_time);
      alert('일정이 성공적으로 생성되었습니다.');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(`일정 생성 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEnrollment = async (e) => {
    e.preventDefault();
    if (!selectedClassId || !enrollingStudent) return;

    try {
      const targetClass = classes.find(c => c.id === selectedClassId);
      
      // 1. Create the enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert([{
          student_id: enrollingStudent.id,
          class_id: selectedClassId,
          sessions_total: targetClass.total_sessions,
          sessions_left: targetClass.total_sessions,
          preferred_time: preferredTime
        }])
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // 2. Automatically generate schedule entries
      await generateSchedule(enrollingStudent.id, enrollment.id, targetClass, preferredTime);

      setEnrollingStudent(null);
      setSelectedClassId('');
      setPreferredTime('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(`수강 등록 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleRemoveEnrollment = async (enrollmentId) => {
    setConfirmModal({
      isOpen: true,
      title: '수강 정보 삭제',
      message: '이 클래스 수강 정보를 삭제하시겠습니까? 관련 수강 기록(출석부 등)이 모두 삭제됩니다.',
      isDanger: true,
      onConfirm: async () => {
        try {
          // 1. Get schedule IDs to clear attendance
          const { data: schedules, error: fetchError } = await supabase
            .from('schedule')
            .select('id')
            .eq('enrollment_id', enrollmentId);
          
          if (fetchError) throw fetchError;
          
          if (schedules && schedules.length > 0) {
            const scheduleIds = schedules.map(s => s.id);
            
            // 2. Delete linked attendance records first
            const { error: attendanceError } = await supabase
              .from('attendance')
              .delete()
              .in('schedule_id', scheduleIds);
            
            if (attendanceError) throw attendanceError;

            // 3. Delete linked schedule entries
            const { error: scheduleError } = await supabase
              .from('schedule')
              .delete()
              .in('id', scheduleIds);
            
            if (scheduleError) throw scheduleError;
          } else {
              await supabase.from('schedule').delete().eq('enrollment_id', enrollmentId);
          }

          // 4. Finally delete the enrollment
          const { error: enrollmentDeleteError } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
          if (enrollmentDeleteError) throw enrollmentDeleteError;

          fetchData();
        } catch (err) {
          console.error(err);
          alert(`삭제 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem', borderBottom: 'var(--border-thin)', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-dark)', letterSpacing: '-0.8px' }}>수강생 관리</h1>
        <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} />
          신규 등록
        </button>
      </header>
      
      <div className="card" style={{ 
        marginBottom: '2.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        padding: '0.8rem 1.2rem',
        border: 'var(--border-thin)',
        backgroundColor: 'rgba(255, 255, 255, 0.5)'
      }}>
        <Search size={18} color="var(--color-starbucks-green)" />
        <input 
          type="text" 
          placeholder="수강생 이름으로 검색..." 
          style={{ border: 'none', marginTop: 0, padding: 0, background: 'transparent', fontSize: '1rem', fontWeight: 500 }} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <p style={{ color: '#AAA' }}>로딩 중...</p>
        ) : filteredStudents.length === 0 ? (
          <p style={{ color: '#AAA', textAlign: 'center', gridColumn: '1 / -1', padding: '5rem' }}>수강생 정보가 없습니다.</p>
        ) : filteredStudents.map(s => (
          <div 
            key={s.id} 
            className="card" 
            style={{ 
              border: 'var(--border-thin)', 
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              padding: '1.8rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ backgroundColor: 'var(--color-starbucks-green-soft)', padding: '0.8rem', borderRadius: '12px', color: 'var(--color-starbucks-green)' }}>
                  <User size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{s.name}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>ID: {s.id.slice(0, 8)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => fetchAttendanceLog(s)}
                  title="출석 로그"
                  style={{ background: 'none', border: 'none', color: 'var(--color-starbucks-green)', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-starbucks-green-soft)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Calendar size={16} />
                </button>
                <button 
                  onClick={() => setEditingStudent(s)}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteStudent(s.id)}
                  style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', fontSize: '0.9rem', fontWeight: 500 }}>
                <Phone size={14} color="#9CA3AF" />
                {s.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Check size={14} color="var(--color-starbucks-green)" />
                최근 출석: {s.lastAttended}
              </div>
            </div>

            <div style={{ borderTop: 'var(--border-thin)', paddingTop: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>수강 중인 클래스</span>
                <button 
                  onClick={() => setEnrollingStudent(s)}
                  style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-starbucks-green)', background: 'var(--color-starbucks-green-soft)', padding: '4px 10px', borderRadius: '6px' }}
                >
                  + 추가
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {s.enrollments && s.enrollments.length > 0 ? (
                  s.enrollments.map(e => (
                    <div key={e.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '10px',
                      border: '1px solid #F3F4F6'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BookOpen size={14} color="var(--color-starbucks-green)" />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-dark)' }}>{e.classes?.name}</span>
                        </div>
                        {e.preferred_time && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '22px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} color="#9CA3AF" />
                              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>{e.preferred_time}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-starbucks-green)' }}>
                              {(s.schedule || []).filter(sch => sch.enrollment_id === e.id && sch.status === 'scheduled').length}회 남음
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleSyncSchedule(s, e)}
                          title="일정 동기화"
                          style={{ color: '#D1D5DB', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          onMouseEnter={item => item.currentTarget.style.color = 'var(--color-starbucks-green)'}
                          onMouseLeave={item => item.currentTarget.style.color = '#D1D5DB'}
                        >
                          <Calendar size={14} />
                        </button>
                        <button 
                          onClick={() => handleRemoveEnrollment(e.id)}
                          title="수강 삭제"
                          style={{ color: '#D1D5DB', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          onMouseEnter={item => item.currentTarget.style.color = '#F87171'}
                          onMouseLeave={item => item.currentTarget.style.color = '#D1D5DB'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>등록된 클래스가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Student Modal */}
      {(isAddModalOpen || editingStudent) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setIsAddModalOpen(false); setEditingStudent(null); }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{editingStudent ? '수강생 정보 수정' : '신규 수강생 등록'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); setEditingStudent(null); }} style={{ background: 'none', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>성함</label>
                <input 
                  type="text" 
                  value={editingStudent ? editingStudent.name : formData.name} 
                  onChange={e => editingStudent ? setEditingStudent({...editingStudent, name: e.target.value}) : setFormData({...formData, name: e.target.value})} 
                  required 
                  placeholder="수강생 이름을 입력하세요"
                />
              </div>
              <div style={{ marginBottom: '2.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>연락처</label>
                <input 
                  type="text" 
                  value={editingStudent ? editingStudent.phone : formData.phone} 
                  onChange={e => editingStudent ? setEditingStudent({...editingStudent, phone: e.target.value}) : setFormData({...formData, phone: e.target.value})} 
                  required 
                  placeholder="010-0000-0000"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingStudent ? '저장하기' : '등록하기'}</button>
                <button type="button" className="btn-primary" style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#4B5563' }} onClick={() => { setIsAddModalOpen(false); setEditingStudent(null); }}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {enrollingStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setEnrollingStudent(null); setSelectedClassId(''); }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>클래스 수강 등록</h2>
              <button onClick={() => { setEnrollingStudent(null); setSelectedClassId(''); }} style={{ background: 'none', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              <strong>{enrollingStudent.name}</strong>님이 수강할 새로운 클래스를 선택해주세요.
            </p>

            <form onSubmit={handleAddEnrollment}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>클래스 선택</label>
                <select 
                  value={selectedClassId} 
                  onChange={e => setSelectedClassId(e.target.value)}
                  required
                >
                  <option value="">클래스를 선택하세요</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '2.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>수강 희망 시간</label>
                <select 
                  value={preferredTime} 
                  onChange={e => setPreferredTime(e.target.value)}
                  required
                >
                  <option value="">시간을 선택하세요</option>
                  {Array.from({ length: 11 }, (_, i) => i + 9).map(hour => (
                    <React.Fragment key={hour}>
                      <option value={`${hour}:00`}>{hour}:00</option>
                      <option value={`${hour}:30`}>{hour}:30</option>
                    </React.Fragment>
                  ))}
                  <option value="20:00">20:00</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>수강 등록</button>
                <button type="button" className="btn-primary" style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#4B5563' }} onClick={() => { setEnrollingStudent(null); setSelectedClassId(''); }}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Attendance Log Modal */}
      {selectedStudentForLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050
        }} onClick={() => setSelectedStudentForLog(null)}>
          <div className="card" style={{ width: '95%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <header style={{ padding: '1.5rem 2rem', borderBottom: 'var(--border-thin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedStudentForLog.name} 출석 로그</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>전체 수강 이력 및 일정 관리</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  onClick={() => {
                    setNewSessionData({ 
                      enrollmentId: selectedStudentForLog.enrollments?.[0]?.id || '', 
                      date: new Date().toISOString().split('T')[0], 
                      time: '09:00', 
                      consumeSlot: true 
                    });
                    setIsAddSessionModalOpen(true);
                  }}
                  style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    color: 'var(--color-white)', 
                    backgroundColor: 'var(--color-starbucks-green)', 
                    padding: '6px 14px', 
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  + 수업 추가
                </button>
                <button onClick={() => setSelectedStudentForLog(null)} style={{ background: 'none', color: '#9CA3AF' }}><X size={24} /></button>
              </div>
            </header>

            <div style={{ overflowY: 'auto', padding: '1.5rem 2rem' }}>
              {isLogLoading ? (
                <p style={{ textAlign: 'center', padding: '2rem' }}>로딩 중...</p>
              ) : attendanceLog.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#AAA' }}>기록된 일정이 없습니다.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #F3F4F6' }}>
                        <th style={{ padding: '0.8rem 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>날짜</th>
                        <th style={{ padding: '0.8rem 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>클래스</th>
                        <th style={{ padding: '0.8rem 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>상태</th>
                        <th style={{ padding: '0.8rem 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceLog.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '1rem 0', fontSize: '0.9rem', fontWeight: 500 }}>
                            {new Date(item.scheduled_at).toLocaleDateString()} {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '1rem 0', fontSize: '0.85rem', fontWeight: 600 }}>
                            {item.enrollment?.classes?.name || '정보 없음'}
                          </td>
                          <td style={{ padding: '1rem 0' }}>
                            <select 
                              value={item.status} 
                              onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700, 
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 
                                  item.status === 'attended' ? '#D1FAE5' : 
                                  item.status === 'absent' ? '#FEE2E2' : '#F3F4F6',
                                color: 
                                  item.status === 'attended' ? '#065F46' : 
                                  item.status === 'absent' ? '#991B1B' : '#374151'
                              }}
                            >
                              <option value="scheduled">예정</option>
                              <option value="attended">출석</option>
                              <option value="absent">결석</option>
                              <option value="postponed">연기</option>
                            </select>
                          </td>
                          <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleDeleteSession(item.id)}
                              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                              onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Session Modal */}
      {isAddSessionModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }} onClick={() => setIsAddSessionModalOpen(false)}>
          <div className="card" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>추가 수업 등록</h2>
              <button onClick={() => setIsAddSessionModalOpen(false)} style={{ background: 'none', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddManualSession}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>클래스 선택</label>
                <select 
                  value={newSessionData.enrollmentId} 
                  onChange={e => setNewSessionData({...newSessionData, enrollmentId: e.target.value})}
                  required
                >
                  {selectedStudentForLog.enrollments.map(e => (
                    <option key={e.id} value={e.id}>{e.classes?.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>날짜</label>
                  <input 
                    type="date" 
                    value={newSessionData.date} 
                    onChange={e => setNewSessionData({...newSessionData, date: e.target.value})}
                    required 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>시간</label>
                  <select 
                    value={newSessionData.time} 
                    onChange={e => setNewSessionData({...newSessionData, time: e.target.value})}
                    required
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 9).map(hour => (
                      <React.Fragment key={hour}>
                        <option value={`${hour.toString().padStart(2, '0')}:00`}>{hour}:00</option>
                        <option value={`${hour.toString().padStart(2, '0')}:30`}>{hour}:30</option>
                      </React.Fragment>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ 
                marginBottom: '2.5rem', 
                padding: '1rem', 
                backgroundColor: 'var(--color-starbucks-green-soft)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }} onClick={() => setNewSessionData({...newSessionData, consumeSlot: !newSessionData.consumeSlot})}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: '2px solid var(--color-starbucks-green)',
                  backgroundColor: newSessionData.consumeSlot ? 'var(--color-starbucks-green)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}>
                  {newSessionData.consumeSlot && <Check size={14} color="white" />}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>정규 수업 차감</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>기존 남은 수업 중 하나를 대체합니다</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>수업 추가</button>
                <button type="button" className="btn-primary" style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#4B5563' }} onClick={() => setIsAddSessionModalOpen(false)}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }} onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="card" style={{ width: '90%', maxWidth: '360px', padding: '2.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '1.5rem', color: confirmModal.isDanger ? '#F87171' : 'var(--color-starbucks-green)' }}>
              <AlertCircle size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>{confirmModal.title}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button 
                onClick={confirmModal.onConfirm} 
                className="btn-primary" 
                style={{ flex: 1, backgroundColor: confirmModal.isDanger ? '#F87171' : 'var(--color-starbucks-green)' }}
              >
                확인
              </button>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="btn-primary" 
                style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#4B5563' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
