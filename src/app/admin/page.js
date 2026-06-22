'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Disc3, X, Menu, Users, Star, Plus, Trash2, Loader2, Save, ArrowLeft, Server, Activity, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import DynamicIcon from '@/components/DynamicIcon';
import useModalStore from '@/store/useModalStore';

export default function AdminDashboard() {
  const { showAlert } = useModalStore();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('backend'); // 'backend', 'users' or 'updates'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  const [newUpdate, setNewUpdate] = useState({ icon: '', title: '', description: '' });
  const [savingUpdate, setSavingUpdate] = useState(false);

  const [backendStatus, setBackendStatus] = useState(null);
  const [loadingBackend, setLoadingBackend] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'updates') {
        fetchUpdates();
      } else if (activeTab === 'backend') {
        fetchBackendStatus();
      }
    }
  }, [activeTab, session]);

  const fetchBackendStatus = async () => {
    setLoadingBackend(true);
    try {
      const res = await fetch('/api/admin/backend-status');
      const data = await res.json();
      setBackendStatus(data);
    } catch (err) {
      console.error(err);
      setBackendStatus({ status: 'Error', latency: 'N/A', message: 'Failed to fetch status from Next.js API.' });
    } finally {
      setLoadingBackend(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUpdates = async () => {
    setLoadingUpdates(true);
    try {
      const res = await fetch('/api/updates');
      if (res.ok) {
        const data = await res.json();
        setUpdates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleCreateUpdate = async (e) => {
    e.preventDefault();
    setSavingUpdate(true);
    try {
      const res = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUpdate)
      });
      if (res.ok) {
        setNewUpdate({ icon: '', title: '', description: '' });
        fetchUpdates();
        showAlert("Success", "Update published successfully!");
      } else {
        showAlert("Error", "Failed to save update");
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "An unexpected error occurred.");
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (id) => {
    try {
      const res = await fetch(`/api/updates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUpdates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (status === 'loading' || !session || session.user.role !== 'ADMIN') {
    return (
      <div style={{ display: 'flex', height: '100dvh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#212121' }}>
        <Loader2 className="animate-spin" size={48} color="var(--text-primary)" />
      </div>
    );
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevYear = currentYear - 1;

  const usersThisMonth = users.filter(u => u.createdAt && new Date(u.createdAt).getMonth() === currentMonth && new Date(u.createdAt).getFullYear() === currentYear).length;
  const usersLastMonth = users.filter(u => u.createdAt && new Date(u.createdAt).getMonth() === prevMonth && new Date(u.createdAt).getFullYear() === prevMonthYear).length;

  const usersThisYear = users.filter(u => u.createdAt && new Date(u.createdAt).getFullYear() === currentYear).length;
  const usersLastYear = users.filter(u => u.createdAt && new Date(u.createdAt).getFullYear() === prevYear).length;

  const usersPerPage = 20;
  const totalPages = Math.ceil(users.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <img src="/white.png" width={24} height={24} className="logo-img animate-spin" alt="Beatzy Logo" />
            <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '0.5px' }}>Beatzy Admin</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)} style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} />
          </button>
        </div>

        <div className="history-list" style={{ marginTop: '1rem' }}>
          <div
            onClick={() => { setActiveTab('backend'); setSidebarOpen(false); }}
            className="history-item"
            style={{
              backgroundColor: activeTab === 'backend' ? 'var(--bg-hover)' : 'transparent',
              marginBottom: '4px',
              cursor: 'pointer'
            }}
          >
            <Server size={18} style={{ flexShrink: 0, opacity: activeTab === 'backend' ? 1 : 0.7 }} />
            <span style={{ fontSize: '0.95rem', flex: 1, fontWeight: activeTab === 'backend' ? '600' : '400' }}>Backend Status</span>
          </div>

          <div
            onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
            className="history-item"
            style={{
              backgroundColor: activeTab === 'users' ? 'var(--bg-hover)' : 'transparent',
              marginBottom: '4px',
              cursor: 'pointer'
            }}
          >
            <Users size={18} style={{ flexShrink: 0, opacity: activeTab === 'users' ? 1 : 0.7 }} />
            <span style={{ fontSize: '0.95rem', flex: 1, fontWeight: activeTab === 'users' ? '600' : '400' }}>Users</span>
          </div>
          
          <div
            onClick={() => { setActiveTab('updates'); setSidebarOpen(false); }}
            className="history-item"
            style={{
              backgroundColor: activeTab === 'updates' ? 'var(--bg-hover)' : 'transparent',
              marginBottom: '16px',
              cursor: 'pointer'
            }}
          >
            <Star size={18} style={{ flexShrink: 0, opacity: activeTab === 'updates' ? 1 : 0.7 }} />
            <span style={{ fontSize: '0.95rem', flex: 1, fontWeight: activeTab === 'updates' ? '600' : '400' }}>Updates</span>
          </div>

          <div
            onClick={() => router.push('/')}
            className="history-item"
            style={{
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <ArrowLeft size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.95rem', flex: 1, fontWeight: '500' }}>Back to Beatzy</span>
          </div>
        </div>
        
        {/* User Profile Area */}
        <div style={{ padding: '16px 12px 24px 12px', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', padding: '8px 12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 'bold', border: '1px solid var(--border-color)' }}>
              {session.user.name?.charAt(0) || 'A'}
            </div>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session.user.name} (Admin)
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Mobile Header */}
        <div className="mobile-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--text-primary)', marginRight: '16px' }}>
              <Menu size={28} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '0.5px' }}>
                {activeTab === 'backend' ? 'System Status' : activeTab === 'users' ? 'User Management' : 'Updates Management'}
              </span>
            </div>
          </div>
        </div>

        <div className="content-scroll" style={{ padding: '24px' }}>

          {activeTab === 'backend' && (
            <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Render Extraction Backend</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Monitor the health and latency of the Python extraction server.</p>
                </div>
                <button 
                  onClick={fetchBackendStatus}
                  disabled={loadingBackend}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: loadingBackend ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  <RefreshCw size={16} className={loadingBackend ? "animate-spin" : ""} />
                  Ping Now
                </button>
              </div>

              {loadingBackend && !backendStatus ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <Loader2 className="animate-spin" size={32} color="var(--text-secondary)" />
                </div>
              ) : backendStatus ? (
                <div style={{ 
                  backgroundColor: 'var(--bg-input)', 
                  borderRadius: '16px', 
                  border: `1px solid ${backendStatus.status === 'Online' ? '#2ecc71' : backendStatus.status === 'Timeout' ? '#f39c12' : '#e74c3c'}`,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{ 
                    height: '4px', 
                    width: '100%', 
                    backgroundColor: backendStatus.status === 'Online' ? '#2ecc71' : backendStatus.status === 'Timeout' ? '#f39c12' : '#e74c3c' 
                  }} />
                  
                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ 
                        width: '56px', height: '56px', borderRadius: '50%', 
                        backgroundColor: backendStatus.status === 'Online' ? 'rgba(46, 204, 113, 0.1)' : backendStatus.status === 'Timeout' ? 'rgba(243, 156, 18, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: backendStatus.status === 'Online' ? '#2ecc71' : backendStatus.status === 'Timeout' ? '#f39c12' : '#e74c3c'
                      }}>
                        {backendStatus.status === 'Online' ? <CheckCircle size={28} /> : backendStatus.status === 'Timeout' ? <Activity size={28} /> : <AlertCircle size={28} />}
                      </div>
                      
                      <div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{backendStatus.status}</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Latency: {backendStatus.latency}</p>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message Log</p>
                      <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5', fontFamily: 'monospace' }}>
                        {backendStatus.message}
                      </p>
                    </div>
                    
                    <div style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Target: {backendStatus.url || 'Configured Extractor URL'}</span>
                      <span>Last checked: {new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          
          {activeTab === 'users' && (
            <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
              
              {!loadingUsers && users.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ backgroundColor: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>Total Users</p>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{users.length}</h3>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>This Month</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#2ecc71', margin: 0 }}>{usersThisMonth}</h3>
                      <span style={{ fontSize: '0.8rem', fontWeight: '500', color: usersThisMonth >= usersLastMonth ? '#2ecc71' : '#e74c3c' }}>
                        {usersThisMonth >= usersLastMonth ? '↑' : '↓'} {Math.abs(usersThisMonth - usersLastMonth)} vs last
                      </span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>This Year</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#3498db', margin: 0 }}>{usersThisYear}</h3>
                      <span style={{ fontSize: '0.8rem', fontWeight: '500', color: usersThisYear >= usersLastYear ? '#2ecc71' : '#e74c3c' }}>
                        {usersThisYear >= usersLastYear ? '↑' : '↓'} {Math.abs(usersThisYear - usersLastYear)} vs last
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {loadingUsers ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <Loader2 className="animate-spin" size={32} color="var(--text-secondary)" />
                </div>
              ) : (
                <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead className="hide-on-mobile">
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        <th style={{ padding: '16px', fontWeight: '600' }}>Name</th>
                        <th className="hide-on-mobile" style={{ padding: '16px', fontWeight: '600' }}>Email</th>
                        <th className="hide-on-mobile" style={{ padding: '16px', fontWeight: '600' }}>Role</th>
                        <th className="hide-on-mobile" style={{ padding: '16px', fontWeight: '600' }}>Join Date</th>
                        <th className="hide-on-mobile" style={{ padding: '16px', fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.map((u) => (
                        <tr 
                          key={u.id} 
                          className="mobile-clickable-row"
                          style={{ borderBottom: '1px solid var(--border-color)' }}
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                              setSelectedUser(u);
                            }
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold', border: '1px solid var(--border-color)', color: 'var(--text-primary)', flexShrink: 0 }}>
                                {u.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: '500' }}>{u.name || 'N/A'}</div>
                                <div className="show-on-mobile" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="hide-on-mobile" style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{u.email}</td>
                          <td className="hide-on-mobile" style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: u.role === 'ADMIN' ? 'rgba(255, 77, 79, 0.1)' : 'var(--bg-sidebar)', color: u.role === 'ADMIN' ? '#ff4d4f' : 'var(--text-primary)' }}>
                              {u.role}
                            </span>
                          </td>
                          <td className="hide-on-mobile" style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', ' | ') : u.joinDate}
                          </td>
                          <td className="hide-on-mobile" style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71' }}>
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                      >
                        Previous
                      </button>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
              
              <div style={{ backgroundColor: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>Add New Update</h3>
                <form onSubmit={handleCreateUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Icon Name (Lucide React)</label>
                    <input
                      required
                      type="text"
                      className="search-input"
                      placeholder="e.g. Headphones, Mic, Star"
                      value={newUpdate.icon}
                      onChange={(e) => setNewUpdate({ ...newUpdate, icon: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Preview: <DynamicIcon name={newUpdate.icon || 'Star'} size={18} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Title</label>
                    <input
                      required
                      type="text"
                      className="search-input"
                      placeholder="Update Title"
                      value={newUpdate.title}
                      onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Description</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Update details..."
                      value={newUpdate.description}
                      onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingUpdate || !newUpdate.title || !newUpdate.description}
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: 'var(--text-primary)',
                      color: 'var(--bg-main)',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: savingUpdate ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {savingUpdate ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Update
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Existing Updates</h3>
                {loadingUpdates ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Loader2 className="animate-spin" size={24} color="var(--text-secondary)" />
                  </div>
                ) : updates.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No updates found.</p>
                ) : (
                  updates.map((update) => (
                    <div key={update.id} style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <DynamicIcon name={update.icon} size={24} color="var(--text-primary)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>{update.title}</h4>
                          <button
                            onClick={() => handleDeleteUpdate(update.id)}
                            style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '4px' }}
                            title="Delete Update"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>{update.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }} onClick={() => setSelectedUser(null)}>
          <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '320px', border: '1px solid var(--border-color)', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>
                {selectedUser.name?.charAt(0) || 'U'}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0, textAlign: 'center' }}>{selectedUser.name || 'N/A'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0', textAlign: 'center' }}>{selectedUser.email}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Role</span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem', color: selectedUser.role === 'ADMIN' ? '#ff4d4f' : 'var(--text-primary)' }}>
                  {selectedUser.role}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Status</span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem', color: '#2ecc71' }}>
                  {selectedUser.status || 'Active'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Join Date</span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', ' | ') : selectedUser.joinDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
