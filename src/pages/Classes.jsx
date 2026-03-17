import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Scissors, Layers, BookOpen, X, AlertCircle } from 'lucide-react';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    difficulty: '입문과',
    type: '코바늘',
    total_sessions: 4,
    default_sessions_per_week: 1,
    schedule_days: []
  });
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: () => {}, 
    isDanger: false 
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('*').order('name');
    if (!error) setClasses(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('classes').insert([formData]);
    if (!error) {
      setIsAddModalOpen(false);
      setFormData({ 
        name: '', 
        difficulty: '입문과', 
        type: '코바늘', 
        total_sessions: 4, 
        default_sessions_per_week: 1,
        schedule_days: []
      });
      fetchClasses();
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('classes').update({
      name: editingClass.name,
      type: editingClass.type,
      difficulty: editingClass.difficulty,
      total_sessions: editingClass.total_sessions,
      default_sessions_per_week: editingClass.default_sessions_per_week,
      schedule_days: editingClass.schedule_days
    }).eq('id', editingClass.id);

    if (!error) {
      setEditingClass(null);
      fetchClasses();
    }
  };

  const handleDelete = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: '클래스 삭제',
      message: '정말 이 클래스를 삭제하시겠습니까? 관련 수강생 정보는 유지되지만 클래스 가이드는 사라집니다.',
      isDanger: true,
      onConfirm: async () => {
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (!error) fetchClasses();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem', borderBottom: 'var(--border-thin)', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-dark)', letterSpacing: '-0.8px' }}>클래스 데이터베이스</h1>
        <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} />
          신규 추가
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <p style={{ color: '#AAA' }}>로딩 중...</p>
        ) : classes.length === 0 ? (
          <p style={{ color: '#AAA', textAlign: 'center', gridColumn: '1 / -1', padding: '5rem' }}>등록된 클래스가 없습니다.</p>
        ) : classes.map(c => (
          <div 
            key={c.id} 
            className="card" 
            style={{ 
              border: 'var(--border-thin)', 
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
              padding: '1.8rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ backgroundColor: 'var(--color-starbucks-green-soft)', padding: '0.8rem', borderRadius: '12px', color: 'var(--color-starbucks-green)' }}>
                {c.type === '코바늘' ? <Scissors size={20} /> : <Layers size={20} />}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => setEditingClass(c)}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(c.id)}
                  style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-dark)', marginBottom: '0.6rem' }}>{c.name}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--color-starbucks-green-soft)', color: 'var(--color-starbucks-green)', border: 'var(--border-green-soft)' }}>{c.type}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>{c.difficulty}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: 'var(--border-thin)', paddingTop: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', fontSize: '0.9rem', fontWeight: 600 }}>
                <BookOpen size={14} color="#9CA3AF" />
                정규 {c.total_sessions}회 과정
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {['월', '화', '수', '목', '금', '토'].map(day => {
                  const isActive = c.schedule_days?.includes(day);
                  return (
                    <span 
                      key={day} 
                      style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        width: '20px', 
                        height: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRadius: '4px',
                        backgroundColor: isActive ? 'var(--color-starbucks-green)' : '#F3F4F6',
                        color: isActive ? '#FFF' : '#9CA3AF'
                      }}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>최적 학습 주기: 주 {c.default_sessions_per_week}회</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingClass) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setIsAddModalOpen(false); setEditingClass(null); }}>
          <div className="card" style={{ width: '90%', maxWidth: '480px', padding: '3rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{editingClass ? '클래스 정보 수정' : '신규 클래스 등록'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); setEditingClass(null); }} style={{ background: 'none', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={editingClass ? handleUpdate : handleSave}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>클래스 명칭</label>
                <input 
                  type="text" 
                  value={editingClass ? editingClass.name : formData.name} 
                  onChange={e => editingClass ? setEditingClass({...editingClass, name: e.target.value}) : setFormData({...formData, name: e.target.value})} 
                  required 
                  placeholder="예: 니팅 마스터 코바늘 반"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>도구 유형</label>
                  <select value={editingClass ? editingClass.type : formData.type} onChange={e => editingClass ? setEditingClass({...editingClass, type: e.target.value}) : setFormData({...formData, type: e.target.value})}>
                    <option value="코바늘">코바늘</option>
                    <option value="대바늘">대바늘</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>커리큘럼 난이도</label>
                  <select value={editingClass ? editingClass.difficulty : formData.difficulty} onChange={e => editingClass ? setEditingClass({...editingClass, difficulty: e.target.value}) : setFormData({...formData, difficulty: e.target.value})}>
                    <option value="입문과">입문과</option>
                    <option value="강사과">강사과</option>
                    <option value="해당 없음">해당 없음</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '2.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.8rem', display: 'block' }}>수업 요일 설정</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['월', '화', '수', '목', '금', '토'].map(day => {
                    const isActive = editingClass 
                      ? editingClass.schedule_days?.includes(day)
                      : formData.schedule_days?.includes(day);
                    
                    const toggleDay = () => {
                      if (editingClass) {
                        const newDays = isActive 
                          ? editingClass.schedule_days.filter(d => d !== day)
                          : [...(editingClass.schedule_days || []), day];
                        setEditingClass({...editingClass, schedule_days: newDays});
                      } else {
                        const newDays = isActive 
                          ? formData.schedule_days.filter(d => d !== day)
                          : [...formData.schedule_days, day];
                        setFormData({...formData, schedule_days: newDays});
                      }
                    };

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={toggleDay}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: '10px',
                          fontSize: '0.85rem',
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '3rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>총 수강 횟수</label>
                  <input type="number" value={editingClass ? editingClass.total_sessions : formData.total_sessions} onChange={e => editingClass ? setEditingClass({...editingClass, total_sessions: parseInt(e.target.value)}) : setFormData({...formData, total_sessions: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>주간 권장 횟수</label>
                  <input type="number" value={editingClass ? editingClass.default_sessions_per_week : formData.default_sessions_per_week} onChange={e => editingClass ? setEditingClass({...editingClass, default_sessions_per_week: parseInt(e.target.value)}) : setFormData({...formData, default_sessions_per_week: parseInt(e.target.value)})} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingClass ? '변경사항 저장' : '데이터베이스 추가'}</button>
                <button type="button" className="btn-primary" style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#F3F4F63' }} onClick={() => { setIsAddModalOpen(false); setEditingClass(null); }}>취소</button>
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

export default Classes;
