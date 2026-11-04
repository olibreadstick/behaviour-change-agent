import React, { useEffect, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import { changeAdminPassword, loginAdmin } from './services/auth';
import { refreshAdminCloud } from './services/cloudPersistence';

const SESSION_KEY = 'support_agent_auth_session';
const accounts = (): Array<{ id: string; createdAt: number }> => {
  try { const data = JSON.parse(localStorage.getItem('uc_accounts') || '[]'); return Array.isArray(data) ? data.filter(a => typeof a?.id === 'string') : []; } catch { return []; }
};
const savedAdmin = (): string | null => {
  try { const data = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); return data?.role === 'admin' ? data.username || 'admin' : null; } catch { return null; }
};
export default function AdminApp() {
  const [admin, setAdmin] = useState(savedAdmin);
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [participants, setParticipants] = useState(accounts);
  const [passwordOpen, setPasswordOpen] = useState(false); const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    if (!admin) return;
    let active = true;
    const refresh = () => { if (active) setParticipants(accounts()); };
    void refreshAdminCloud().then(refresh);
    window.addEventListener('behaviour-change-usage-updated', refresh);
    return () => { active = false; window.removeEventListener('behaviour-change-usage-updated', refresh); };
  }, [admin]);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await loginAdmin(username.trim(), password); sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'admin', username: username.trim() })); setAdmin(username.trim()); setPassword(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); } finally { setBusy(false); }
  }
  async function updatePassword(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (newPassword.length < 8 || newPassword !== confirmPassword) { setError('Use at least 8 characters and matching new passwords.'); return; }
    setBusy(true);
    try { const response = await changeAdminPassword(admin!, currentPassword, newPassword); setMessage(response.message); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to change password.'); } finally { setBusy(false); }
  }
  const fieldClass = 'w-full border border-sky-200 rounded-xl p-3 mt-1 mb-4';
  if (!admin) return <main className="min-h-screen bg-sky-50 flex items-center justify-center p-6"><div className="w-full max-w-md"><img src="/behaviour-logo.png" alt="Daily Coach penguin" className="w-24 h-24 object-contain mx-auto" /><h1 className="text-3xl font-bold text-sky-950 text-center my-4">Researcher sign in</h1><form onSubmit={e => void login(e)} className="bg-white border border-sky-100 rounded-3xl p-6 shadow-sm"><label>Username<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className={fieldClass} /></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={fieldClass} /></label>{error && <p role="alert" className="text-red-700 mb-4">{error}</p>}<button disabled={busy} className="w-full bg-sky-700 text-white rounded-xl p-3 font-semibold disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in as researcher'}</button></form><a href="/" className="block text-center text-sky-700 mt-6">Return to the participant app</a></div></main>;
  return <div className="min-h-screen bg-sky-50"><header className="bg-white border-b border-sky-100 p-4 flex flex-wrap items-center gap-4"><img src="/behaviour-logo.png" alt="Daily Coach penguin" className="w-12 h-12 object-contain" /><strong className="text-sky-950 flex-1">Daily Coach · Researchers</strong><a href="/" className="text-sky-700">Participant app</a><button onClick={() => { setPasswordOpen(!passwordOpen); setError(''); setMessage(''); }} className="text-sky-700">Change password</button><button onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAdmin(null); setError(''); setPasswordOpen(false); }} className="text-sky-700">Sign out</button></header>{passwordOpen && <form onSubmit={e => void updatePassword(e)} className="max-w-md mx-auto bg-white p-6 rounded-2xl my-6"><h2 className="text-xl font-bold mb-4">Change administrator password</h2><label>Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={fieldClass} /></label><label>New password<input required type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={fieldClass} /></label><label>Confirm new password<input required type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={fieldClass} /></label>{error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-green-700">{message}</p>}<button disabled={busy} className="bg-sky-700 text-white rounded-xl p-3 mt-4 disabled:opacity-50">{busy ? 'Saving…' : 'Save password'}</button></form>}<AdminDashboard accounts={participants} /></div>;
}
