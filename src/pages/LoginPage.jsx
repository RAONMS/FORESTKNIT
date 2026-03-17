import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingLocal(true);
    
    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
      } else if (data.user) {
        navigate('/');
      }
    } catch (err) {
      setError('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
    }}>
      <div className="glass-panel hero-panel fade-up" style={{
        width: '100%',
        maxWidth: '1020px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        padding: '20px'
      }}>
        <section className="card" style={{
          minHeight: '520px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(160deg, rgba(24, 78, 61, 0.95) 0%, rgba(31, 107, 82, 0.88) 52%, rgba(214, 183, 126, 0.35) 100%)',
          color: '#fff'
        }}>
          <div>
            <div className="brand-mark" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff' }}>
              <Sparkles size={14} />
              Studio Dashboard
            </div>
            <h1 style={{
              marginTop: '24px',
              fontFamily: '"Manrope", "Noto Sans KR", sans-serif',
              fontSize: 'clamp(2.3rem, 4vw, 3.8rem)',
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: '-0.08em'
            }}>
              포레스트 니트의
              <br />
              운영 리듬을
              <br />
              더 부드럽게
            </h1>
            <p style={{ marginTop: '18px', maxWidth: '420px', color: 'rgba(255,255,255,0.8)' }}>
              수강생, 일정, 체크인을 한 화면 흐름으로 정리해서 매일의 운영이 더 가볍게 이어지도록 돕습니다.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '12px'
          }}>
            {[
              ['Attendance', '실시간 체크인'],
              ['Students', '수강생 관리'],
              ['Schedule', '주간 흐름 확인'],
            ].map(([label, value]) => (
              <div key={label} style={{
                padding: '16px',
                borderRadius: '18px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.12)'
              }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>{label}</div>
                <div style={{ marginTop: '8px', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{
          textAlign: 'center',
          padding: '40px 34px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h2 style={{
            color: 'var(--bg-accent-deep)',
            fontFamily: '"Manrope", "Noto Sans KR", sans-serif',
            fontSize: '2.2rem',
            fontWeight: 800,
            letterSpacing: '-0.08em'
          }}>
            포레스트 니트
          </h2>
          <p style={{ margin: '12px 0 32px', color: 'var(--text-muted)' }}>
            차분한 운영을 위한 프리미엄 스튜디오 콘솔
          </p>

          <form onSubmit={handleLogin}>
          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <label className="field-label">이메일</label>
            <input 
              type="email" 
              placeholder="email@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div style={{ textAlign: 'left', marginBottom: '3rem' }}>
            <label className="field-label">비밀번호</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          {error && <p style={{ color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.92rem', fontWeight: 600 }}>{error}</p>}
          
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loadingLocal}
            style={{ 
              width: '100%',
              padding: '1rem 1.2rem',
              fontSize: '1rem'
            }}
          >
            {loadingLocal ? '인증 중...' : '로그인'}
            {!loadingLocal && <ArrowRight size={18} />}
          </button>
        </form>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
