/*
 * Browser-safe Firebase bridge.
 * The app is intentionally usable from a plain index.html opened directly.
 * Classic Firebase compat scripts do not depend on ES-module CORS rules,
 * while these small wrappers keep the rest of the app on the modular-style API.
 */
const initializeApp = (config) => firebase.initializeApp(config);

const getAuth = (app) => firebase.auth(app);
const createUserWithEmailAndPassword = (auth, email, password) =>
  auth.createUserWithEmailAndPassword(email, password);
const signInWithEmailAndPassword = (auth, email, password) =>
  auth.signInWithEmailAndPassword(email, password);
const sendEmailVerification = (user) => user.sendEmailVerification();
const sendPasswordResetEmail = (auth, email) => auth.sendPasswordResetEmail(email);
const signOut = (auth) => auth.signOut();
const onAuthStateChanged = (auth, callback) => auth.onAuthStateChanged(callback);
const reload = (user) => user.reload();
const updatePassword = (user, password) => user.updatePassword(password);
const EmailAuthProvider = {
  credential: (email, password) => firebase.auth.EmailAuthProvider.credential(email, password)
};
const reauthenticateWithCredential = (user, credential) =>
  user.reauthenticateWithCredential(credential);

const getDatabase = (app) => firebase.database(app);
const ref = (db, path = '') => db.ref(path);
const set = (reference, value) => reference.set(value);
const get = (reference) => reference.once('value');
const remove = (reference) => reference.remove();
const push = (reference) => reference.push();
const onValue = (reference, callback) => {
  const listener = (snap) => callback(snap);
  reference.on('value', listener);
  return () => reference.off('value', listener);
};
const off = (reference, eventType = 'value', callback) => reference.off(eventType, callback);
const onDisconnect = (reference) => reference.onDisconnect();
const update = (reference, value) => reference.update(value);
const runTransaction = (reference, updater) => reference.transaction(updater);
const orderByChild = (reference, child) => reference.orderByChild(child);
const startAt = (query, value) => query.startAt(value);
const endAt = (query, value) => query.endAt(value);
const limitToFirst = (query, value) => query.limitToFirst(value);

const getAnalytics = (app) => {
  try { return firebase.analytics(app); } catch { return null; }
};
const isSupported = () => Promise.resolve(false);

