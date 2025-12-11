const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const statusText = document.getElementById('statusText');
const logoutBtn = document.getElementById('logoutBtn');
const homeNotice = document.getElementById('homeNotice');
const workspaceStatus = document.getElementById('workspaceStatus');
const codeStatus = document.getElementById('codeStatus');
const codeForm = document.getElementById('codeForm');
const personalCodeInput = document.getElementById('personalCode');
const signinModal = document.getElementById('signinModal');
const signinForm = document.getElementById('signinForm');
const signinCodeInput = document.getElementById('signinCode');
const signinError = document.getElementById('signinError');
const selectedRole = document.getElementById('selectedRole');
const cancelSigninBtn = document.getElementById('cancelSignin');
const closeModalBtn = document.getElementById('closeModal');
const simulateBtn = document.getElementById('simulateBtn');
const saveNotesBtn = document.getElementById('saveNotesBtn');
const policyPrompt = document.getElementById('policyPrompt');
const aiOutcome = document.getElementById('aiOutcome');

const state = {
  view: 'home',
  role: null,
  loggedIn: false,
  personalCode: localStorage.getItem('ppssCode') || '',
};

function setView(view) {
  state.view = view;
  views.forEach((section) => {
    section.classList.toggle('active', section.id === view);
  });
  navItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.view === view);
  });
}

function updateStatus() {
  if (state.loggedIn && state.role) {
    statusText.textContent = `${state.role} · Signed in`;
    logoutBtn.hidden = false;
    homeNotice.textContent = 'You are signed in. Continue collaborating in the workspace or browse reports.';
    workspaceStatus.textContent = 'You are authenticated. Draft or save notes to capture policy discussions.';
  } else {
    statusText.textContent = 'Signed out';
    logoutBtn.hidden = true;
    homeNotice.textContent = 'Sign in with your personal code to move into the collaborative workspace.';
    workspaceStatus.textContent = 'Provide a policy prompt to explore options. Sign-in is required to persist notes.';
  }
}

function updateCodeStatus() {
  if (state.personalCode) {
    codeStatus.textContent = 'A personal code is stored locally. Use it to authenticate from the Home page.';
  } else {
    codeStatus.textContent = 'No personal code is stored yet.';
  }
}

function requireCode() {
  if (!state.personalCode) {
    signinError.textContent = 'No personal code found. Please set one in Settings first.';
    return false;
  }
  return true;
}

function openSignin(role) {
  selectedRole.textContent = `Signing in as: ${role}`;
  state.role = role;
  signinCodeInput.value = '';
  signinError.textContent = '';
  signinModal.hidden = false;
  signinCodeInput.focus();
}

function closeSignin() {
  signinModal.hidden = true;
}

function saveCode(code) {
  state.personalCode = code;
  localStorage.setItem('ppssCode', code);
  updateCodeStatus();
}

function handleSignin(event) {
  event.preventDefault();
  if (!requireCode()) return;
  const code = signinCodeInput.value.trim();
  if (!code) {
    signinError.textContent = 'Please enter your personal code.';
    return;
  }
  if (code === state.personalCode) {
    state.loggedIn = true;
    closeSignin();
    updateStatus();
    setView('workspace');
  } else {
    signinError.textContent = 'The code does not match the saved personal code.';
  }
}

function logout() {
  state.loggedIn = false;
  state.role = null;
  setView('home');
  updateStatus();
}

function mockSimulation() {
  if (!state.loggedIn) {
    workspaceStatus.textContent = 'Please sign in to run simulations and save the AI-assisted outcomes.';
    return;
  }
  const prompt = policyPrompt.value.trim();
  if (!prompt) {
    workspaceStatus.textContent = 'Enter a policy prompt to simulate a scenario.';
    return;
  }
  aiOutcome.value = `Simulated outcomes for: ${prompt}\n\n• Stakeholder alignment pathways.\n• Risk mitigation strategies.\n• Data-backed rationale mirroring the PPSS case study.`;
  workspaceStatus.textContent = 'A scenario draft has been generated based on your prompt.';
}

function mockSaveNotes() {
  if (!state.loggedIn) {
    workspaceStatus.textContent = 'Sign in to save notes tied to your session.';
    return;
  }
  workspaceStatus.textContent = 'Notes saved locally for this session. Export to the Report Center for review.';
}

navItems.forEach((item) => {
  item.addEventListener('click', () => setView(item.dataset.view));
});

document.querySelectorAll('[data-action="signin"]').forEach((button) => {
  button.addEventListener('click', (event) => {
    const role = event.currentTarget.closest('.audience-card').dataset.role;
    openSignin(role);
  });
});

logoutBtn.addEventListener('click', logout);

codeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const code = personalCodeInput.value.trim();
  if (!code) return;
  saveCode(code);
  personalCodeInput.value = '';
});

signinForm.addEventListener('submit', handleSignin);

cancelSigninBtn.addEventListener('click', closeSignin);
closeModalBtn.addEventListener('click', closeSignin);

simulateBtn.addEventListener('click', mockSimulation);
saveNotesBtn.addEventListener('click', mockSaveNotes);

updateStatus();
updateCodeStatus();
