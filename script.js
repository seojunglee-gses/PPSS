const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const statusText = document.getElementById('statusText');
const logoutBtn = document.getElementById('logoutBtn');
const homeNotice = document.getElementById('homeNotice');
const workspaceStatus = document.getElementById('workspaceStatus');
const codeStatus = document.getElementById('codeStatus');
const codeForm = document.getElementById('codeForm');
const codeRoleSelect = document.getElementById('codeRole');
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

const defaultRoleCodes = {
  Government: '0000',
  'The Public': '3000',
};

const state = {
  view: 'home',
  role: null,
  loggedIn: false,
  personalCodes: JSON.parse(localStorage.getItem('ppssCodes') || '{}'),
};

function getRoleCode(role) {
  return state.personalCodes[role] || defaultRoleCodes[role] || '';
}

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
  const rolesWithCodes = Object.keys(state.personalCodes).length;
  const defaultText =
    'Defaults: Government code is 0000 and The Public (citizen) code is 3000. You can override them here.';

  if (rolesWithCodes) {
    codeStatus.textContent = `${rolesWithCodes} personal code(s) stored locally. ${defaultText}`;
  } else {
    codeStatus.textContent = `No custom personal code is stored yet. ${defaultText}`;
  }
}

function requireCode(role) {
  const code = getRoleCode(role);
  if (!code) {
    signinError.textContent = 'No personal code found. Please set one in Settings first.';
    return null;
  }
  return code;
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
  signinError.textContent = '';
  state.role = null;
}

function saveCode(role, code) {
  state.personalCodes[role] = code;
  localStorage.setItem('ppssCodes', JSON.stringify(state.personalCodes));
  updateCodeStatus();
}

function handleSignin(event) {
  event.preventDefault();
  const expected = requireCode(state.role);
  if (!expected) return;
  const code = signinCodeInput.value.trim();
  if (!code) {
    signinError.textContent = 'Please enter your personal code.';
    return;
  }
  if (code === expected) {
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
  const role = codeRoleSelect.value;
  const code = personalCodeInput.value.trim();
  if (!code) return;
  saveCode(role, code);
  personalCodeInput.value = '';
});

signinForm.addEventListener('submit', handleSignin);

cancelSigninBtn.addEventListener('click', closeSignin);
closeModalBtn.addEventListener('click', closeSignin);

simulateBtn.addEventListener('click', mockSimulation);
saveNotesBtn.addEventListener('click', mockSaveNotes);

updateStatus();
updateCodeStatus();
