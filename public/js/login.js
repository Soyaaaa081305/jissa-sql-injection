/* ==========================================================================
   Login screen behaviour — normal (legitimate) sign-in path.
   The lab panel in lab.js drives this same path so the demo ends on a real,
   server-validated login rather than a fake redirect.
   ========================================================================== */
(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const errorBox = document.getElementById('formError');
  const toast = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  document.querySelectorAll('[data-toast]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(el.dataset.toast);
    });
  });

  function showError(message) {
    errorBox.hidden = false;
    errorBox.textContent = message;
    form.classList.remove('shake');
    void form.offsetWidth;          // restart the animation
    form.classList.add('shake');
  }

  async function signIn(user, password) {
    const btn = form.querySelector('.signin');
    const ctx = window.__labContext || null;
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: password })
      });
      const data = await res.json();

      if (data.ok) {
        errorBox.hidden = true;
        // Only flag the session when the lab drove the login — a normal manual
        // sign-in should not show the "demonstration complete" banner.
        if (ctx && ctx.mode && ctx.mode !== 'manual') {
          sessionStorage.setItem('jissa:demo', JSON.stringify({
            mode: ctx.mode,
            probes: ctx.probes,
            endpoint: ctx.endpoint || 'vulnerable',
            user: data.user.student_number,
            name: data.user.full_name,
            recovered: ctx.recovered,
            at: Date.now()
          }));
        }
        window.location.href = '/courses.html';
        return true;
      }

      showError(data.error || 'Login failed.');
      return false;
    } catch (err) {
      showError('Cannot reach the local lab server. Is start.bat running?');
      return false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    signIn(userInput.value.trim(), passInput.value);
  });

  // Public surface used by the lab panel.
  window.JISSA = { signIn, showToast, form, userInput, passInput, showError };
})();