const firebaseConfig = {
  apiKey: 'AIzaSyBPaccZp9xDORMOg90xmFli_T-mKU-b2qU',
  authDomain: 'burmalda-ca660.firebaseapp.com',
  databaseURL: 'https://burmalda-ca660-default-rtdb.firebaseio.com',
  projectId: 'burmalda-ca660',
  storageBucket: 'burmalda-ca660.firebasestorage.app',
  messagingSenderId: '606414280995',
  appId: '1:606414280995:web:4e8941069019e0ae065496',
  measurementId: 'G-GX0G2819C0'
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

isSupported().then((supported) => {
  if (supported) getAnalytics(firebaseApp);
}).catch(() => {});

const appRoot = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');

if (!window.firebase) {
  appRoot.innerHTML = `
    <div class="boot">
      <div class="brand-mark large">б</div>
      <div class="boot-title">Не удалось загрузить Бурмалграм</div>
      <p style="max-width:520px;text-align:center;color:#6b7280;margin:12px 20px 0">
        Проверьте подключение к интернету: Firebase SDK загружается с gstatic.com.
      </p>
    </div>`;
  throw new Error('Firebase SDK was not loaded.');
}

const state = {
  screen: 'boot',
  authMode: 'login',
  authStep: 1,
  authLoading: false,
  authEmail: '',
  authPassword: '',
  authName: '',
  authUsername: '',
  authBirthDate: '',
  authAbout: '',
  user: null,
  profile: null,
  profiles: {},
  friends: {},
  requests: {},
  outgoingRequests: {},
  chats: {},
  chatActivity: {},
  chatListeners: new Map(),
  messageUnsubscribe: null,
  activeChatId: null,
  activeMessages: [],
  mobilePanel: 'sidebar',
  modal: null,
  settingsTab: 'profile',
  settingsDraft: null,
  searchTerm: '',
  composeText: '',
  theme: localStorage.getItem('burmalgram-theme') || 'light',
  compact: localStorage.getItem('burmalgram-compact') === '1',
  showConfirm: null,
  online: false,
  profileUnsubscribe: null,
  presenceUnsubscribe: null,
  directoryUnsubscribe: null,
  friendsUnsubscribe: null,
  requestsUnsubscribe: null,
  userChatsUnsubscribe: null,
  presenceDisconnect: null,
  registrationInProgress: false,
  searchRequestToken: 0,
  usernameCheckToken: 0
};

const icon = (name, size = 20) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m16.7 16.7 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-1.41 1.41-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-1.41-1.41.06-.06A1.65 1.65 0 0 0 9.6 15a1.65 1.65 0 0 0-1.51-1H8v-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06 1.41-1.41.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V6h2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 1.41 1.41-.06.06A1.65 1.65 0 0 0 19.4 10c.15.6.68 1 1.31 1H21v2h-.29c-.63 0-1.16.4-1.31 1Z"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    channel: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 3-6 3Z"/>',
    group: '<circle cx="12" cy="8" r="3"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M4 11a3 3 0 0 1 4-2.83M20 11a3 3 0 0 0-4-2.83"/>',
    chat: '<path d="M20 11.5a8.5 8.5 0 0 1-9 8.5 9.8 9.8 0 0 1-4.5-1l-4.5 1 1.4-3A8.2 8.2 0 0 1 3 11.5C3 6.8 7 3 12 3s8 3.8 8 8.5Z"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    moon: '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
    sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    edit: '<path d="m4 16-1 5 5-1L19 9l-4-4Z"/><path d="m13.5 5.5 4 4"/>',
    shield: '<path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    paperclip: '<path d="m21.5 11.5-8.9 8.9a6 6 0 0 1-8.5-8.5l9.4-9.4a4 4 0 0 1 5.7 5.7l-9.5 9.5a2 2 0 0 1-2.8-2.8L15 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2 2.5 3 5.5 3 9s-1 6.5-3 9c-2-2.5-3-5.5-3-9s1-6.5 3-9Z"/>',
    hash: '<path d="M10 3 8 21M16 3l-2 18M4 9h17M3 15h17"/>',
    userPlus: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    sparkle: '<path d="m12 3 1.2 4.1L17 8.3l-3.8 1.2L12 14l-1.2-4.5L7 8.3l3.8-1.2Z"/><path d="m19 14 .6 2 1.9.6-1.9.6-.6 2-.6-2-1.9-.6 1.9-.6Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };
  return `<svg class="ico ${size === 24 ? 'ico-lg' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
};

const escapeHTML = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const initials = (name = '?') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return escapeHTML((parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase() || '?');
};

const getInitials = (name = '?') => initials(name);

const normalizeUsername = (value) => value.toLowerCase().replace(/^@/, '').trim();

const validUsername = (value) => /^[a-z0-9_]{4,24}$/.test(normalizeUsername(value));

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
};

const formatDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date + 'T12:00:00'));
};

const errorText = (error) => {
  const code = error?.code || '';
  const map = {
    'auth/email-already-in-use': 'Эта почта уже зарегистрирована.',
    'auth/invalid-email': 'Проверьте адрес электронной почты.',
    'auth/weak-password': 'Пароль слишком простой. Используйте минимум 6 символов.',
    'auth/invalid-credential': 'Неверная почта или пароль.',
    'auth/user-not-found': 'Пользователь не найден.',
    'auth/wrong-password': 'Неверный пароль.',
    'auth/too-many-requests': 'Слишком много попыток. Попробуйте немного позже.',
    'auth/network-request-failed': 'Нет соединения с интернетом.',
    'auth/requires-recent-login': 'Для этой операции нужно войти в аккаунт заново.',
    'auth/operation-not-allowed': 'В Firebase не включён вход по email и паролю.',
    'auth/permission-denied': 'Firebase запретил эту операцию. Проверьте Security Rules.',
    'PERMISSION_DENIED': 'Firebase запретил эту операцию. Проверьте Security Rules.',
    'auth/invalid-api-key': 'Firebase отклонил API-ключ. Проверьте Firebase Config.',
    'auth/invalid-verification-code': 'Ссылка подтверждения недействительна. Запросите письмо ещё раз.'
  };
  return map[code] || error?.message || 'Что-то пошло не так. Попробуйте ещё раз.';
};

function toast(message, tone = 'neutral') {
  const node = document.createElement('div');
  node.className = `toast toast-${tone}`;
  node.innerHTML = `${tone === 'success' ? icon('check', 17) : tone === 'error' ? icon('info', 17) : icon('sparkle', 17)}<span>${escapeHTML(message)}</span>`;
  toastRoot.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 220);
  }, 3200);
}

function setTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.compact = state.compact ? 'true' : 'false';
  localStorage.setItem('burmalgram-theme', state.theme);
  localStorage.setItem('burmalgram-compact', state.compact ? '1' : '0');
}

setTheme();

function setScreen(screen) {
  state.screen = screen;
  render();
}

function render() {
  setTheme();
  if (state.screen === 'boot') {
    appRoot.innerHTML = `<div class="boot"><div class="brand-mark large">б</div><div class="boot-title">Бурмалграм</div><div class="loader"></div></div>`;
    return;
  }
  if (state.screen === 'auth') {
    renderAuth();
    return;
  }
  if (state.screen === 'verify') {
    renderVerify();
    return;
  }
  if (state.screen === 'app') {
    renderApp();
  }
}

function renderAuth() {
  const isLogin = state.authMode === 'login';
  const step = state.authStep;
  appRoot.innerHTML = `
    <div class="auth-shell">
      <div class="auth-glow auth-glow-a"></div>
      <div class="auth-glow auth-glow-b"></div>
      <div class="auth-card">
        <div class="auth-brand">
          <div class="brand-mark">б</div>
          <div><strong>Бурмалграм</strong><span>легко говорить, легко быть рядом</span></div>
        </div>
        ${isLogin ? renderLoginForm() : renderRegisterForm(step)}
        <div class="auth-foot">
          ${isLogin
            ? `Нет аккаунта? <button class="text-button" data-action="switch-auth" data-mode="register">Зарегистрироваться</button>`
            : `Уже есть аккаунт? <button class="text-button" data-action="switch-auth" data-mode="login">Войти</button>`}
        </div>
      </div>
      <div class="auth-note">Без звонков и файлов — только быстрые сообщения и сообщества.</div>
    </div>`;
}

function renderLoginForm() {
  return `
    <form class="auth-form" id="login-form">
      <div class="auth-heading"><span class="eyebrow">Добро пожаловать</span><h1>С возвращением</h1><p>Войдите, чтобы продолжить общение.</p></div>
      <label class="field"><span>Email</span><div class="input-wrap">${icon('mail')}<input name="email" type="email" autocomplete="email" placeholder="you@example.com" value="${escapeHTML(state.authEmail)}" required></div></label>
      <label class="field"><span>Пароль</span><div class="input-wrap">${icon('lock')}<input name="password" type="password" autocomplete="current-password" placeholder="Введите пароль" required></div></label>
      <button class="primary-button full" type="submit" ${state.authLoading ? 'disabled' : ''}>${state.authLoading ? '<span class="button-spinner"></span>' : 'Войти'}</button>
      <button class="link-button centered" type="button" data-action="forgot-password">Забыли пароль?</button>
    </form>`;
}

function renderRegisterForm(step) {
  const total = 4;
  const pct = Math.round((step / total) * 100);
  let content = '';
  if (step === 1) {
    content = `
      <div class="auth-heading"><span class="eyebrow">Шаг 1 из 4</span><h1>Создаём аккаунт</h1><p>Начнём с почты и надёжного пароля.</p></div>
      <label class="field"><span>Email</span><div class="input-wrap">${icon('mail')}<input id="reg-email" type="email" autocomplete="email" placeholder="you@example.com" value="${escapeHTML(state.authEmail)}" required></div></label>
      <label class="field"><span>Пароль</span><div class="input-wrap">${icon('lock')}<input id="reg-password" type="password" autocomplete="new-password" placeholder="Минимум 6 символов" minlength="6" value="${escapeHTML(state.authPassword)}" required></div></label>
      <button class="primary-button full" data-action="register-next">Продолжить ${icon('chevron', 17)}</button>`;
  } else if (step === 2) {
    content = `
      <div class="auth-heading"><span class="eyebrow">Шаг 2 из 4</span><h1>Как вас называть?</h1><p>Имя увидят друзья, а username поможет найти вас.</p></div>
      <label class="field"><span>Ваше имя</span><div class="input-wrap">${icon('user')}<input id="reg-name" type="text" maxlength="60" placeholder="Например, Оксана" value="${escapeHTML(state.authName)}" required></div></label>
      <label class="field"><span>Username</span><div class="input-wrap username-wrap"><b>@</b><input id="reg-username" type="text" inputmode="text" autocapitalize="none" maxlength="24" placeholder="burmalgram_user" value="${escapeHTML(state.authUsername)}" required></div><small>4–24 символа: латинские буквы, цифры и _.</small></label>
      <div class="auth-actions"><button class="secondary-button" data-action="register-back">Назад</button><button class="primary-button" data-action="register-next">Продолжить ${icon('chevron', 17)}</button></div>`;
  } else if (step === 3) {
    content = `
      <div class="auth-heading"><span class="eyebrow">Шаг 3 из 4</span><h1>Когда ваш день рождения?</h1><p>Дата нужна один раз для данных профиля и не показывается другим пользователям.</p></div>
      <label class="field"><span>Дата рождения</span><div class="input-wrap">${icon('calendar')}<input id="reg-birthday" type="date" max="${new Date().toISOString().slice(0, 10)}" value="${escapeHTML(state.authBirthDate)}" required></div></label>
      <div class="privacy-tip">${icon('shield', 18)} Дата рождения хранится отдельно от публичного профиля.</div>
      <div class="auth-actions"><button class="secondary-button" data-action="register-back">Назад</button><button class="primary-button" data-action="register-next">Продолжить ${icon('chevron', 17)}</button></div>`;
  } else {
    content = `
      <div class="auth-heading"><span class="eyebrow">Шаг 4 из 4</span><h1>Расскажите о себе</h1><p>Описание необязательно — его можно изменить позже в настройках.</p></div>
      <label class="field"><span>Описание <em>необязательно</em></span><textarea id="reg-about" maxlength="160" rows="5" placeholder="Например, люблю кино, музыку и спокойные чаты...">${escapeHTML(state.authAbout)}</textarea></label>
      <div class="char-count" data-for="reg-about">${state.authAbout.length}/160</div>
      <div class="auth-actions"><button class="secondary-button" data-action="register-back">Назад</button><button class="primary-button" data-action="register-finish" ${state.authLoading ? 'disabled' : ''}>${state.authLoading ? '<span class="button-spinner"></span>' : 'Создать аккаунт'}</button></div>`;
  }
  return `<div class="stepper"><div class="stepper-top"><span>Регистрация</span><b>${pct}%</b></div><div class="progress"><i style="width:${pct}%"></i></div></div><form class="auth-form register-form" id="register-form">${content}</form>`;
}

function renderVerify() {
  const email = state.user?.email || '';
  appRoot.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card verify-card">
        <div class="verify-icon">${icon('mail', 36)}</div>
        <div class="auth-heading"><span class="eyebrow">Почти готово</span><h1>Подтвердите почту</h1><p>Мы отправили письмо на <strong>${escapeHTML(email)}</strong>. Откройте его и нажмите кнопку подтверждения.</p></div>
        <div class="verify-steps"><div><b>1</b><span>Откройте письмо от Firebase</span></div><div><b>2</b><span>Нажмите «Подтвердить email»</span></div><div><b>3</b><span>Вернитесь сюда и обновите статус</span></div></div>
        <div class="privacy-tip">${icon('info', 18)} Не нашли письмо? Проверьте папки «Спам», «Промоакции» и «Корзина», затем обновите статус.</div>
        <div class="auth-actions vertical"><button class="primary-button full" data-action="refresh-verification">Я подтвердил почту</button><button class="secondary-button full" data-action="resend-verification">Отправить письмо ещё раз</button><button class="link-button centered" data-action="logout">Выйти</button></div>
      </div>
    </div>`;
}

