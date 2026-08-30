/* ============================================================
   Flow Academy — shared account script
   Include on every page, in this order:
     <script>window.FLOW_BASE = '';</script>            <!-- '../' on pages one folder deep, e.g. theloop_units/ -->
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="coding-auth.js"></script>               <!-- (path-adjusted to match FLOW_BASE) -->

   Each including page must provide, in its own HTML/CSS:
     #acct-wrap > #acct-btn (button) + #acct-menu (div)   — the widget mount, ALWAYS shown (signed-out
                                                             or signed-in — every page carries this, not
                                                             just pages with somewhere to sign in from)
     #modal-bg > #modal-content                            — the modal mount
     .modal / .field / .btn-primary / .btn-google /
     .divider / .toggle-line / .auth-status                 — CSS classes (see flow-academy.css)
     a global function closeModal() that hides #modal-bg and clears #modal-content

   Unit/lesson pages additionally get automatic sign-in gating for free: if the page has a
   #beginBtn (the "Begin Training" button), it's disabled with a "Sign in to start" note until
   someone's actually signed in — same pattern as Science Quest's lockTrialStartButton().

   Real Supabase Auth (project: codinglessons). Email/password sign up, sign in and sign out
   are fully wired, as is saving each unit's results to the `coding_results` table (RLS-scoped
   to the signed-in user) via CodingAuth.saveResult(). "Continue with Google" calls the real
   signInWithOAuth('google') — it will show an error until Google OAuth credentials are added
   to this project in the Supabase dashboard (that step can't be done from here; see Curriculum
   and Progress.md).
   ============================================================ */
