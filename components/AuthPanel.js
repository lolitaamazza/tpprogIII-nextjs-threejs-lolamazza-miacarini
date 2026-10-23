'use client';
import { useRef, useState } from 'react';
import { useDismiss } from '@/hooks/useDismiss';
const messages = {
  'auth/email-already-in-use': 'Este correo ya tiene una cuenta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'Correo no válido.',
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
};
export default function AuthPanel({ user, authError, authLoading, onClose, onGoogle, onSubmitEmail, onContinueAsGuest }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const panelRef = useRef(null);
  useDismiss([panelRef], onClose);
  async function submit(e) { e.preventDefault(); try { await onSubmitEmail({ email, password, mode }); onClose(); } catch {} }
  async function google() { try { await onGoogle(); onClose(); } catch {} }
  async function guest() { try { await onContinueAsGuest(); onClose(); } catch {} }
  return <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <div ref={panelRef} className="auth-panel">
      <button className="auth-close" onClick={onClose} aria-label="Cerrar acceso">×</button>
      <p className="eyebrow">IDENTIFICACIÓN / ARCHIVO PANEM</p>
      <h2 id="auth-title">Identificar operador</h2>
      {user && !user.isAnonymous ? <>
        <p>Sesión activa: <strong>{user.displayName || user.email}</strong></p>
        <button className="outline" onClick={guest} disabled={authLoading}>Continuar como invitado</button>
      </> : <>
        <div className="auth-tabs"><button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Ingresar</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Crear cuenta</button></div>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
          <label>Contraseña<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
          <button className="primary" disabled={authLoading}>{authLoading ? 'Procesando…' : mode === 'signup' ? 'Crear cuenta' : 'Ingresar'}</button>
        </form>
        <button className="outline auth-google" onClick={google} disabled={authLoading}>Continuar con Google ↗</button>
        <p className="save-note">Para invitados, Firebase utiliza autenticación anónima.</p>
      </>}
      {!!authError && <p role="alert" className="auth-error">{messages[authError] || `Algo salió mal (${authError}).`}</p>}
    </div>
  </div>;
}
