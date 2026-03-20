import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, BookOpen, X, AlertCircle } from 'lucide-react';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    total_sessions: 4,
    default_sessions_per_week: 1,
    is_graduation_class: false,
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
        total_sessions: 4, 
        default_sessions_per_week: 1,
        is_graduation_class: false,
      });
      fetchClasses();
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('classes').update({
      name: editingClass.name,
      total_sessions: editingClass.total_sessions,
      default_sessions_per_week: editingClass.default_sessions_per_week,
      is_graduation_class: Boolean(editingClass.is_graduation_class),
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
                <BookOpen size={20} />
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
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                수강생 등록 시 도구 유형, 커리큘럼 난이도, 수업 요일을 별도로 선택합니다.
              </p>
              {c.is_graduation_class ? (
                <div style={{ marginTop: '0.7rem', display: 'inline-flex', padding: '4px 10px', borderRadius: '999px', backgroundColor: 'var(--color-starbucks-green-soft)', color: 'var(--color-starbucks-green)', fontSize: '0.75rem', fontWeight: 700 }}>
                  종강 구분
                </div>
              ) : null}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: 'var(--border-thin)', paddingTop: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', fontSize: '0.9rem', fontWeight: 600 }}>
                <BookOpen size={14} color="#9CA3AF" />
                정규 {c.total_sessions}회 과정
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

              <div
                style={{
                  marginBottom: '2rem',
                  padding: '1rem',
                  backgroundColor: 'var(--color-starbucks-green-soft)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => editingClass
                  ? setEditingClass({ ...editingClass, is_graduation_class: !editingClass.is_graduation_class })
                  : setFormData({ ...formData, is_graduation_class: !formData.is_graduation_class })}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: '2px solid var(--color-starbucks-green)',
                  backgroundColor: (editingClass ? editingClass.is_graduation_class : formData.is_graduation_class) ? 'var(--color-starbucks-green)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {(editingClass ? editingClass.is_graduation_class : formData.is_graduation_class) ? <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>✓</span> : null}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>종강 구분</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>이 클래스는 수강생 등록 시 종강 관련 정보를 함께 기록할 수 있습니다.</div>
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