function renderApp() {
  const profile = state.profile || { name: state.user?.displayName || 'Пользователь', username: '', about: '' };
  const chats = Object.values(state.chats).sort((a, b) => ((state.chatActivity[b.id]?.updatedAt || b.createdAt || 0) - (state.chatActivity[a.id]?.updatedAt || a.createdAt || 0)));
  const filtered = chats.filter((chat) => {
    const q = state.searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (chat.title || '').toLowerCase().includes(q) || (chat.description || '').toLowerCase().includes(q);
  });
  const showChat = state.mobilePanel === 'chat';
  appRoot.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar ${showChat ? 'mobile-hidden' : ''}">
        <div class="sidebar-head">
          <button class="brand-button" data-action="open-profile"><div class="brand-mark small">б</div><div><strong>Бурмалграм</strong><span>@${escapeHTML(profile.username || 'user')}</span></div></button>
          <button class="icon-button" title="Меню" data-action="toggle-menu">${icon('menu')}</button>
        </div>
        <div class="sidebar-tools">
          <div class="search-box">${icon('search')}<input id="chat-search" type="search" placeholder="Поиск" value="${escapeHTML(state.searchTerm)}"></div>
          <button class="circle-button" title="Создать" data-action="open-create-menu">${icon('plus', 21)}</button>
        </div>
        <div class="sidebar-section-label">Чаты</div>
        <div class="chat-list">
          ${filtered.length ? filtered.map(renderChatListItem).join('') : renderEmptyChatList()}
        </div>
        <div class="sidebar-bottom">
          <button class="profile-mini" data-action="open-profile"><div class="avatar">${getInitials(profile.name)}</div><div><b>${escapeHTML(profile.name)}</b><span>@${escapeHTML(profile.username)}</span></div><span class="online-dot ${state.online ? 'is-online' : ''}"></span></button>
        </div>
      </aside>
      <main class="main-view ${showChat ? 'mobile-visible' : ''}">${state.activeChatId && state.chats[state.activeChatId] ? renderChatView(state.chats[state.activeChatId]) : renderEmptyState()}</main>
      ${state.modal ? renderModal() : ''}
    </div>`;
}

function renderChatListItem(chat) {
  const active = chat.id === state.activeChatId;
  const profile = chat.type === 'dm' ? otherMemberProfile(chat) : null;
  const title = chat.type === 'dm' ? profile?.name || 'Личный чат' : chat.title;
  const sub = chat.type === 'channel' ? 'Канал' : chat.type === 'group' ? 'Группа' : profile?.username ? `@${profile.username}` : 'Личный чат';
  const activity = state.chatActivity[chat.id] || {};
  const last = activity.lastMessage || (chat.type === 'channel' ? chat.description : 'Начните общение');
  const badgeIcon = chat.type === 'channel' ? icon('channel', 18) : chat.type === 'group' ? icon('group', 18) : icon('chat', 18);
  return `<button class="chat-item ${active ? 'active' : ''}" data-action="open-chat" data-chat-id="${chat.id}"><div class="chat-avatar ${chat.type}">${chat.type === 'dm' ? getInitials(title) : badgeIcon}</div><div class="chat-preview"><div class="chat-preview-top"><b>${escapeHTML(title)}</b><time>${formatTime(chat.updatedAt || chat.createdAt)}</time></div><div class="chat-preview-bottom"><span>${escapeHTML(last || '')}</span>${chat.type !== 'dm' ? `<small>${escapeHTML(sub)}</small>` : ''}</div></div></button>`;
}

function renderEmptyChatList() {
  return `<div class="empty-sidebar"><div class="empty-icon">${icon('chat', 26)}</div><b>${state.searchTerm ? 'Ничего не найдено' : 'Пока тихо'}</b><span>${state.searchTerm ? 'Попробуйте другой запрос.' : 'Создайте чат или найдите друзей, чтобы начать.'}</span></div>`;
}

function renderEmptyState() {
  return `<section class="empty-view"><div class="empty-orb"><div class="brand-mark">б</div></div><h2>Добро пожаловать в Бурмалграм</h2><p>Выберите чат слева или создайте новый. Здесь только сообщения — без звонков и файлов.</p><button class="primary-button" data-action="open-create-menu">Создать чат ${icon('plus', 18)}</button></section>`;
}

function renderChatView(chat) {
  const other = chat.type === 'dm' ? otherMemberProfile(chat) : null;
  const title = chat.type === 'dm' ? other?.name || 'Личный чат' : chat.title;
  const username = chat.type === 'dm' ? (other?.username ? `@${other.username}` : 'личный чат') : `${chat.type === 'channel' ? 'Канал' : 'Группа'} · ${memberCount(chat)} участн.`;
  const canSend = chat.type !== 'channel' || chat.ownerId === state.user.uid;
  const messages = state.activeMessages;
  return `<section class="chat-view">
    <header class="chat-header"><button class="icon-button mobile-back" data-action="mobile-back">${icon('back')}</button><div class="chat-header-avatar ${chat.type}">${chat.type === 'dm' ? getInitials(title) : chat.type === 'group' ? icon('group', 21) : icon('channel', 21)}</div><div class="chat-header-copy"><h2>${escapeHTML(title)}</h2><span>${escapeHTML(username)}${chat.type === 'channel' ? (chat.ownerId === state.user.uid ? ' · вы автор' : ' · только чтение') : ''}</span></div><button class="icon-button" data-action="open-chat-info">${icon('more')}</button></header>
    <div class="message-scroll" id="message-scroll">${messages.length ? messages.map((message) => renderMessage(message)).join('') : renderMessageEmpty(chat)}</div>
    ${canSend ? `<form class="composer" id="message-form"><div class="composer-box"><textarea id="compose" rows="1" maxlength="4000" placeholder="Написать сообщение…">${escapeHTML(state.composeText)}</textarea><button class="send-button" type="submit" aria-label="Отправить">${icon('send', 19)}</button></div><div class="composer-note">Enter — отправить · Shift+Enter — новая строка</div></form>` : `<div class="readonly-banner">${icon('lock', 17)} Это канал. Публиковать сообщения может только создатель.</div>`}
  </section>`;
}

function renderMessage(message) {
  const mine = message.senderId === state.user.uid;
  const sender = state.profiles[message.senderId] || { name: 'Пользователь', username: '' };
  const multiline = escapeHTML(message.text).replaceAll('\n', '<br>');
  return `<div class="message-row ${mine ? 'mine' : ''}"><div class="message-avatar">${getInitials(sender.name)}</div><div class="message-bubble"><div class="message-meta"><b>${mine ? 'Вы' : escapeHTML(sender.name)}</b><time>${formatTime(message.createdAt)}</time></div><div class="message-text">${multiline}</div></div></div>`;
}

function renderMessageEmpty(chat) {
  const title = chat.type === 'dm' ? 'Первое сообщение' : chat.type === 'channel' ? 'Первый пост' : 'Первое сообщение';
  return `<div class="message-empty"><div class="message-empty-icon">${icon(chat.type === 'channel' ? 'channel' : 'chat', 25)}</div><b>${title}</b><span>${chat.type === 'channel' ? 'Создайте публикацию для подписчиков.' : 'Напишите что-нибудь приятное — чат только начинается.'}</span></div>`;
}

function renderModal() {
  const m = state.modal;
  if (m.type === 'create-menu') return `<div class="modal-backdrop" data-action="close-modal"><div class="sheet create-sheet" data-stop-click="true"><button class="icon-button modal-close" data-action="close-modal">${icon('close')}</button><span class="eyebrow">Новое</span><h2>Создать пространство</h2><p>Личный чат создаётся из списка друзей.</p><div class="choice-grid"><button class="choice-card" data-action="open-create-group"><div class="choice-icon group">${icon('group', 24)}</div><b>Группа</b><span>Общий чат с друзьями</span></button><button class="choice-card" data-action="open-create-channel"><div class="choice-icon channel">${icon('channel', 24)}</div><b>Канал</b><span>Публикации только от автора</span></button><button class="choice-card" data-action="open-find-friends"><div class="choice-icon friend">${icon('userPlus', 24)}</div><b>Найти друзей</b><span>Добавить людей по username</span></button></div></div></div>`;
  if (m.type === 'find-friends') return renderFindFriendsModal();
  if (m.type === 'create-group' || m.type === 'create-channel') return renderCreateCommunityModal(m.type);
  if (m.type === 'edit-community') return renderEditCommunityModal();
  if (m.type === 'profile') return renderProfileModal();
  if (m.type === 'settings') return renderSettingsModal();
  if (m.type === 'chat-info') return renderChatInfoModal();
  return '';
}

function renderFindFriendsModal() {
  const q = state.modal.query || '';
  const normalized = normalizeUsername(q);
  const results = Array.isArray(state.modal.results) ? state.modal.results : [];
  const loading = Boolean(state.modal.searching);
  const resultMarkup = loading
    ? `<div class="result-empty"><span class="button-spinner"></span> Ищем пользователя…</div>`
    : results.length
      ? results.map(([uid, p]) => renderFriendResult(uid, p)).join('')
      : `<div class="result-empty">${normalized ? 'Пользователь не найден.' : 'Введите username, чтобы начать поиск.'}</div>`;
  return `<div class="modal-backdrop" data-action="close-modal"><div class="sheet wide" data-stop-click="true"><div class="sheet-head"><div><span class="eyebrow">Друзья</span><h2>Найти пользователя</h2></div><button class="icon-button" data-action="close-modal">${icon('close')}</button></div><div class="search-box large-search">${icon('search')}<input id="friend-search" autocomplete="off" autofocus placeholder="Введите username" value="${escapeHTML(q)}"></div><div class="result-list">${resultMarkup}</div>${pendingRequestsForUser().length ? `<div class="requests-block"><div class="block-label">Входящие заявки</div>${pendingRequestsForUser().map(renderRequest).join('')}</div>` : ''}</div></div>`;
}

function renderFriendResult(uid, p) {
  const areFriends = Boolean(state.friends[uid]);
  const outgoing = Boolean(state.outgoingRequests?.[uid]);
  return `<div class="result-row"><div class="avatar">${getInitials(p.name)}</div><div class="result-copy"><b>${escapeHTML(p.name)}</b><span>@${escapeHTML(p.username)}</span>${p.about ? `<small>${escapeHTML(p.about)}</small>` : ''}</div>${areFriends ? `<span class="status-chip">${icon('check', 14)} Друзья</span>` : outgoing ? `<span class="status-chip subtle">Заявка отправлена</span>` : `<button class="secondary-button small" data-action="send-friend" data-uid="${uid}">${icon('userPlus', 15)} Добавить</button>`}</div>`;
}

function renderRequest(request) {
  const p = state.profiles[request.fromUid] || { name: 'Пользователь', username: '' };
  return `<div class="result-row"><div class="avatar">${getInitials(p.name)}</div><div class="result-copy"><b>${escapeHTML(p.name)}</b><span>@${escapeHTML(p.username)}</span></div><div class="inline-actions"><button class="primary-button small" data-action="accept-friend" data-uid="${request.fromUid}">Принять</button><button class="secondary-button small" data-action="decline-friend" data-uid="${request.fromUid}">Отклонить</button></div></div>`;
}

function renderCreateCommunityModal(type) {
  const selected = new Set(state.modal.selected || []);
  const friends = Object.keys(state.friends || {}).map((uid) => [uid, state.profiles[uid]]).filter(([, p]) => p);
  const label = type === 'channel' ? 'канал' : 'группу';
  return `<div class="modal-backdrop" data-action="close-modal"><div class="sheet wide" data-stop-click="true"><div class="sheet-head"><div><span class="eyebrow">Новое пространство</span><h2>Создать ${label}</h2></div><button class="icon-button" data-action="close-modal">${icon('close')}</button></div><div class="modal-form"><label class="field"><span>Название</span><input id="community-title" maxlength="80" placeholder="Например, Наша компания" value="${escapeHTML(state.modal.title || '')}"></label><label class="field"><span>Описание</span><textarea id="community-description" maxlength="220" rows="3" placeholder="Коротко о чате">${escapeHTML(state.modal.description || '')}</textarea></label><div class="section-head"><div><b>Добавить участников</b><span>Только ваши друзья</span></div><span class="selected-count">${selected.size}</span></div><div class="member-picker">${friends.length ? friends.map(([uid, p]) => `<button class="member-choice ${selected.has(uid) ? 'selected' : ''}" data-action="toggle-member" data-uid="${uid}"><div class="avatar">${getInitials(p.name)}</div><div><b>${escapeHTML(p.name)}</b><span>@${escapeHTML(p.username)}</span></div><span class="check-circle">${selected.has(uid) ? icon('check', 15) : ''}</span></button>`).join('') : `<div class="result-empty">Сначала добавьте друзей.</div>`}</div><div class="modal-footer"><button class="secondary-button" data-action="close-modal">Отмена</button><button class="primary-button" data-action="create-community">Создать ${type === 'channel' ? 'канал' : 'группу'}</button></div></div></div></div>`;
}

function renderEditCommunityModal() {
  const chat = state.chats[state.activeChatId];
  if (!chat || chat.type === 'dm' || chat.ownerId !== state.user.uid) return '';
  const selected = new Set(state.modal.selected || []);
  const currentMembers = new Set(Object.keys(chat.members || {}).filter((uid) => uid !== state.user.uid));
  const candidateIds = Array.from(new Set([
    ...Object.keys(state.friends || {}),
    ...currentMembers
  ]));
  const candidates = candidateIds.map((uid) => [uid, state.profiles[uid]]).filter(([, p]) => p);
  return `<div class="modal-backdrop" data-action="close-modal"><div class="sheet wide" data-stop-click="true"><div class="sheet-head"><div><span class="eyebrow">Настройка ${chat.type === 'channel' ? 'канала' : 'группы'}</span><h2>Редактировать</h2></div><button class="icon-button" data-action="close-modal">${icon('close')}</button></div><div class="modal-form"><label class="field"><span>Название</span><input id="community-title" maxlength="80" value="${escapeHTML(state.modal.title || chat.title || '')}"></label><label class="field"><span>Описание</span><textarea id="community-description" maxlength="220" rows="3">${escapeHTML(state.modal.description || chat.description || '')}</textarea></label><div class="section-head"><div><b>Участники</b><span>Добавлять можно друзей. Создатель всегда остаётся в чате.</span></div><span class="selected-count">${selected.size}</span></div><div class="member-picker">${candidates.length ? candidates.map(([uid, p]) => `<button class="member-choice ${selected.has(uid) ? 'selected' : ''}" data-action="toggle-edit-member" data-uid="${uid}"><div class="avatar">${getInitials(p.name)}</div><div><b>${escapeHTML(p.name)}</b><span>@${escapeHTML(p.username)}</span></div><span class="check-circle">${selected.has(uid) ? icon('check', 15) : ''}</span></button>`).join('') : `<div class="result-empty">Добавьте друзей, чтобы пригласить их.</div>`}</div><div class="modal-footer"><button class="secondary-button" data-action="close-modal">Отмена</button><button class="primary-button" data-action="save-community">Сохранить</button></div></div></div></div>`;
}

function renderProfileModal() {
  const p = state.profile || {};
  return `<div class="modal-backdrop" data-action="close-modal"><div class="sheet profile-sheet" data-stop-click="true"><div class="profile-hero"><button class="icon-button inverse" data-action="close-modal">${icon('close')}</button><div class="avatar avatar-xl">${getInitials(p.name)}</div><h2>${escapeHTML(p.name)}</h2><span>@${escapeHTML(p.username)}</span>${p.about ? `<p>${escapeHTML(p.about)}</p>` : ''}</div><div class="profile-body"><div class="profile-actions"><button class="secondary-button" data-action="open-settings">${icon('settings', 17)} Настройки</button><button class="secondary-button" data-action="open-find-friends">${icon('userPlus', 17)} Друзья</button></div><div class="profile-stats"><div><b>${Object.keys(state.friends).length}</b><span>друзей</span></div><div><b>${Object.keys(state.chats).length}</b><span>чатов</span></div><div><b>${state.online ? 'Да' : 'Нет'}</b><span>онлайн</span></div></div><div class="profile-lines"><div>${icon('mail')}<div><span>Email</span><b>${escapeHTML(state.user.email || '')}</b></div></div><div>${icon('calendar')}<div><span>Дата рождения</span><b>${formatDate(p.birthDate)}</b></div></div></div><button class="danger-button full" data-action="logout">${icon('logout', 17)} Выйти из аккаунта</button></div></div></div>`;
}

function renderSettingsModal() {
  const p = state.profile || {};
  const tab = state.settingsTab;
  const d = state.settingsDraft || { name: p.name || '', username: p.username || '', about: p.about || '' };
  const content = tab === 'profile' ? `
      <div class="settings-panel"><div class="settings-cover"><div class="avatar avatar-lg">${getInitials(d.name)}</div><div><h3>Профиль</h3><p>Информация, которую увидят другие пользователи.</p></div></div><label class="field"><span>Имя</span><input id="settings-name" maxlength="60" value="${escapeHTML(d.name)}"></label><label class="field"><span>Username</span><div class="input-wrap username-wrap"><b>@</b><input id="settings-username" maxlength="24" autocapitalize="none" value="${escapeHTML(d.username)}"></div><small id="username-status" class="username-status">Проверяем уникальность…</small></label><label class="field"><span>О себе</span><textarea id="settings-about" maxlength="160" rows="4">${escapeHTML(d.about)}</textarea></label><button class="primary-button full" data-action="save-profile">Сохранить изменения</button></div>` : tab === 'appearance' ? `
      <div class="settings-panel"><div class="settings-cover"><div class="settings-icon">${icon(state.theme === 'dark' ? 'moon' : 'sun', 24)}</div><div><h3>Внешний вид</h3><p>Настройте спокойный ритм интерфейса.</p></div></div><button class="setting-row" data-action="toggle-theme"><div class="setting-leading">${icon(state.theme === 'dark' ? 'moon' : 'sun')}<div><b>Тёмная тема</b><span>Переключить оформление приложения</span></div></div><span class="switch ${state.theme === 'dark' ? 'on' : ''}"><i></i></span></button><button class="setting-row" data-action="toggle-compact"><div class="setting-leading">${icon('menu')}<div><b>Компактные чаты</b><span>Меньше воздуха в списке сообщений</span></div></div><span class="switch ${state.compact ? 'on' : ''}"><i></i></span></button></div>` : tab === 'security' ? `
      <div class="settings-panel"><div class="settings-cover"><div class="settings-icon">${icon('shield', 24)}</div><div><h3>Безопасность</h3><p>Ваш аккаунт использует Firebase Authentication.</p></div></div><div class="info-card">${icon('mail', 18)}<div><b>Email подтверждён</b><span>${escapeHTML(state.user.email || '')}</span></div><span class="status-chip">Подтверждено</span></div><button class="setting-row" data-action="send-password-reset"><div class="setting-leading">${icon('lock')}<div><b>Сменить пароль</b><span>Письмо со ссылкой для смены пароля</span></div></div>${icon('chevron', 17)}</button><div class="info-card muted">${icon('info', 18)}<div><b>Фото, файлы и звонки</b><span>Не подключены в этой версии Бурмалграма.</span></div></div></div>` : `
      <div class="settings-panel"><div class="settings-cover"><div class="settings-icon">${icon('bell', 24)}</div><div><h3>Уведомления</h3><p>Настройки интерфейса подготовлены для будущих уведомлений.</p></div></div><div class="info-card muted">${icon('bell', 18)}<div><b>Уведомления браузера</b><span>Включение push-уведомлений можно добавить позже.</span></div></div></div>`;
  return `<div class="modal-backdrop" data-action="close-modal"><div class="sheet settings-sheet" data-stop-click="true"><div class="sheet-head"><div><span class="eyebrow">Аккаунт</span><h2>Настройки</h2></div><button class="icon-button" data-action="close-modal">${icon('close')}</button></div><div class="settings-layout"><nav class="settings-nav"><button class="${tab === 'profile' ? 'selected' : ''}" data-action="settings-tab" data-tab="profile">${icon('user')} Профиль</button><button class="${tab === 'appearance' ? 'selected' : ''}" data-action="settings-tab" data-tab="appearance">${icon('sun')} Внешний вид</button><button class="${tab === 'security' ? 'selected' : ''}" data-action="settings-tab" data-tab="security">${icon('shield')} Безопасность</button><button class="${tab === 'notifications' ? 'selected' : ''}" data-action="settings-tab" data-tab="notifications">${icon('bell')} Уведомления</button></nav>${content}</div></div></div>`;
}

function renderChatInfoModal() {
  const chat = state.chats[state.activeChatId];
  if (!chat) return '';
  const memberIds = Object.keys(chat.members || {});
  return `<div class="modal-backdrop" data-action="close-modal"><div class="sheet info-sheet" data-stop-click="true"><div class="sheet-head"><div><span class="eyebrow">О чате</span><h2>${escapeHTML(chat.title || 'Личный чат')}</h2></div><button class="icon-button" data-action="close-modal">${icon('close')}</button></div><div class="community-card"><div class="community-avatar ${chat.type}">${chat.type === 'dm' ? getInitials(otherMemberProfile(chat)?.name || 'П') : chat.type === 'group' ? icon('group', 30) : icon('channel', 30)}</div><div><b>${escapeHTML(chat.title || otherMemberProfile(chat)?.name || '')}</b><span>${chat.type === 'channel' ? 'Канал' : chat.type === 'group' ? 'Группа' : 'Личный чат'}</span></div></div>${chat.description ? `<p class="modal-description">${escapeHTML(chat.description)}</p>` : ''}<div class="member-summary">${icon('users', 18)} <b>${memberIds.length}</b> участников</div>${chat.ownerId === state.user.uid && chat.type !== 'dm' ? `<div class="owner-badge">${icon('sparkle', 16)} Вы создатель</div><button class="primary-button full" data-action="open-edit-community">${icon('edit', 17)} Настроить ${chat.type === 'channel' ? 'канал' : 'группу'}</button>` : ''}${chat.type !== 'dm' ? `<div class="member-list">${memberIds.map((uid) => { const p = state.profiles[uid] || {}; return `<div class="member-row"><div class="avatar">${getInitials(p.name || '?')}</div><div><b>${escapeHTML(p.name || 'Пользователь')}</b><span>@${escapeHTML(p.username || '')}</span></div>${uid === chat.ownerId ? '<small>создатель</small>' : ''}</div>`; }).join('')}</div>` : ''}</div></div>`;
}

function otherMemberProfile(chat) {
  const otherId = Object.keys(chat.members || {}).find((uid) => uid !== state.user?.uid);
  return otherId ? state.profiles[otherId] : null;
}

function memberCount(chat) {
  return Object.keys(chat.members || {}).length;
}

function pendingRequestsForUser() {
  return Object.values(state.requests || {}).filter((r) => r && r.status === 'pending' && r.fromUid && r.toUid === state.user.uid);
}

async function reserveUsername(username, uid) {
  const key = normalizeUsername(username);
  if (!validUsername(key)) throw new Error('Username должен содержать 4–24 символа: a-z, 0-9 или _.');
  const target = ref(db, `usernames/${key}`);
  const existing = await get(target);
  if (existing.exists() && existing.val() !== uid) throw new Error('Этот username уже занят.');
  try {
    const tx = await runTransaction(target, (current) => {
      if (current === null || current === uid) return uid;
      return current;
    });
    if (!tx.committed || tx.snapshot.val() !== uid) throw new Error('Этот username уже занят.');
  } catch (e) {
    if (e?.message === 'Этот username уже занят.') throw e;
    const latest = await get(target).catch(() => null);
    if (latest?.exists() && latest.val() !== uid) throw new Error('Этот username уже занят.');
    throw e;
  }
  return key;
}

async function releaseUsername(username, uid) {
  if (!username) return;
  const target = ref(db, `usernames/${normalizeUsername(username)}`);
  const snap = await get(target);
  if (snap.exists() && snap.val() === uid) await remove(target);
}

async function checkUsernameAvailability(username, ownUid = state.user?.uid) {
  const key = normalizeUsername(username);
  if (!validUsername(key)) return { valid: false, available: false, own: false };
  const snap = await get(ref(db, `usernames/${key}`));
  if (!snap.exists()) return { valid: true, available: true, own: false };
  return { valid: true, available: snap.val() === ownUid, own: snap.val() === ownUid };
}

let friendSearchTimer = null;

async function searchFriends(query) {
  const normalized = normalizeUsername(query);
  if (!state.modal || state.modal.type !== 'find-friends') return;
  state.modal.query = query;
  state.modal.results = [];
  if (friendSearchTimer) clearTimeout(friendSearchTimer);
  const list = document.querySelector('.result-list');
  if (!normalized) {
    state.modal.searching = false;
    if (list) list.innerHTML = `<div class="result-empty">Введите username, чтобы начать поиск.</div>`;
    return;
  }
  state.modal.searching = true;
  if (list) list.innerHTML = `<div class="result-empty"><span class="button-spinner"></span> Ищем пользователя…</div>`;
  const token = ++state.searchRequestToken;
  friendSearchTimer = setTimeout(async () => {
    try {
      const base = ref(db, 'publicProfiles');
      const q = limitToFirst(endAt(startAt(orderByChild(base, 'username'), normalized), normalized + '\uf8ff'), 8);
      const snap = await get(q);
      if (!state.modal || state.modal.type !== 'find-friends' || token !== state.searchRequestToken) return;
      const raw = snap.val() || {};
      state.modal.results = Object.entries(raw).filter(([uid]) => uid !== state.user.uid);
      const currentList = document.querySelector('.result-list');
      if (currentList) currentList.innerHTML = state.modal.results.length
        ? state.modal.results.map(([uid, p]) => renderFriendResult(uid, p)).join('')
        : `<div class="result-empty">Пользователь не найден.</div>`;
    } catch (e) {
      if (state.modal && state.modal.type === 'find-friends' && token === state.searchRequestToken) {
        state.modal.results = [];
        const currentList = document.querySelector('.result-list');
        if (currentList) currentList.innerHTML = `<div class="result-empty">Не удалось выполнить поиск.</div>`;
        toast(errorText(e), 'error');
      }
    } finally {
      if (state.modal && state.modal.type === 'find-friends' && token === state.searchRequestToken) {
        state.modal.searching = false;
      }
    }
  }, 180);
}

async function createProfileFromRegistration() {
  const uid = state.user.uid;
  const username = await reserveUsername(state.authUsername, uid);
  const profile = {
    name: state.authName.trim(),
    username,
    birthDate: state.authBirthDate,
    about: state.authAbout.trim(),
    createdAt: Date.now()
  };
  try {
    await update(ref(db), {
      [`users/${uid}`]: profile,
      [`publicProfiles/${uid}`]: {
        name: profile.name,
        username: profile.username,
        about: profile.about
      }
    });
  } catch (e) {
    await releaseUsername(username, uid).catch(() => {});
    throw e;
  }
}

async function ensurePublicProfile() {
  const uid = state.user.uid;
  const snap = await get(ref(db, `users/${uid}`));
  if (!snap.exists()) {
    state.authMode = 'register';
    state.authStep = 4;
    state.authName = state.user.displayName || '';
    state.authUsername = '';
    state.authAbout = '';
    setScreen('auth');
  }
}

function subscribeRealtime() {
  cleanupRealtime();
  const uid = state.user.uid;
  state.profileUnsubscribe = onValue(ref(db, `users/${uid}`), (snap) => {
    state.profile = snap.val() || null;
    if (state.screen === 'app' && !state.modal) render();
  });
  state.directoryUnsubscribe = onValue(ref(db, 'publicProfiles'), (snap) => {
    state.profiles = snap.val() || {};
    if (state.screen === 'app') render();
  });
  state.friendsUnsubscribe = onValue(ref(db, `friends/${uid}`), (snap) => {
    state.friends = snap.val() || {};
    if (state.screen === 'app') render();
  });
  state.requestsUnsubscribe = onValue(ref(db, `friendRequests/${uid}`), (snap) => {
    state.requests = snap.val() || {};
    if (state.screen === 'app' && state.modal?.type === 'find-friends') render();
  });
  state.userChatsUnsubscribe = onValue(ref(db, `userChats/${uid}`), (snap) => syncChatListeners(snap.val() || {}));
  bindPresence(uid).catch(() => {});
}

function cleanupRealtime() {
  [state.profileUnsubscribe, state.directoryUnsubscribe, state.friendsUnsubscribe, state.requestsUnsubscribe, state.userChatsUnsubscribe].forEach((unsub) => typeof unsub === 'function' && unsub());
  state.profileUnsubscribe = state.directoryUnsubscribe = state.friendsUnsubscribe = state.requestsUnsubscribe = state.userChatsUnsubscribe = null;
  state.chatListeners.forEach((unsubs) => Array.isArray(unsubs) ? unsubs.forEach((unsub) => typeof unsub === 'function' && unsub()) : (typeof unsubs === 'function' && unsubs()));
  state.chatListeners.clear();
  state.chatActivity = {};
  if (typeof state.presenceUnsubscribe === 'function') state.presenceUnsubscribe();
  state.presenceUnsubscribe = null;
  if (state.messageUnsubscribe) state.messageUnsubscribe();
  state.messageUnsubscribe = null;
}

function syncChatListeners(chatIndex) {
  const ids = new Set(Object.keys(chatIndex));
  for (const [id, unsubs] of state.chatListeners.entries()) {
    if (!ids.has(id)) {
      (Array.isArray(unsubs) ? unsubs : [unsubs]).forEach((unsub) => typeof unsub === 'function' && unsub());
      state.chatListeners.delete(id);
      delete state.chats[id];
      delete state.chatActivity[id];
    }
  }
  ids.forEach((id) => {
    if (state.chatListeners.has(id)) return;
    const chatUnsub = onValue(ref(db, `chats/${id}`), (snap) => {
      const data = snap.val();
      if (!data) return;
      state.chats[id] = { id, ...data };
      if (state.activeChatId === id && state.screen === 'app') {
        renderChatOnly();
      } else if (state.screen === 'app') {
        render();
      }
    });
    const activityUnsub = onValue(ref(db, `chatActivity/${id}`), (snap) => {
      state.chatActivity[id] = snap.val() || {};
      if (state.screen === 'app') render();
    });
    state.chatListeners.set(id, [chatUnsub, activityUnsub]);
  });
  if (!ids.size && state.activeChatId) {
    state.activeChatId = null;
    state.activeMessages = [];
    if (state.screen === 'app') render();
  }
}

async function bindPresence(uid) {
  const connected = ref(db, '.info/connected');
  state.presenceUnsubscribe = onValue(connected, async (snap) => {
    state.online = snap.val() === true;
    if (!state.online) return;
    const presenceRef = ref(db, `presence/${uid}`);
    state.presenceDisconnect = onDisconnect(presenceRef);
    await state.presenceDisconnect.set({ state: 'offline', updatedAt: Date.now() }).catch(() => {});
    await set(presenceRef, { state: 'online', updatedAt: Date.now() }).catch(() => {});
    if (state.screen === 'app') render();
  });
}

async function openChat(chatId) {
  state.activeChatId = chatId;
  state.activeMessages = [];
  state.composeText = '';
  state.mobilePanel = 'chat';
  if (state.messageUnsubscribe) state.messageUnsubscribe();
  state.messageUnsubscribe = onValue(ref(db, `chatMessages/${chatId}`), (snap) => {
    const raw = snap.val() || {};
    state.activeMessages = Object.entries(raw).map(([id, value]) => ({ id, ...value })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    renderChatOnly();
  }, (error) => toast(errorText(error), 'error'));
  render();
  setTimeout(scrollMessagesToBottom, 30);
}

function renderChatOnly() {
  const main = document.querySelector('.main-view');
  if (!main || !state.activeChatId || !state.chats[state.activeChatId]) return render();
  main.innerHTML = renderChatView(state.chats[state.activeChatId]);
  setTimeout(scrollMessagesToBottom, 10);
}

function scrollMessagesToBottom() {
  const el = document.querySelector('#message-scroll');
  if (el) el.scrollTop = el.scrollHeight;
}

async function createDm(friendUid) {
  if (!state.friends[friendUid] && friendUid !== state.user.uid) {
    return toast('Личный чат можно создать только с другом.', 'error');
  }
  const ids = [state.user.uid, friendUid].sort();
  const chatId = `dm_${ids.join('_')}`;
  if (!state.chats[chatId]) {
    const friend = state.profiles[friendUid] || { name: 'Друг' };
    const now = Date.now();
    const data = {
      type: 'dm',
      title: friend.name,
      description: '',
      ownerId: state.user.uid,
      members: { [ids[0]]: true, [ids[1]]: true },
      createdAt: now
    };
    await set(ref(db, `chats/${chatId}`), data);
    await set(ref(db, `chatActivity/${chatId}`), { lastMessage: '', lastSenderId: '', updatedAt: now });
    await Promise.all(ids.map((uid) => set(ref(db, `userChats/${uid}/${chatId}`), true)));
    state.chats[chatId] = { id: chatId, ...data };
    state.chatActivity[chatId] = { lastMessage: '', lastSenderId: '', updatedAt: now };
  }
  await openChat(chatId);
}

async function createCommunity(type) {
  const m = state.modal;
  const title = (m.title || '').trim();
  const description = (m.description || '').trim();
  const selected = Array.from(new Set(m.selected || [])).filter((uid) => uid !== state.user.uid && state.friends[uid]);
  if (title.length < 1) return toast('Введите название.', 'error');
  const now = Date.now();
  const chatRef = push(ref(db, 'chats'));
  const chatId = chatRef.key;
  const members = { [state.user.uid]: true, ...Object.fromEntries(selected.map((uid) => [uid, true])) };
  const data = { type, title, description, ownerId: state.user.uid, members, createdAt: now };
  try {
    // Write the chat first so the userChats rule can verify membership.
    await set(chatRef, data);
    await set(ref(db, `chatActivity/${chatId}`), { lastMessage: '', lastSenderId: '', updatedAt: now });
    await Promise.all(Object.keys(members).map((uid) => set(ref(db, `userChats/${uid}/${chatId}`), true)));
    state.chats[chatId] = { id: chatId, ...data };
    state.chatActivity[chatId] = { lastMessage: '', lastSenderId: '', updatedAt: now };
    state.modal = null;
    toast(type === 'channel' ? 'Канал создан.' : 'Группа создана.', 'success');
    await openChat(chatId);
  } catch (e) {
    toast(errorText(e), 'error');
  }
}

async function saveCommunity() {
  const chat = state.chats[state.activeChatId];
  if (!chat || chat.type === 'dm' || chat.ownerId !== state.user.uid) return;
  const m = state.modal;
  const title = (m.title || '').trim();
  const description = (m.description || '').trim();
  if (!title) return toast('Введите название.', 'error');
  if (title.length > 80 || description.length > 220) return toast('Проверьте длину названия и описания.', 'error');
  const oldMembers = new Set(Object.keys(chat.members || {}).filter((uid) => uid !== state.user.uid));
  const newMembers = new Set((m.selected || []).filter((uid) => uid !== state.user.uid));
  const additions = [...newMembers].filter((uid) => !oldMembers.has(uid));
  const removals = [...oldMembers].filter((uid) => !newMembers.has(uid));
  if (additions.some((uid) => !state.friends[uid])) return toast('Добавлять можно только друзей.', 'error');
  try {
    await update(ref(db, `chats/${chat.id}`), { title, description });
    for (const uid of additions) {
      await set(ref(db, `chats/${chat.id}/members/${uid}`), true);
      await set(ref(db, `userChats/${uid}/${chat.id}`), true);
    }
    for (const uid of removals) {
      if (uid === state.user.uid) continue;
      await remove(ref(db, `userChats/${uid}/${chat.id}`));
      await remove(ref(db, `chats/${chat.id}/members/${uid}`));
    }
    state.chats[chat.id] = { ...chat, title, description, members: { [state.user.uid]: true, ...Object.fromEntries([...newMembers].map((uid) => [uid, true])) } };
    state.modal = { type: 'chat-info' };
    toast('Настройки сохранены.', 'success');
    render();
  } catch (e) {
    toast(errorText(e), 'error');
  }
}

async function sendMessage(chat) {
  const input = document.querySelector('#compose');
  const text = (input?.value || state.composeText || '').trim();
  if (!text || text.length > 4000) return;
  if (chat.type === 'channel' && chat.ownerId !== state.user.uid) return;
  const messageRef = push(ref(db, `chatMessages/${chat.id}`));
  const now = Date.now();
  try {
    await update(ref(db), {
      [`chatMessages/${chat.id}/${messageRef.key}`]: { senderId: state.user.uid, text, createdAt: now },
      [`chatActivity/${chat.id}`]: { lastMessage: text.slice(0, 120), lastSenderId: state.user.uid, updatedAt: now }
    });
    state.composeText = '';
    const field = document.querySelector('#compose');
    if (field) field.value = '';
    setTimeout(scrollMessagesToBottom, 20);
  } catch (e) {
    toast(errorText(e), 'error');
  }
}

async function sendFriendRequest(uid) {
  if (uid === state.user.uid || state.friends[uid]) return;
  const [outgoing, incoming] = await Promise.all([
    get(ref(db, `friendRequests/${uid}/${state.user.uid}`)),
    get(ref(db, `friendRequests/${state.user.uid}/${uid}`))
  ]);
  if (outgoing.exists()) return toast('Заявка уже отправлена.', 'neutral');
  if (incoming.exists()) return acceptFriend(uid);
  const now = Date.now();
  try {
    await set(ref(db, `friendRequests/${uid}/${state.user.uid}`), { fromUid: state.user.uid, toUid: uid, status: 'pending', createdAt: now });
    state.outgoingRequests[uid] = true;
    toast('Заявка отправлена.', 'success');
    if (state.modal?.type === 'find-friends') render();
  } catch (e) {
    toast(errorText(e), 'error');
  }
}

async function acceptFriend(uid) {
  try {
    const me = state.user.uid;
    await update(ref(db), {
      [`friends/${me}/${uid}`]: true,
      [`friends/${uid}/${me}`]: true,
      [`friendRequests/${me}/${uid}`]: null
    });
    state.friends[uid] = true;
    toast('Теперь вы друзья.', 'success');
    state.modal = null;
    await createDm(uid);
  } catch (e) {
    toast(errorText(e), 'error');
  }
}

async function declineFriend(uid) {
  try {
    await remove(ref(db, `friendRequests/${state.user.uid}/${uid}`));
    toast('Заявка отклонена.');
    render();
  } catch (e) {
    toast(errorText(e), 'error');
  }
}

async function saveProfile() {
  const uid = state.user.uid;
  const draft = state.settingsDraft || {};
  const name = (draft.name || '').trim();
  const username = normalizeUsername(draft.username || '');
  const about = (draft.about || '').trim();
  if (!name) return toast('Имя не может быть пустым.', 'error');
  if (!validUsername(username)) return toast('Username должен содержать 4–24 символа: a-z, 0-9 или _.', 'error');
  const current = state.profile || {};
  let reservedNew = false;
  try {
    if (username !== current.username) {
      await reserveUsername(username, uid);
      reservedNew = true;
    }
    const profile = { ...current, name, username, about };
    await update(ref(db), {
      [`users/${uid}`]: profile,
      [`publicProfiles/${uid}`]: { name, username, about }
    });
    if (username !== current.username) await releaseUsername(current.username, uid);
    state.profile = profile;
    state.settingsDraft = { name, username, about };
    toast('Профиль сохранён.', 'success');
    render();
  } catch (e) {
    if (reservedNew) await releaseUsername(username, uid).catch(() => {});
    toast(errorText(e), 'error');
  }
}

async function sendResetEmail() {
  try {
    await sendPasswordResetEmail(auth, state.user.email);
    toast('Письмо для смены пароля отправлено.', 'success');
  } catch (e) {
    toast(errorText(e), 'error');
  }
}

async function doLogout() {
  cleanupRealtime();
  await signOut(auth).catch(() => {});
  state.user = null;
  state.profile = null;
  state.chats = {};
  state.chatActivity = {};
  state.friends = {};
  state.requests = {};
  state.outgoingRequests = {};
  state.activeChatId = null;
  state.activeMessages = [];
  setScreen('auth');
}

async function initAuthUser(user) {
  if (state.registrationInProgress) return;
  state.user = user;
  if (!user) {
    cleanupRealtime();
    setScreen('auth');
    return;
  }
  const profileSnap = await get(ref(db, `users/${user.uid}`));
  if (!profileSnap.exists()) {
    state.authMode = 'register';
    state.authStep = Math.min(4, Math.max(2, state.authStep || 2));
    state.authName = state.authName || user.displayName || '';
    state.authEmail = user.email || state.authEmail;
    state.authPassword = '';
    state.authBirthDate = state.authBirthDate || '';
    state.authAbout = state.authAbout || '';
    setScreen('auth');
    return;
  }
  state.profile = profileSnap.val();
  if (!user.emailVerified) {
    setScreen('verify');
    return;
  }
  subscribeRealtime();
  setScreen('app');
}

onAuthStateChanged(auth, (user) => {
  initAuthUser(user).catch((e) => {
    console.error(e);
    toast(errorText(e), 'error');
  });
});

appRoot.addEventListener('input', (event) => {
  if (event.target.id === 'chat-search') {
    state.searchTerm = event.target.value;
    render();
    const input = document.querySelector('#chat-search');
    if (input) { input.focus(); input.setSelectionRange(state.searchTerm.length, state.searchTerm.length); }
  }
  if (event.target.id === 'friend-search' && state.modal?.type === 'find-friends') {
    searchFriends(event.target.value);
  }
  if (event.target.id === 'compose') state.composeText = event.target.value;
  if (event.target.id === 'settings-name') state.settingsDraft = { ...(state.settingsDraft || {}), name: event.target.value };
  if (event.target.id === 'settings-username') {
    state.settingsDraft = { ...(state.settingsDraft || {}), username: event.target.value };
    const value = normalizeUsername(event.target.value);
    const token = ++state.usernameCheckToken;
    const status = document.querySelector('#username-status');
    if (status) status.textContent = validUsername(value) ? 'Проверяем…' : '4–24 символа: a-z, 0-9 или _';
    if (validUsername(value)) {
      checkUsernameAvailability(value).then((result) => {
        if (token !== state.usernameCheckToken) return;
        const el = document.querySelector('#username-status');
        if (!el) return;
        el.textContent = result.own ? 'Это ваш текущий username.' : result.available ? 'Username свободен.' : 'Username уже занят.';
        el.dataset.state = result.own || result.available ? 'ok' : 'bad';
      }).catch(() => {});
    }
  }
  if (event.target.id === 'settings-about') state.settingsDraft = { ...(state.settingsDraft || {}), about: event.target.value };
  if (event.target.id === 'community-title') state.modal.title = event.target.value;
  if (event.target.id === 'community-description') state.modal.description = event.target.value;
  if (event.target.id === 'reg-about') {
    state.authAbout = event.target.value;
    const counter = document.querySelector('.char-count');
    if (counter) counter.textContent = `${state.authAbout.length}/160`;
  }
});

appRoot.addEventListener('keydown', (event) => {
  if (event.target.id === 'compose' && event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    const form = document.querySelector('#message-form');
    form?.requestSubmit();
  }
});

appRoot.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (event.target.id === 'login-form') {
    state.authEmail = event.target.email.value.trim();
    state.authPassword = event.target.password.value;
    state.authLoading = true;
    render();
    try {
      await signInWithEmailAndPassword(auth, state.authEmail, state.authPassword);
    } catch (e) {
      toast(errorText(e), 'error');
      state.authLoading = false;
      render();
    }
    return;
  }
  if (event.target.id === 'message-form') {
    const chat = state.chats[state.activeChatId];
    if (chat) await sendMessage(chat);
  }
});

appRoot.addEventListener('click', async (event) => {
  const stopTarget = event.target.closest('[data-stop-click]');
  if (stopTarget) {
    if (event.target.closest('[data-action="close-modal"]')) return;
    event.stopPropagation();
  }
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  try {
    if (action === 'switch-auth') {
      state.authMode = target.dataset.mode;
      state.authStep = 1;
      state.authLoading = false;
      render();
    } else if (action === 'register-next') {
      if (state.authStep === 1) {
        const email = document.querySelector('#reg-email')?.value.trim();
        const password = document.querySelector('#reg-password')?.value;
        if (!email || !password || password.length < 6) return toast('Введите корректную почту и пароль от 6 символов.', 'error');
        state.authEmail = email;
        state.authPassword = password;
        state.authStep = 2;
        render();
      } else if (state.authStep === 2) {
        const name = document.querySelector('#reg-name')?.value.trim();
        const username = normalizeUsername(document.querySelector('#reg-username')?.value || '');
        if (!name) return toast('Введите имя.', 'error');
        if (!validUsername(username)) return toast('Username должен содержать 4–24 символа: a-z, 0-9 или _.', 'error');
        const existing = Object.values(state.profiles).some((p) => p.username === username);
        if (existing) return toast('Этот username уже занят.', 'error');
        state.authName = name;
        state.authUsername = username;
        state.authStep = 3;
        render();
      } else if (state.authStep === 3) {
        const birth = document.querySelector('#reg-birthday')?.value;
        if (!birth || new Date(`${birth}T12:00:00`) > new Date()) return toast('Укажите корректную дату рождения.', 'error');
        state.authBirthDate = birth;
        state.authStep = 4;
        render();
      }
    } else if (action === 'register-back') {
      state.authStep = Math.max(1, state.authStep - 1);
      render();
    } else if (action === 'register-finish') {
      state.authAbout = document.querySelector('#reg-about')?.value.trim() || '';
      state.authLoading = true;
      state.registrationInProgress = true;
      render();
      try {
        if (!state.user) {
          const cred = await createUserWithEmailAndPassword(auth, state.authEmail, state.authPassword);
          state.user = cred.user;
          try {
            await sendEmailVerification(cred.user);
            toast('Письмо для подтверждения отправлено. Проверьте также «Спам».', 'success');
          } catch (mailError) {
            console.error(mailError);
            toast('Аккаунт создан, но письмо не удалось отправить. Позже можно отправить его повторно.', 'error');
          }
        }
        await createProfileFromRegistration();
        state.registrationInProgress = false;
        setScreen('verify');
      } catch (e) {
        state.registrationInProgress = false;
        if (e?.message === 'Этот username уже занят.' || e?.code === 'auth/permission-denied') {
          state.authStep = 2;
          state.authLoading = false;
          toast('Этот username уже занят. Придумайте другой.', 'error');
          render();
          return;
        }
        toast(errorText(e), 'error');
        state.authLoading = false;
        render();
      }
    } else if (action === 'forgot-password') {
      const email = document.querySelector('#login-form input[name="email"]')?.value.trim() || state.authEmail;
      if (!email) return toast('Сначала введите email.', 'error');
      try {
        await sendPasswordResetEmail(auth, email);
        toast('Письмо для восстановления отправлено.', 'success');
      } catch (e) {
        toast(errorText(e), 'error');
      }
    } else if (action === 'resend-verification') {
      try {
        await sendEmailVerification(state.user);
        toast('Письмо отправлено. Проверьте «Спам», «Промоакции» и «Корзину».', 'success');
      } catch (e) {
        toast(errorText(e), 'error');
      }
    } else if (action === 'refresh-verification') {
      await reload(auth.currentUser);
      state.user = auth.currentUser;
      if (state.user?.emailVerified) {
        toast('Почта подтверждена. Добро пожаловать!', 'success');
        await initAuthUser(state.user);
      } else {
        toast('Пока не вижу подтверждения. Откройте письмо и нажмите кнопку.', 'neutral');
      }
    } else if (action === 'logout') {
      await doLogout();
    } else if (action === 'toggle-menu') {
      state.modal = { type: 'profile' };
      render();
    } else if (action === 'open-profile') {
      state.modal = { type: 'profile' };
      render();
    } else if (action === 'open-create-menu') {
      state.modal = { type: 'create-menu' };
      render();
    } else if (action === 'open-find-friends') {
      state.modal = { type: 'find-friends', query: '', results: [], searching: false };
      render();
    } else if (action === 'open-create-group') {
      state.modal = { type: 'create-group', title: '', description: '', selected: [] };
      render();
    } else if (action === 'open-create-channel') {
      state.modal = { type: 'create-channel', title: '', description: '', selected: [] };
      render();
    } else if (action === 'open-edit-community') {
      const chat = state.chats[state.activeChatId];
      if (!chat || chat.type === 'dm' || chat.ownerId !== state.user.uid) return;
      state.modal = { type: 'edit-community', title: chat.title || '', description: chat.description || '', selected: Object.keys(chat.members || {}).filter((uid) => uid !== state.user.uid) };
      render();
    } else if (action === 'toggle-member') {
      const uid = target.dataset.uid;
      state.modal.selected ||= [];
      state.modal.selected = state.modal.selected.includes(uid) ? state.modal.selected.filter((x) => x !== uid) : [...state.modal.selected, uid];
      render();
    } else if (action === 'toggle-edit-member') {
      const uid = target.dataset.uid;
      state.modal.selected ||= [];
      state.modal.selected = state.modal.selected.includes(uid) ? state.modal.selected.filter((x) => x !== uid) : [...state.modal.selected, uid];
      render();
    } else if (action === 'create-community') {
      const type = state.modal.type === 'create-channel' ? 'channel' : 'group';
      await createCommunity(type);
    } else if (action === 'save-community') {
      await saveCommunity();
    } else if (action === 'send-friend') {
      await sendFriendRequest(target.dataset.uid);
    } else if (action === 'accept-friend') {
      await acceptFriend(target.dataset.uid);
    } else if (action === 'decline-friend') {
      await declineFriend(target.dataset.uid);
    } else if (action === 'open-chat') {
      await openChat(target.dataset.chatId);
    } else if (action === 'mobile-back') {
      state.mobilePanel = 'sidebar';
      render();
    } else if (action === 'close-modal') {
      state.modal = null;
      render();
    } else if (action === 'open-settings') {
      const p = state.profile || {};
      state.modal = { type: 'settings' };
      state.settingsTab = 'profile';
      state.settingsDraft = { name: p.name || '', username: p.username || '', about: p.about || '' };
      render();
      checkUsernameAvailability(p.username || '').then((result) => {
        const el = document.querySelector('#username-status');
        if (el) { el.textContent = result.own ? 'Это ваш текущий username.' : result.available ? 'Username свободен.' : 'Username уже занят.'; el.dataset.state = result.own || result.available ? 'ok' : 'bad'; }
      }).catch(() => {});
    } else if (action === 'settings-tab') {
      state.settingsTab = target.dataset.tab;
      render();
    } else if (action === 'toggle-theme') {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      setTheme();
      render();
    } else if (action === 'toggle-compact') {
      state.compact = !state.compact;
      setTheme();
      render();
    } else if (action === 'save-profile') {
      await saveProfile();
    } else if (action === 'send-password-reset') {
      await sendResetEmail();
    } else if (action === 'open-chat-info') {
      state.modal = { type: 'chat-info' };
      render();
    }
  } catch (e) {
    console.error(e);
    toast(errorText(e), 'error');
  }
});

render();
