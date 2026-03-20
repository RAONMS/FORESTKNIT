import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, User, Phone, Calendar, Edit2, Trash2, X, Check, BookOpen, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { CURRICULUM_OPTIONS, TOOL_TYPE_OPTIONS, formatEnrollmentLabel } from '../lib/enrollment';
import { countScheduledSessions, generateScheduleEntries, maybeAutoRenewEnrollment } from '../lib/enrollmentScheduling';

const DateSelector = ({ label, value, onChange, required = false, compact = false }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 31 }, (_, index) => currentYear + 5 - index);
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const parseValue = (nextValue) => {
    const nextParts = (nextValue || '').split('-');
    return {
      year: nextParts[0] || '',
      month: nextParts[1] || '',
      day: nextParts[2] || '',
    };
  };
  const [parts, setParts] = useState(parseValue(value));
  const { year, month, day } = parts;
  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const completedValue = year && month && day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : '';

  useEffect(() => {
    if (value && value !== completedValue) {
      setParts(parseValue(value));
    }
    if (!value && completedValue) {
      setParts({ year: '', month: '', day: '' });
    }
  }, [value]);

  const updatePart = (part, partValue) => {
    const nextParts = {
      year,
      month,
      day,
      [part]: partValue,
    };

    if (nextParts.year && nextParts.month) {
      const maxDay = new Date(Number(nextParts.year), Number(nextParts.month), 0).getDate();
      if (nextParts.day && Number(nextParts.day) > maxDay) {
        nextParts.day = String(maxDay);
      }
    }

    setParts(nextParts);

    if (nextParts.year && nextParts.month && nextParts.day) {
      onChange(`${nextParts.year}-${String(nextParts.month).padStart(2, '0')}-${String(nextParts.day).padStart(2, '0')}`);
    }
  };

  return (
    <div style={{ marginBottom: compact ? '0.2rem' : '2.5rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{label}</label>
      <input
        type="hidden"
        value={completedValue}
        onChange={() => {}}
        required={required}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: compact ? '0.45rem' : '0.7rem', marginTop: '0.55rem' }}>
        <select value={year} onChange={e => updatePart('year', e.target.value)} required={required}>
          <option value="">연도</option>
          {years.map(option => (
            <option key={option} value={option}>{option}년</option>
          ))}
        </select>
        <select value={month} onChange={e => updatePart('month', e.target.value)} required={required}>
          <option value="">월</option>
          {months.map(option => (
            <option key={option} value={option}>{option}월</option>
          ))}
        </select>
        <select value={day} onChange={e => updatePart('day', e.target.value)} required={required}>
          <option value="">일</option>
          {days.map(option => (
            <option key={option} value={option}>{option}일</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const Students = () => {
  const dayOptions = ['월', '화', '수', '목', '금', '토'];
  const formatDateInputValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };
  const toStoredDateTime = (dateText) => dateText ? `${dateText}T12:00:00+09:00` : null;
  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length < 11) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', registered_at: new Date().toISOString().split('T')[0] });
  const [enrollingStudent, setEnrollingStudent] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedToolType, setSelectedToolType] = useState(TOOL_TYPE_OPTIONS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(CURRICULUM_OPTIONS[0]);
  const [selectedScheduleDays, setSelectedScheduleDays] = useState([]);
  const [classEndDate, setClassEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [graduationDate, setGraduationDate] = useState('');
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [isFinalClass, setIsFinalClass] = useState(false);
  const [preferredTime, setPreferredTime] = useState('');
  const [selectedStudentForLog, setSelectedStudentForLog] = useState(null);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [newSessionData, setNewSessionData] = useState({ enrollmentId: '', date: new Date().toISOString().split('T')[0], logType: 'participated' });
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
          lastAttended: attendedDates.length > 0 ? attendedDates[0].toLocaleDateString() : '기록 없음',
          registeredAt: s.registered_at ? new Date(s.registered_at).toLocaleDateString() : '기록 없음'
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
      .select('*, enrollment:enrollments(tool_type, difficulty, preferred_time, schedule_days, sessions_total, renew_on_completion, classes(name, type, difficulty, total_sessions))')
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
      const scheduledAt = new Date(`${newSessionData.date}T12:00:00+09:00`).toISOString();
      const status =
        newSessionData.logType === 'participated'
          ? 'attended'
          : newSessionData.logType === 'postponed'
            ? 'postponed'
            : 'deducted';
      
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
      const { data: insertedSession, error: insertError } = await supabase
        .from('schedule')
        .insert([{
          student_id: selectedStudentForLog.id,
          enrollment_id: newSessionData.enrollmentId,
          scheduled_at: scheduledAt,
          status
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (status === 'attended') {
        await supabase
          .from('attendance')
          .insert([{ student_id: selectedStudentForLog.id, schedule_id: insertedSession.id }]);
      }

      setNewSessionData({
        enrollmentId: selectedStudentForLog.enrollments?.[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        logType: 'participated',
      });
      fetchAttendanceLog(selectedStudentForLog);
      fetchData();
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
      const updatedItem = attendanceLog.find(item => item.id === scheduleId);
      setAttendanceLog(prev => prev.map(item => 
        item.id === scheduleId ? { ...item, status: newStatus } : item
      ));
      if (newStatus === 'attended' && updatedItem?.enrollment && selectedStudentForLog) {
        try {
          await maybeAutoRenewEnrollment({
            ...updatedItem.enrollment,
            id: updatedItem.enrollment_id,
            student_id: selectedStudentForLog.id,
          });
        } catch (renewError) {
          console.error('Auto-renew failed:', renewError);
        }
      }
      fetchData(); // Refresh main view to update "lessons left"
      if (selectedStudentForLog) {
        fetchAttendanceLog(selectedStudentForLog);
      }
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('students').insert([{
      ...formData,
      registered_at: toStoredDateTime(formData.registered_at),
    }]);
    if (!error) {
      setIsAddModalOpen(false);
      setFormData({ name: '', phone: '', registered_at: new Date().toISOString().split('T')[0] });
      fetchData();
      return;
    }
    alert(`수강생 등록 중 오류가 발생했습니다: ${error.message}`);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('students').update({
      name: editingStudent.name,
      phone: editingStudent.phone,
      registered_at: toStoredDateTime(editingStudent.registered_at),
    }).eq('id', editingStudent.id);

    if (!error) {
      setEditingStudent(null);
      fetchData();
      return;
    }
    alert(`수강생 수정 중 오류가 발생했습니다: ${error.message}`);
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

  const generateSchedule = async (studentId, enrollmentId, targetClass, time, scheduleDays) => {
    const scheduleEntries = generateScheduleEntries({
      studentId,
      enrollmentId,
      totalSessions: targetClass.total_sessions || 4,
      time,
      scheduleDays,
    });

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
            await generateSchedule(student.id, enrollment.id, targetClass, enrollment.preferred_time, enrollment.schedule_days);
            alert('일정이 성공적으로 생성되었습니다.');
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            fetchData();
          }
        });
        setLoading(false);
        return;
      }

      const targetClass = classes.find(c => c.id === enrollment.class_id);
      await generateSchedule(student.id, enrollment.id, targetClass, enrollment.preferred_time, enrollment.schedule_days);
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
    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClassId || !enrollingStudent || selectedScheduleDays.length === 0) return;
    if (isFinalClass && !classEndDate) return;
    if (isCourseCompleted && !graduationDate) return;

    try {
      // 1. Create the enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert([{
          student_id: enrollingStudent.id,
          class_id: selectedClassId,
          tool_type: selectedToolType,
          difficulty: selectedDifficulty,
          schedule_days: selectedScheduleDays,
          sessions_total: targetClass.total_sessions,
          sessions_left: targetClass.total_sessions,
          preferred_time: preferredTime,
          class_end_date: isFinalClass && classEndDate ? new Date(`${classEndDate}T09:00:00`).toISOString() : null,
          graduation_date: isCourseCompleted && graduationDate ? new Date(`${graduationDate}T09:00:00`).toISOString() : null,
          is_graduated: isCourseCompleted,
          is_final_class: isFinalClass,
        }])
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // 2. Automatically generate schedule entries
      await generateSchedule(enrollingStudent.id, enrollment.id, targetClass, preferredTime, selectedScheduleDays);

      setEnrollingStudent(null);
      resetEnrollmentForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert(`수강 등록 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const resetEnrollmentForm = () => {
    setSelectedClassId('');
    setSelectedToolType(TOOL_TYPE_OPTIONS[0]);
    setSelectedDifficulty(CURRICULUM_OPTIONS[0]);
    setSelectedScheduleDays([]);
    setClassEndDate(new Date().toISOString().split('T')[0]);
    setGraduationDate('');
    setIsCourseCompleted(false);
    setIsFinalClass(false);
    setPreferredTime('');
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
  const selectedClass = classes.find(c => c.id === selectedClassId);

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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ color: '#AAA', padding: '2rem' }}>로딩 중...</p>
        ) : filteredStudents.length === 0 ? (
          <p style={{ color: '#AAA', textAlign: 'center', padding: '5rem' }}>수강생 정보가 없습니다.</p>
        ) : filteredStudents.map(s => (
          <div 
            key={s.id} 
            style={{ 
              display: 'grid',
              gridTemplateColumns: 'minmax(160px, 1fr) minmax(180px, 1fr) minmax(300px, 2fr) auto',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.2rem 1.5rem',
              borderBottom: '1px solid rgba(24, 33, 29, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{s.name}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>최근 출석: {s.lastAttended}</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>등록일: {s.registeredAt}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '0.9rem', fontWeight: 500 }}>
              <Phone size={14} color="#9CA3AF" />
              {s.phone}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>수강 중인 클래스</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {s.enrollments && s.enrollments.length > 0 ? (
                  s.enrollments.map(e => (
                    <div key={e.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '999px',
                      border: '1px solid #F3F4F6'
                    }}>
                      <BookOpen size={14} color="var(--color-starbucks-green)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-dark)' }}>{formatEnrollmentLabel(e)}</span>
                      {e.class_end_date ? <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>종료 {new Date(e.class_end_date).toLocaleDateString()}</span> : null}
                      {e.graduation_date ? <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>종강 {new Date(e.graduation_date).toLocaleDateString()}</span> : null}
                      {e.is_graduated ? <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>종강 완료</span> : null}
                      {e.is_final_class ? <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>마지막 수업</span> : null}
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-starbucks-green)' }}>
                        {countScheduledSessions(s.schedule || [], e.id)}회 남음
                      </span>
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
                  <p style={{ fontSize: '0.85rem', color: '#9CA3AF', fontStyle: 'italic' }}>등록된 클래스가 없습니다.</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.7rem' }}>
                <button 
                  onClick={() => {
                    resetEnrollmentForm();
                    setEnrollingStudent(s);
                  }}
                  style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-starbucks-green)', background: 'var(--color-starbucks-green-soft)', padding: '4px 10px', borderRadius: '6px' }}
                >
                  + 추가
                </button>
                <button
                  onClick={() => fetchAttendanceLog(s)}
                  style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4b5563', background: '#F3F4F6', padding: '4px 10px', borderRadius: '6px' }}
                >
                  수업 기록
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', justifySelf: 'end' }}>
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
                  onChange={e => editingStudent ? setEditingStudent({...editingStudent, phone: formatPhoneNumber(e.target.value)}) : setFormData({...formData, phone: formatPhoneNumber(e.target.value)})} 
                  required 
                  placeholder="010-0000-0000"
                />
              </div>

              <DateSelector
                label="등록일"
                value={editingStudent
                  ? formatDateInputValue(editingStudent.registered_at)
                  : formData.registered_at}
                onChange={(nextValue) => editingStudent
                  ? setEditingStudent({ ...editingStudent, registered_at: nextValue })
                  : setFormData({ ...formData, registered_at: nextValue })}
                required
              />
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingStudent ? '저장하기' : '등록하기'}</button>
                <button type="button" className="btn-primary" style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#F3F4F6' }} onClick={() => { setIsAddModalOpen(false); setEditingStudent(null); }}>취소</button>
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
        }} onClick={() => { setEnrollingStudent(null); resetEnrollmentForm(); }}>
          <div className="card" style={{ width: '94%', maxWidth: '820px', padding: '2.5rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>클래스 수강 등록</h2>
              <button onClick={() => { setEnrollingStudent(null); resetEnrollmentForm(); }} style={{ background: 'none', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              <strong>{enrollingStudent.name}</strong>님이 수강할 새로운 클래스를 선택해주세요.
            </p>

            <form onSubmit={handleAddEnrollment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>기본 정보</div>
                  <div style={{ display: 'grid', gap: '0.9rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>도구 유형</label>
                      <select
                        value={selectedToolType}
                        onChange={e => setSelectedToolType(e.target.value)}
                      >
                        {TOOL_TYPE_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>커리큘럼 난이도</label>
                      <select
                        value={selectedDifficulty}
                        onChange={e => setSelectedDifficulty(e.target.value)}
                      >
                        {CURRICULUM_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>클래스 선택</label>
                      <select 
                        value={selectedClassId} 
                        onChange={e => setSelectedClassId(e.target.value)}
                        required
                      >
                        <option value="">{classes.length > 0 ? '클래스를 선택하세요' : '등록된 클래스가 없습니다'}</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>일정 설정</div>
                  <div style={{ display: 'grid', gap: '0.9rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.8rem', display: 'block' }}>수업 요일 선택</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {dayOptions.map(day => {
                          const isActive = selectedScheduleDays.includes(day);
                          const toggleDay = () => {
                            setSelectedScheduleDays(prev =>
                              prev.includes(day)
                                ? prev.filter(item => item !== day)
                                : [...prev, day]
                            );
                          };

                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={toggleDay}
                              style={{
                                flex: 1,
                                padding: '8px 0',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: isActive ? '1px solid var(--color-starbucks-green)' : '1px solid #E5E7EB',
                                backgroundColor: isActive ? 'var(--color-starbucks-green-soft)' : '#F9FAFB',
                                color: isActive ? 'var(--color-starbucks-green)' : '#9CA3AF',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
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
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>상태 설정</div>
                <div style={{ display: 'grid', gap: '0.9rem' }}>
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--color-starbucks-green-soft)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsCourseCompleted(prev => !prev)}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '6px',
                    border: '2px solid var(--color-starbucks-green)',
                    backgroundColor: isCourseCompleted ? 'var(--color-starbucks-green)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isCourseCompleted ? <span style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 700 }}>✓</span> : null}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>종강</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>이 수강생이 종강 상태인지 표시합니다.</div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(24, 33, 29, 0.08)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsFinalClass(prev => !prev)}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '6px',
                    border: '2px solid var(--color-starbucks-green)',
                    backgroundColor: isFinalClass ? 'var(--color-starbucks-green)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isFinalClass ? <span style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 700 }}>✓</span> : null}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>마지막 수업</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>현재 등록이 마지막 수업 단계인지 표시합니다.</div>
                  </div>
                </div>
                </div>
              </div>

              {isFinalClass ? (
                <DateSelector
                  label="수업 종료일"
                  value={classEndDate}
                  onChange={setClassEndDate}
                  required
                />
              ) : null}

              {isCourseCompleted ? (
                <DateSelector
                  label="종강일"
                  value={graduationDate}
                  onChange={setGraduationDate}
                  required
                />
              ) : null}
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.72rem 1rem', fontSize: '0.88rem' }} disabled={selectedScheduleDays.length === 0 || (isFinalClass && !classEndDate) || (isCourseCompleted && !graduationDate)}>수강 등록</button>
                <button type="button" className="btn-primary" style={{ flex: 1, padding: '0.72rem 1rem', fontSize: '0.88rem', backgroundColor: '#F3F4F6', color: '#F3F4F6' }} onClick={() => { setEnrollingStudent(null); resetEnrollmentForm(); }}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Lesson Log Modal */}
      {selectedStudentForLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050
        }} onClick={() => setSelectedStudentForLog(null)}>
          <div className="card" style={{ width: '95%', maxWidth: '760px', maxHeight: '84vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <header style={{ padding: '1.5rem 2rem', borderBottom: 'var(--border-thin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedStudentForLog.name} 수업 기록</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>참여, 차감, 일정 이력을 한 곳에서 관리합니다.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button onClick={() => setSelectedStudentForLog(null)} style={{ background: 'none', color: '#9CA3AF' }}><X size={24} /></button>
              </div>
            </header>

            <div style={{ overflowY: 'auto', padding: '1.5rem 2rem' }}>
              <div className="glass-panel" style={{ padding: '0.7rem 0.85rem', marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>수동 입력</div>
                <form onSubmit={handleAddManualSession}>
                  <div style={{ display: 'grid', gap: '0.45rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>클래스 선택</label>
                      <select 
                        value={newSessionData.enrollmentId} 
                        onChange={e => setNewSessionData({...newSessionData, enrollmentId: e.target.value})}
                        required
                      >
                        {selectedStudentForLog.enrollments.map(e => (
                          <option key={e.id} value={e.id}>{formatEnrollmentLabel(e)}</option>
                        ))}
                      </select>
                    </div>
                    <DateSelector
                      label="날짜"
                      value={newSessionData.date}
                      onChange={(date) => setNewSessionData({ ...newSessionData, date })}
                      required
                      compact
                    />
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>기록 유형</label>
                      <select
                        value={newSessionData.logType}
                        onChange={e => setNewSessionData({ ...newSessionData, logType: e.target.value })}
                        required
                      >
                        <option value="participated">참여</option>
                        <option value="deducted">차감</option>
                        <option value="postponed">연기</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      <button type="submit" className="btn-primary" style={{ padding: '0.68rem 0.92rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>기록 추가</button>
                    </div>
                  </div>
                </form>
              </div>

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
                        <th style={{ padding: '0.8rem 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>기록</th>
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
                            {formatEnrollmentLabel(item.enrollment)}
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
                                  item.status === 'deducted' ? '#FEF3C7' :
                                  item.status === 'absent' ? '#FEE2E2' : '#F3F4F6',
                                color: 
                                  item.status === 'attended' ? '#065F46' : 
                                  item.status === 'deducted' ? '#92400E' :
                                  item.status === 'absent' ? '#991B1B' : '#374151'
                              }}
                            >
                              <option value="scheduled">예정</option>
                              <option value="attended">참여</option>
                              <option value="deducted">차감</option>
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
                style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#F3F4F6' }}
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
