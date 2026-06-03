/* ═══════════════════════════════════════════════════════
   PEPPER THEM — AUTH SYSTEM (auth.js)
   • Signup / Login stored in localStorage
   • Unique email enforcement (no duplicate accounts)
   • Session persistence across pages
   • Modal open/close, tab switching
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Storage Keys ──
  const USERS_KEY   = 'pt_users';    // array of { name, email, passwordHash, createdAt }
  const SESSION_KEY = 'pt_session';  // { email, name } or null

  // ── Tiny hash (not cryptographic – for demo only) ──
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash.toString(16);
  }

  // ── User Store helpers ──
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findUserByEmail(email) {
    return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  function registerUser(name, email, password) {
    if (findUserByEmail(email)) {
      return { ok: false, error: 'This email is already registered. Please sign in instead.' };
    }
    const users = getUsers();
    users.push({
      name,
      email: email.toLowerCase(),
      passwordHash: simpleHash(password),
      createdAt: new Date().toISOString()
    });
    saveUsers(users);
    return { ok: true };
  }

  function loginUser(email, password) {
    const user = findUserByEmail(email);
    if (!user) {
      return { ok: false, error: 'No account found with that email.' };
    }
    if (user.passwordHash !== simpleHash(password)) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }
    return { ok: true, user };
  }

  // ── Session helpers ──
  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, name: user.name }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // ── UI: Update auth button label across all pages ──
  function refreshAuthUI() {
    const session = getSession();
    const btn     = document.getElementById('auth-trigger-btn');
    const label   = document.getElementById('auth-user-label');

    if (!btn) return;

    if (session) {
      const firstName = session.name.split(' ')[0];
      if (label) label.textContent = firstName;
      btn.setAttribute('title', `Signed in as ${session.name} — click to sign out`);
      btn.querySelector('i').className = 'fas fa-user-check';
    } else {
      if (label) label.textContent = 'Sign In';
      btn.setAttribute('title', 'Login / Sign Up');
      btn.querySelector('i').className = 'fas fa-user-circle';
    }
  }

  // ── Modal helpers ──
  function openModal(defaultTab) {
    const overlay = document.getElementById('auth-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (defaultTab) switchTab(defaultTab);
  }

  function closeModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    clearErrors();
  }

  function switchTab(tab) {
    const loginForm    = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const tabLogin     = document.getElementById('tab-login');
    const tabRegister  = document.getElementById('tab-register');
    if (!loginForm || !registerForm) return;

    if (tab === 'register') {
      loginForm.style.display    = 'none';
      registerForm.style.display = 'block';
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
    } else {
      loginForm.style.display    = 'block';
      registerForm.style.display = 'none';
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
    }
    clearErrors();
  }

  function clearErrors() {
    ['login-error', 'register-error', 'register-success'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function showSuccess(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  // ── Validation helpers ──
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // ── Init ──
  function init() {
    refreshAuthUI();

    // Auth trigger button (header)
    const authBtn = document.getElementById('auth-trigger-btn');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        const session = getSession();
        if (session) {
          // Already logged in → sign out
          if (confirm(`Sign out of your account (${session.email})?`)) {
            clearSession();
            refreshAuthUI();
            showToast('You have been signed out.', 'info');
          }
        } else {
          openModal('login');
        }
      });
    }

    // Mobile auth trigger
    const mobileAuthBtn = document.getElementById('mobile-auth-trigger');
    if (mobileAuthBtn) {
      mobileAuthBtn.addEventListener('click', () => {
        // Close mobile menu first
        const hamburger     = document.querySelector('.hamburger');
        const mobileOverlay = document.querySelector('.mobile-overlay');
        if (hamburger)     hamburger.classList.remove('active');
        if (mobileOverlay) mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
        // Open auth modal
        const session = getSession();
        openModal(session ? 'login' : 'login');
      });
    }

    // Close modal on overlay click / close button
    const overlay   = document.getElementById('auth-modal-overlay');
    const closeBtn  = document.getElementById('auth-modal-close');

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    // ESC key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Tab switching buttons
    document.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Switch links inside forms
    document.querySelectorAll('.auth-link').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ── LOGIN SUBMIT ──
    const loginSubmit = document.getElementById('login-submit');
    if (loginSubmit) {
      loginSubmit.addEventListener('click', () => {
        clearErrors();
        const email    = (document.getElementById('login-email')?.value || '').trim();
        const password = (document.getElementById('login-password')?.value || '');

        if (!email)              return showError('login-error', 'Please enter your email address.');
        if (!isValidEmail(email)) return showError('login-error', 'Please enter a valid email address.');
        if (!password)           return showError('login-error', 'Please enter your password.');

        const result = loginUser(email, password);
        if (!result.ok) return showError('login-error', result.error);

        setSession(result.user);
        refreshAuthUI();
        closeModal();
        showToast(`Welcome back, ${result.user.name.split(' ')[0]}! 🔥`, 'success');
      });
    }

    // ── REGISTER SUBMIT ──
    const regSubmit = document.getElementById('register-submit');
    if (regSubmit) {
      regSubmit.addEventListener('click', () => {
        clearErrors();
        const name     = (document.getElementById('reg-name')?.value || '').trim();
        const email    = (document.getElementById('reg-email')?.value || '').trim();
        const password = (document.getElementById('reg-password')?.value || '');

        if (!name)                return showError('register-error', 'Please enter your full name.');
        if (!email)               return showError('register-error', 'Please enter your email address.');
        if (!isValidEmail(email)) return showError('register-error', 'Please enter a valid email address.');
        if (password.length < 6)  return showError('register-error', 'Password must be at least 6 characters long.');

        const result = registerUser(name, email, password);
        if (!result.ok) return showError('register-error', result.error);

        showSuccess('register-success', `✅ Account created! Welcome, ${name.split(' ')[0]}! Signing you in…`);

        // Auto-login after 1.2 s
        setTimeout(() => {
          const loginResult = loginUser(email, password);
          if (loginResult.ok) {
            setSession(loginResult.user);
            refreshAuthUI();
            closeModal();
            showToast(`Welcome to Pepper Them, ${name.split(' ')[0]}! 🌶️`, 'success');
          }
        }, 1200);
      });
    }
  }

  // ── Toast Notification ──
  function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.getElementById('pt-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'pt-toast';
    toast.textContent = message;

    const colors = {
      success : { bg: 'rgba(10,10,10,0.95)', border: '#CCFF00', color: '#CCFF00' },
      error   : { bg: 'rgba(10,10,10,0.95)', border: '#FF3333', color: '#FF3333' },
      info    : { bg: 'rgba(10,10,10,0.95)', border: '#aaa',    color: '#f5f5f7' }
    };
    const c = colors[type] || colors.info;

    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       '28px',
      right:        '28px',
      zIndex:       '99999',
      background:   c.bg,
      border:       `1px solid ${c.border}`,
      color:        c.color,
      padding:      '14px 22px',
      borderRadius: '10px',
      fontFamily:   "'Outfit', sans-serif",
      fontSize:     '0.95rem',
      fontWeight:   '500',
      boxShadow:    '0 8px 30px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      transform:    'translateY(20px)',
      opacity:      '0',
      transition:   'all 0.35s ease',
      maxWidth:     '320px',
      lineHeight:   '1.5'
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity   = '1';
    });
    setTimeout(() => {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity   = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // ── Expose globally ──
  window.PepperAuth = {
    getSession,
    clearSession,
    openModal,
    closeModal,
    showToast
  };

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
