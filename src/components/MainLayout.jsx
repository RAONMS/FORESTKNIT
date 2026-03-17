import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  ClipboardCheck
} from 'lucide-react';

const MainLayout = ({ isKiosk = false }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  if (isKiosk) {
    return <Outlet />;
  }

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: '대시보드' },
    { to: '/students', icon: <Users size={18} />, label: '수강생 관리' },
    { to: '/schedule', icon: <Calendar size={18} />, label: '수업 일정' },
    { to: '/classes', icon: <Settings size={18} />, label: '클래스 설정' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <div className="brand-mark">Forest Knit Studio</div>
          <h1 className="brand-title">포레스트 니트</h1>
          <p className="brand-copy">포니쌤의 관리자 페이지</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/attendance"
            className="btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <ClipboardCheck size={18} />
            키오스크 모드
          </NavLink>
          
          <button 
            onClick={handleLogout}
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
