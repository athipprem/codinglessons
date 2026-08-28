/* ============================================================
   Spark Academy — shared account script
   Include on every page, in this order:
     <script>window.SPARK_BASE = '';</script>            <!-- '../' on pages one folder deep, e.g. theloop_units/ -->
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="coding-auth.js"></script>               <!-- (path-adjusted to match SPARK_BASE) -->

   Each including page must provide, in its own HTML/CSS:
     #acct-wrap > #acct-btn (button) + #acct-menu (div)   — the widget mount, ALWAYS shown (signed-out
                                                             or signed-in — every page carries this, not
                                                             just pages with somewhere to sign in from)
     #modal-bg > #modal-content                            — the modal mount
     .modal / .field / .btn-primary / .btn-google /
     .divider / .toggle-line / .auth-status                 — CSS classes (see spark-academy.css)
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
  var BASE = window.SPARK_BASE || '';
  var PENDING_KEY = 'spark_pending_coding_result';

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
      btn.innerHTML = '<span id="acct-avatar">&#128273;</span><span>Sign In</span>';
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

  /* ---------------- account widget (always shows — signed-out state included) ---------------- */
  function renderWidget(){
    var btn = document.getElementById('acct-btn');
    var menu = document.getElementById('acct-menu');
    if (!btn || !menu) return;
    if (state.user){
      var name = displayName(state.user);
      btn.innerHTML = '<span id="acct-avatar">' + initials(name) + '</span><span>' + name + '</span>';
      btn.onclick = function(){ menu.classList.toggle('open'); };
      var items = '<button id="menu-progress">&#128202; My Progress</button>';
      if (typeof window.openProfileDemo === 'function') items += '<button id="menu-profile">&#9881;&#65039; My Profile</button>';
      items += '<button id="menu-home">&#127968; Mission Control</button>';
      items += '<button id="menu-signout">&#128682; Sign Out</button>';
      menu.innerHTML = items;
      document.getElementById('menu-progress').onclick = function(){ menu.classList.remove('open'); location.href = BASE + 'my-progress.html'; };
      var mf = document.getElementById('menu-profile');
      if (mf) mf.onclick = function(){ menu.classList.remove('open'); window.openProfileDemo(); };
      document.getElementById('menu-home').onclick = function(){ menu.classList.remove('open'); location.href = BASE + 'index.html'; };
      document.getElementById('menu-signout').onclick = function(){
        menu.classList.remove('open');
        sb.auth.signOut();
      };
    } else {
      btn.innerHTML = '<span id="acct-avatar">&#128273;</span><span>Sign In</span>';
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
      '<div class="field"><label>Password</label><input type="password" id="auth-password" placeholder="' + (mode === 'signup' ? 'Create a password' : 'Enter your password') + '" autocomplete="' + (mode === 'signup' ? 'new-password' : 'current-password') + '"></div>' +
      (mode === 'signup'
        ? '<div class="field"><label>Confirm Password</label><input type="password" id="auth-password-confirm" placeholder="Re-enter your password" autocomplete="new-password"></div>'
        : '') +
      '<button class="btn-primary" id="auth-submit">' + (mode === 'signin' ? 'Sign In' : 'Sign Up') + '</button>' +
      '<div class="auth-status" id="auth-status"></div>' +
      '<div class="divider">or</div>' +
      '<button class="btn-google" id="auth-google">' + GOOGLE_ICON + 'Continue with Google</button>' +
      '<div class="toggle-line">' + (mode === 'signin' ? 'New here? <a id="auth-switch">Create an account</a>' : 'Already have an account? <a id="auth-switch">Sign in</a>') + '</div>';
    bg.classList.add('open');

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
      .select('unit_key, unit_title, xp_earned, concept_score, concept_out_of, life_score, life_out_of, mission1_succeeded, mission1_attempts, mission2_succeeded, mission2_attempts, completed_at')
      .order('completed_at', { ascending: false })
      .then(function(res){
        if (res.error){ console.error('coding-auth.js: fetchResults failed —', res.error.message); return []; }
        return res.data || [];
      });
  }

  /* ---------------- public API ---------------- */
  window.CodingAuth = {
    openAuth: openAuth,
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