(function(){
  var SUPABASE_URL = "https://jpkhghgjfipxooqzkezz.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impwa2hnaGdqZmlweG9vcXprZXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NzYxOTMsImV4cCI6MjEwMzQ1MjE5M30.ICVbolTG7JRxdlNSkEDeVo6N2VwDv0GnpDrU5IcToqI";
  var BASE = window.FLOW_BASE || '';
  var PENDING_KEY = 'flow_pending_coding_result';
  // Signed-out account badge icon — terminal prompt ("> _"), same line-icon family as the
  // account menu's icons below. Declared up here (not with the others further down) because the
  // no-Supabase fallback branch immediately below needs it too, before it would otherwise be defined.
  var ICON_SIGNIN = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 5 9 10 4 15"/><line x1="11" y1="15" x2="16" y2="15"/></svg>';

  if (!window.supabase || !window.supabase.createClient){
    console.error('coding-auth.js: Supabase client script did not load (offline, or the CDN was blocked) — accounts are unavailable this session.');
    function fallbackOpenAuth(){
      var content = document.getElementById('modal-content');
      var bg = document.getElementById('modal-bg');
      if (!content || !bg) return;
      content.innerHTML = '<button class="modal-close" onclick="closeModal()">&times;</button>' +
        '<h2>Accounts unavailable</h2>' +
        '<p class="sub">The account system could not load right now (no network, or the Supabase script was blocked). Try again once you\'re back online.</p>';
      bg.classList.add('open');
    }
    var btn = document.getElementById('acct-btn');
    var menu = document.getElementById('acct-menu');
    if (btn){
      btn.innerHTML = '<span id="acct-avatar">' + ICON_SIGNIN + '</span><span>Sign In</span>';
      btn.onclick = fallbackOpenAuth;
    }
    if (menu) menu.innerHTML = '';
    var beginBtnFallback = document.getElementById('beginBtn');
    if (beginBtnFallback){
      beginBtnFallback.disabled = true;
      var noteFallback = document.createElement('div');
      noteFallback.className = 'unit-lock-note';
      noteFallback.textContent = 'Accounts are unavailable right now (no network) — this mission needs a signed-in account to start.';
      beginBtnFallback.insertAdjacentElement('afterend', noteFallback);
    }
    window.CodingAuth = {
      openAuth: fallbackOpenAuth,
      openProfileSettings: fallbackOpenAuth,
      onChange: function(fn){ try { fn({ user:null, ready:true }); } catch(e){} },
      get user(){ return null; },
      get ready(){ return true; },
      get displayName(){ return ''; },
      updateDisplayName: function(){ return Promise.resolve({ error: { message: 'Accounts unavailable right now.' } }); },
      saveResult: function(){ return Promise.resolve({ saved:false, error: { message: 'Accounts unavailable right now.' } }); },
      fetchResults: function(){ return Promise.resolve([]); },
      client: null
    };
    return;
  }
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var state = { user: null, ready: false };
  var listeners = [];
  function notify(){ listeners.forEach(function(fn){ try { fn(state); } catch(e){} }); }

  function displayName(user){
    if (!user) return '';
    var meta = user.user_metadata || {};
    if (meta.display_name) return meta.display_name;
    return user.email ? user.email.split('@')[0] : 'Cadet';
  }
  function initials(name){ return name ? name.trim().slice(0, 1).toUpperCase() : '?'; }

  /* ---------------- account menu icons — terminal/code-flavored line icons (picked over
     plain emoji, which read as dated on a coding-focused site) ---------------- */
  var ICON_TERMINAL = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="16" height="14" rx="2"/><polyline points="6 8 9 10.5 6 13"/><line x1="10.5" y1="13" x2="14" y2="13"/></svg>';
  var ICON_ACTIVITY = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 12 6 12 8 6 12 16 14 9 16 12 18 12"/></svg>';
  var ICON_CODE = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 5 2.5 10 7 15"/><polyline points="13 5 17.5 10 13 15"/></svg>';
  var ICON_POWER = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v6"/><path d="M5.3 5.5a7 7 0 1 0 9.4 0"/></svg>';

  /* ---------------- account widget (always shows — signed-out state included) ---------------- */
  function renderWidget(){
    var btn = document.getElementById('acct-btn');
    var menu = document.getElementById('acct-menu');
    if (!btn || !menu) return;
    if (state.user){
      var name = displayName(state.user);
      btn.innerHTML = '<span id="acct-avatar">' + initials(name) + '</span><span>' + name + '</span>';
      btn.onclick = function(){ menu.classList.toggle('open'); };
      var items = '<button id="menu-home">' + ICON_TERMINAL + 'Mission Control</button>';
      items += '<button id="menu-progress">' + ICON_ACTIVITY + 'My Progress</button>';
      items += '<button id="menu-profile">' + ICON_CODE + 'My Profile</button>';
      items += '<button id="menu-signout" class="signout">' + ICON_POWER + 'Sign Out</button>';
      menu.innerHTML = items;
      document.getElementById('menu-home').onclick = function(){ menu.classList.remove('open'); location.href = BASE + 'index.html'; };
      document.getElementById('menu-progress').onclick = function(){ menu.classList.remove('open'); location.href = BASE + 'my-progress.html'; };
      document.getElementById('menu-profile').onclick = function(){ menu.classList.remove('open'); openProfileSettings(); };
      document.getElementById('menu-signout').onclick = function(){
        menu.classList.remove('open');
        sb.auth.signOut();
      };
    } else {
      btn.innerHTML = '<span id="acct-avatar">' + ICON_SIGNIN + '</span><span>Sign In</span>';
      btn.onclick = function(){ openAuth('signin'); };
      menu.classList.remove('open');
      menu.innerHTML = '';
    }
  }

  document.addEventListener('click', function(e){
    var menu = document.getElementById('acct-menu');
    var wrap = document.getElementById('acct-wrap');
    if (menu && wrap && !wrap.contains(e.target)) menu.classList.remove('open');
  });

  /* ---------------- unit-page sign-in gating (automatic — same pattern as sq-auth.js's
     lockTrialStartButton: a unit page needs nothing but a #beginBtn to get this for free) ---------------- */
  function renderUnitGating(){
    var beginBtn = document.getElementById('beginBtn');
    if (!beginBtn) return; // not a unit page
    var note = document.getElementById('unit-lock-note');
    if (!state.user){
      beginBtn.disabled = true;
      if (!note){
        note = document.createElement('div');
        note.id = 'unit-lock-note';
        note.className = 'unit-lock-note';
        note.innerHTML = '&#128274; This mission needs a signed-in cadet — <a id="unit-lock-signin">Sign In</a>';
        beginBtn.insertAdjacentElement('afterend', note);
        document.getElementById('unit-lock-signin').onclick = function(){ openAuth('signin'); };
      }
    } else {
      beginBtn.disabled = false;
      if (note) note.remove();
    }
  }

  /* ---------------- pending-result flush (if a unit finished while a session unexpectedly dropped) ---------------- */
  function flushPending(){
    var raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw || !state.user) return;
    sessionStorage.removeItem(PENDING_KEY);
    try { saveResult(JSON.parse(raw)); } catch(e){}
  }

  function renderReactive(){
    renderWidget();
    renderUnitGating();
  }

  /* ---------------- auth modal (real Supabase) ---------------- */
  var GOOGLE_ICON = '<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/></svg>';

  /* ---------------- password show/hide eye toggle (same pattern as Science Quest) ---------------- */
  var EYE_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"/><circle cx="8" cy="8" r="2.2"/></svg>';
  var EYE_OFF_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"/><circle cx="8" cy="8" r="2.2"/><line x1="1" y1="1" x2="15" y2="15"/></svg>';

  function wireEyeToggle(eyeId, inputId){
    var eyeBtn = document.getElementById(eyeId);
    var input = document.getElementById(inputId);
    if (!eyeBtn || !input) return;
    eyeBtn.onclick = function(){
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      eyeBtn.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
      eyeBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    };
  }

  function openAuth(mode){
    mode = mode || 'signin';
    var content = document.getElementById('modal-content');
    var bg = document.getElementById('modal-bg');
    if (!content || !bg) return;

    content.innerHTML =
      '<button class="modal-close" onclick="closeModal()">&times;</button>' +
      '<h2>' + (mode === 'signin' ? 'Welcome back, Cadet!' : 'Create your account') + '</h2>' +
      '<p class="sub">' + (mode === 'signin' ? 'Sign in to save your missions and progress.' : 'Sign up to start saving progress across every planet.') + '</p>' +
      '<div class="field"><label>Email</label><input type="email" id="auth-email" placeholder="you@example.com" autocomplete="email"></div>' +
      '<div class="field"><label>Password</label><div class="pwd-wrap"><input type="password" id="auth-password" placeholder="' + (mode === 'signup' ? 'Create a password' : 'Enter your password') + '" autocomplete="' + (mode === 'signup' ? 'new-password' : 'current-password') + '"><button type="button" class="eye-btn" id="auth-eye-password" aria-label="Show password">' + EYE_ICON + '</button></div></div>' +
      (mode === 'signup'
        ? '<div class="field"><label>Confirm Password</label><div class="pwd-wrap"><input type="password" id="auth-password-confirm" placeholder="Re-enter your password" autocomplete="new-password"><button type="button" class="eye-btn" id="auth-eye-confirm" aria-label="Show password">' + EYE_ICON + '</button></div></div>'
        : '') +
      '<button class="btn-primary" id="auth-submit">' + (mode === 'signin' ? 'Sign In' : 'Sign Up') + '</button>' +
      '<div class="auth-status" id="auth-status"></div>' +
      '<div class="divider">or</div>' +
      '<button class="btn-google" id="auth-google">' + GOOGLE_ICON + 'Continue with Google</button>' +
      '<div class="toggle-line">' + (mode === 'signin' ? 'New here? <a id="auth-switch">Create an account</a>' : 'Already have an account? <a id="auth-switch">Sign in</a>') + '</div>';
    bg.classList.add('open');

    wireEyeToggle('auth-eye-password', 'auth-password');
    if (mode === 'signup') wireEyeToggle('auth-eye-confirm', 'auth-password-confirm');

    document.getElementById('auth-switch').onclick = function(){ openAuth(mode === 'signin' ? 'signup' : 'signin'); };

    document.getElementById('auth-google').onclick = function(){
      var statusEl = document.getElementById('auth-status');
      statusEl.className = 'auth-status';
      statusEl.textContent = 'Redirecting to Google...';
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
        .then(function(res){
          if (res.error){ statusEl.textContent = res.error.message; statusEl.className = 'auth-status err'; }
        });
    };

    document.getElementById('auth-submit').onclick = function(){
      var email = document.getElementById('auth-email').value.trim();
      var password = document.getElementById('auth-password').value;
      var statusEl = document.getElementById('auth-status');
      var btn = document.getElementById('auth-submit');
      statusEl.className = 'auth-status';

      if (!email || !password){ statusEl.textContent = 'Please fill in email and password.'; statusEl.className = 'auth-status err'; return; }

      if (mode === 'signup'){
        var confirmPwd = document.getElementById('auth-password-confirm').value;
        if (password !== confirmPwd){ statusEl.textContent = "Passwords don't match — check both fields."; statusEl.className = 'auth-status err'; return; }
        if (password.length < 6){ statusEl.textContent = 'Password should be at least 6 characters.'; statusEl.className = 'auth-status err'; return; }
      }

      btn.disabled = true;
      statusEl.textContent = 'Working...';

      var call = mode === 'signup'
        ? sb.auth.signUp({ email: email, password: password })
        : sb.auth.signInWithPassword({ email: email, password: password });

      call.then(function(res){
        if (res.error) throw res.error;
        if (mode === 'signup'){
          if (res.data && res.data.session){
            statusEl.textContent = "You're in!"; statusEl.className = 'auth-status ok';
            setTimeout(closeModal, 600);
          } else {
            statusEl.textContent = 'Account created — check your email to confirm, then sign in.';
            statusEl.className = 'auth-status ok';
          }
        } else {
          statusEl.textContent = "You're in!"; statusEl.className = 'auth-status ok';
          setTimeout(closeModal, 500);
        }
      }).catch(function(e){
        statusEl.textContent = (e && e.message) || 'Something went wrong.';
        statusEl.className = 'auth-status err';
      }).finally(function(){
        btn.disabled = false;
      });
    };
  }

  function closeModal(){
    if (typeof window.closeModal === 'function' && window.closeModal !== closeModal) { window.closeModal(); return; }
    var bg = document.getElementById('modal-bg');
    var content = document.getElementById('modal-content');
    if (bg) bg.classList.remove('open');
    if (content) content.innerHTML = '';
  }

  /* ---------------- my profile modal (name, password, delete account) — same shape as
     Science Quest's openProfileSettings(), restyled to Flow Academy's own tokens/classes.
     Delete Account needs a server-side Edge Function (delete-account) since a user can't
     delete their own auth account from client-side JS — the client only re-verifies the
     password, then calls that function with the caller's access token. ---------------- */
  function openProfileSettings(){
    var content = document.getElementById('modal-content');
    var bg = document.getElementById('modal-bg');
    if (!content || !bg || !state.user) return;
    var currentName = displayName(state.user);
    var provider = (state.user.app_metadata && state.user.app_metadata.provider) || 'email';
    var providerLabel = provider === 'google' ? 'Google' : 'Email';

    content.innerHTML =
      '<button class="modal-close" onclick="closeModal()">&times;</button>' +
      '<h2>My Profile</h2><p class="sub">Manage your account details.</p>' +

      '<div class="field"><label>Signed up with ' + providerLabel + '</label>' +
      '<div style="background:var(--bg-raised);border:1.5px solid var(--line);border-radius:9px;padding:9px 11px;font-size:.85rem;word-break:break-all">' + state.user.email + '</div></div>' +
      '<div class="field"><label>Display Name</label><input type="text" id="settings-name" value="' + currentName.replace(/"/g,'&quot;') + '" placeholder="What should we call you?" maxlength="30"></div>' +
      '<button class="btn-primary" id="settings-save">Save Name</button>' +
      '<div class="auth-status" id="settings-status"></div>' +

      '<div class="section-title">Change Password</div>' +
      '<div class="field"><label>Current Password</label><div class="pwd-wrap"><input type="password" id="pwd-current" placeholder="Enter your current password" autocomplete="current-password"><button type="button" class="eye-btn" id="eye-current" aria-label="Show password">' + EYE_ICON + '</button></div></div>' +
      '<div class="field"><label>New Password</label><div class="pwd-wrap"><input type="password" id="pwd-new" placeholder="Create a new password" autocomplete="new-password"><button type="button" class="eye-btn" id="eye-new" aria-label="Show password">' + EYE_ICON + '</button></div>' +
      '<div class="field-hint">Must be at least 6 characters.</div></div>' +
      '<div class="field"><label>Confirm New Password</label><div class="pwd-wrap"><input type="password" id="pwd-new-confirm" placeholder="Re-enter your new password" autocomplete="new-password"><button type="button" class="eye-btn" id="eye-new-confirm" aria-label="Show password">' + EYE_ICON + '</button></div></div>' +
      '<button class="btn-primary" id="pwd-save">Change Password</button>' +
      '<div class="auth-status" id="pwd-status"></div>' +

      '<div class="section-title">Danger Zone</div>' +
      '<button class="btn-primary btn-danger" id="del-open">Delete My Account</button>' +
      '<div class="danger-box" id="del-box" style="display:none">' +
      '<label style="display:flex;align-items:flex-start;gap:8px;font-size:.78rem;color:var(--ink-soft);line-height:1.5;cursor:pointer;margin-bottom:12px">' +
      '<input type="checkbox" id="del-ack" style="margin-top:2px;flex-shrink:0">' +
      '<span>I understand that this will permanently delete my account, display name, and all saved mission results. This action cannot be undone. Enter your password to confirm.</span></label>' +
      '<div class="field"><label>Password</label><div class="pwd-wrap"><input type="password" id="del-pwd" placeholder="Enter your password" autocomplete="current-password"><button type="button" class="eye-btn" id="eye-del" aria-label="Show password">' + EYE_ICON + '</button></div></div>' +
      '<button class="btn-primary btn-danger" id="del-confirm">Permanently Delete My Account</button>' +
      '<div class="auth-status" id="del-status"></div>' +
      '</div>';
    bg.classList.add('open');

    wireEyeToggle('eye-current', 'pwd-current');
    wireEyeToggle('eye-new', 'pwd-new');
    wireEyeToggle('eye-new-confirm', 'pwd-new-confirm');
    wireEyeToggle('eye-del', 'del-pwd');

    document.getElementById('settings-save').onclick = function(){
      var newName = document.getElementById('settings-name').value.trim();
      var statusEl = document.getElementById('settings-status');
      var btn = document.getElementById('settings-save');
      if (!newName){ statusEl.textContent = 'Display name cannot be empty.'; statusEl.className = 'auth-status err'; return; }
      btn.disabled = true; statusEl.textContent = 'Saving...'; statusEl.className = 'auth-status';
      sb.auth.updateUser({ data: { display_name: newName } }).then(function(res){
        if (res.error){ statusEl.textContent = res.error.message; statusEl.className = 'auth-status err'; }
        else { renderWidget(); statusEl.textContent = 'Saved!'; statusEl.className = 'auth-status ok'; }
        btn.disabled = false;
      });
    };

    document.getElementById('pwd-save').onclick = function(){
      var current = document.getElementById('pwd-current').value;
      var next = document.getElementById('pwd-new').value;
      var confirmPwd = document.getElementById('pwd-new-confirm').value;
      var statusEl = document.getElementById('pwd-status');
      var btn = document.getElementById('pwd-save');
      statusEl.className = 'auth-status';
      if (!current || !next || !confirmPwd){ statusEl.textContent = 'Fill in all three password fields.'; statusEl.className = 'auth-status err'; return; }
      if (next !== confirmPwd){ statusEl.textContent = "New passwords don't match — check both fields."; statusEl.className = 'auth-status err'; return; }
      if (next.length < 6){ statusEl.textContent = 'New password should be at least 6 characters.'; statusEl.className = 'auth-status err'; return; }
      btn.disabled = true; statusEl.textContent = 'Updating...';
      sb.auth.updateUser({ current_password: current, password: next }).then(function(res){
        if (res.error){
          statusEl.textContent = res.error.message; statusEl.className = 'auth-status err'; btn.disabled = false;
        } else {
          statusEl.textContent = 'Password updated!'; statusEl.className = 'auth-status ok';
          document.getElementById('pwd-current').value = '';
          document.getElementById('pwd-new').value = '';
          document.getElementById('pwd-new-confirm').value = '';
          btn.disabled = false;
        }
      });
    };

    document.getElementById('del-open').onclick = function(){
      var box = document.getElementById('del-box');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };

    document.getElementById('del-confirm').onclick = function(){
      var ack = document.getElementById('del-ack').checked;
      var pwd = document.getElementById('del-pwd').value;
      var statusEl = document.getElementById('del-status');
      var btn = document.getElementById('del-confirm');
      statusEl.className = 'auth-status';
      if (!ack){ statusEl.textContent = 'Please tick the box to confirm you understand this deletes your account permanently.'; statusEl.className = 'auth-status err'; return; }
      if (!pwd){ statusEl.textContent = 'Enter your password to confirm.'; statusEl.className = 'auth-status err'; return; }
      btn.disabled = true; statusEl.textContent = 'Verifying password...';
      var email = state.user.email;
      sb.auth.signInWithPassword({ email: email, password: pwd }).then(function(pwRes){
        if (pwRes.error){
          statusEl.textContent = 'Incorrect password.'; statusEl.className = 'auth-status err'; btn.disabled = false;
          return;
        }
        statusEl.textContent = 'Deleting your account...';
        return sb.auth.getSession().then(function(sesRes){
          var session = sesRes.data && sesRes.data.session;
          return fetch(SUPABASE_URL + '/functions/v1/delete-account', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + (session ? session.access_token : '') }
          });
        }).then(function(resp){
          return resp.json().catch(function(){ return {}; }).then(function(result){
            if (!resp.ok) throw new Error(result.error || 'Could not delete account.');
            statusEl.textContent = 'Account deleted. Bye for now!'; statusEl.className = 'auth-status ok';
            setTimeout(function(){
              sb.auth.signOut().catch(function(){}).then(function(){
                location.href = BASE + 'index.html';
              });
            }, 1200);
          });
        }).catch(function(e){
          statusEl.textContent = (e && e.message) || 'Something went wrong.'; statusEl.className = 'auth-status err'; btn.disabled = false;
        });
      });
    };
  }

  /* ---------------- results: save (unit finish) + fetch (My Progress page) ----------------
     payload shape (built by each unit page): { unit_key, unit_title, xp_earned, concept_score,
     concept_out_of, life_score, life_out_of, mission1_succeeded, mission1_attempts,
     mission2_succeeded, mission2_attempts, raw_payload } */
  function saveResult(payload){
    if (!state.user){
      // Shouldn't normally happen (units are gated behind sign-in), but stay defensive —
      // e.g. a session token silently expiring mid-quiz. Queue it and flush on next sign-in.
      try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload)); } catch(e){}
      return Promise.resolve({ saved:false, queued:true });
    }
    return sb.from('coding_results').insert({
      user_id: state.user.id,
      unit_key: String(payload.unit_key),
      unit_title: payload.unit_title,
      xp_earned: payload.xp_earned || 0,
      concept_score: payload.concept_score,
      concept_out_of: payload.concept_out_of,
      life_score: payload.life_score,
      life_out_of: payload.life_out_of,
      mission1_succeeded: payload.mission1_succeeded,
      mission1_attempts: payload.mission1_attempts,
      mission2_succeeded: payload.mission2_succeeded,
      mission2_attempts: payload.mission2_attempts,
      raw_payload: payload.raw_payload || null
    }).then(function(res){
      return { saved: !res.error, error: res.error };
    });
  }

  function fetchResults(){
    if (!state.user) return Promise.resolve([]);
    return sb.from('coding_results')
      .select('unit_key, unit_title, xp_earned, concept_score, concept_out_of, life_score, life_out_of, mission1_succeeded, mission1_attempts, mission2_succeeded, mission2_attempts, completed_at, raw_payload')
      .order('completed_at', { ascending: false })
      .then(function(res){
        if (res.error){ console.error('coding-auth.js: fetchResults failed —', res.error.message); return []; }
        return res.data || [];
      });
  }

  /* ---------------- public API ---------------- */
  window.CodingAuth = {
    openAuth: openAuth,
    openProfileSettings: openProfileSettings,
    onChange: function(fn){ listeners.push(fn); if (state.ready) fn(state); },
    get user(){ return state.user; },
    get ready(){ return state.ready; },
    get displayName(){ return displayName(state.user); },
    updateDisplayName: function(name){ return sb.auth.updateUser({ data: { display_name: name } }); },
    saveResult: saveResult,
    fetchResults: fetchResults,
    client: sb
  };

  listeners.push(renderReactive);
  listeners.push(flushPending);

  /* ---------------- boot ---------------- */
  function boot(){
    sb.auth.getSession().then(function(res){
      var session = res.data && res.data.session;
      state.user = session ? session.user : null;
      state.ready = true;
      notify();

      sb.auth.onAuthStateChange(function(event, session){
        state.user = session ? session.user : null;
        notify();
      });
    }).catch(function(){
      state.ready = true;
      notify();
    });
  }
  boot();
})();
