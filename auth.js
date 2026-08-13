/* Breathe-Easy Returns — Firebase Google auth + 6 permission groups */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBnfbQ5qlfo0DD7HkryszeNGRclvj0i99Q",
    authDomain: "breathe-easy-performance.firebaseapp.com",
    projectId: "breathe-easy-performance",
    storageBucket: "breathe-easy-performance.firebasestorage.app",
    messagingSenderId: "42449914362",
    appId: "1:42449914362:web:0c727c239807c6da773c43"
  };

  /**
   * Six permission / UI groups.
   * Add or move emails anytime — no other code changes needed.
   *
   *  admin        — full access
   *  manager      — full team + costs; no issue log
   *  technician   — own page only (set tech: "Matthew" etc.)
   *  viewer       — team KPIs/charts; costs hidden
   *  finance      — team + costs; no issue log (empty for now)
   *  guest        — minimal (empty for now)
   */
  const GROUPS = {
    admin: {
      label: "Admin",
      canViewTeam: true,
      canViewAllTechs: true,
      canViewCosts: true,
      canViewIssueLog: true
    },
    manager: {
      label: "Manager",
      canViewTeam: true,
      canViewAllTechs: true,
      canViewCosts: true,
      canViewIssueLog: false
    },
    technician: {
      label: "Technician",
      canViewTeam: false,
      canViewAllTechs: false,
      canViewCosts: true,
      canViewIssueLog: false,
      selfOnly: true
    },
    viewer: {
      label: "Viewer",
      canViewTeam: true,
      canViewAllTechs: true,
      canViewCosts: false,
      canViewIssueLog: false
    },
    finance: {
      label: "Finance",
      canViewTeam: true,
      canViewAllTechs: true,
      canViewCosts: true,
      canViewIssueLog: false
    },
    guest: {
      label: "Guest",
      canViewTeam: true,
      canViewAllTechs: false,
      canViewCosts: false,
      canViewIssueLog: false
    }
  };

  // Email → group (+ optional tech name for Technician self-only)
  // Fill remaining emails later as needed.
  const USERS = {
    "jefflamb1992@gmail.com": { group: "admin" },

    "iamruby112@gmail.com": { group: "manager" },
    "joshua@breathe-easyhk.com": { group: "manager" },

    "matthewgross2001@gmail.com": { group: "technician", tech: "Matthew" },
    "tiagogiri334@gmail.com": { group: "technician", tech: "Tiago" },
    "iggi.king@gmail.com": { group: "technician", tech: "Iggi" },
    "neltrestium@gmail.com": { group: "technician", tech: "Nick" },
    "sudor23@gmail.com": { group: "technician", tech: "Alun" }

    // viewer / finance / guest — add emails when ready
  };

  window.BE_AUTH = {
    GROUPS: GROUPS,
    USERS: USERS,
    currentUser: null,
    currentGroup: null,
    currentPerms: null,
    currentTech: null
  };

  if (!window.firebase) {
    console.error("Firebase SDK missing");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  var gate = document.getElementById("auth-gate");
  var errEl = document.getElementById("auth-error");
  var btn = document.getElementById("btn-google");
  var userChip = document.getElementById("auth-user");

  function setError(msg) {
    if (!errEl) return;
    if (msg) {
      errEl.textContent = msg;
      errEl.style.display = "block";
    } else {
      errEl.textContent = "";
      errEl.style.display = "none";
    }
  }

  function showGate() {
    if (gate) gate.style.display = "";
    var root = document.getElementById("app-root");
    if (root) root.style.display = "none";
    window.BE_AUTH.currentUser = null;
    window.BE_AUTH.currentGroup = null;
    window.BE_AUTH.currentPerms = null;
    window.BE_AUTH.currentTech = null;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveUser(email) {
    var key = (email || "").toLowerCase();
    var entry = USERS[key];
    if (!entry) return null;
    var perms = GROUPS[entry.group];
    if (!perms) return null;
    return {
      email: key,
      group: entry.group,
      tech: entry.tech || null,
      perms: perms
    };
  }

  function showApp(user, profile) {
    if (gate) gate.style.display = "none";

    window.BE_AUTH.currentUser = user;
    window.BE_AUTH.currentGroup = profile.group;
    window.BE_AUTH.currentPerms = profile.perms;
    window.BE_AUTH.currentTech = profile.tech;

    if (userChip) {
      var label = profile.perms.label || profile.group;
      var name = user.displayName || user.email || "Signed in";
      userChip.innerHTML =
        escapeHtml(name) +
        ' <span class="auth-role">· ' + escapeHtml(label) + "</span>" +
        ' <button type="button" class="topbar-reload" id="btn-signout">Sign out</button>';
      var so = document.getElementById("btn-signout");
      if (so) {
        so.addEventListener("click", function () {
          auth.signOut();
        });
      }
    }

    if (typeof window.startDashboard === "function" && !window.__dashboardStarted) {
      window.__dashboardStarted = true;
      window.startDashboard();
    } else if (typeof window.applyPermissions === "function") {
      window.applyPermissions();
    }
  }

  if (btn) {
    btn.addEventListener("click", function () {
      setError("");
      btn.disabled = true;
      auth
        .signInWithPopup(provider)
        .catch(function (err) {
          console.error(err);
          setError(err.message || "Sign-in failed. Try again.");
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  // Local file / localhost preview bypasses Google (same as before)
  var isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.protocol === "file:";

  if (isLocal) {
    window.BE_AUTH.currentGroup = "admin";
    window.BE_AUTH.currentPerms = GROUPS.admin;
    window.BE_AUTH.currentTech = null;
    if (userChip) userChip.textContent = "Local preview · Admin";
    return;
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.__dashboardStarted = false;
      showGate();
      setError("");
      return;
    }
    var profile = resolveUser(user.email);
    if (!profile) {
      auth.signOut().then(function () {
        showGate();
        setError("This Google account is not authorised for this dashboard.");
      });
      return;
    }
    showApp(user, profile);
  });
})();
