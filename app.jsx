const { useState, useEffect } = React;

const defaultRoleCodes = {
  Government: '0000',
  'The Public': '3000',
};

const API_BASE = window.API_BASE_URL || 'http://localhost:3001';

function fetchJson(url, options) {
  return fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error || 'Unexpected server error';
      throw new Error(message);
    }
    return data;
  });
}

function Sidebar({ view, onNavigate }) {
  const items = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'workspace', icon: '💻', label: 'Workspace' },
    { id: 'report', icon: '📑', label: 'Report' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];
  return (
    <aside className="sidebar">
      <div className="logo" aria-label="PPSS Logo">
        <span className="logo-mark">PP</span>
      </div>
      <nav className="nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? 'active' : ''}`}
            data-view={item.id}
            aria-label={item.label}
            onClick={() => onNavigate(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span className="nav-text">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SigninModal({
  open,
  activeRole,
  userId,
  onClose,
  onSubmit,
  onChange,
  error,
}) {
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="signinTitle">
      <div className="modal-content">
        <div className="modal-header">
          <h3 id="signinTitle">Enter your personal code</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✖
          </button>
        </div>
        <p className="modal-role">Signing in as: {activeRole || 'Select a role'}</p>
        <form
          className="signin-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label htmlFor="userId">User ID</label>
          <input
            id="userId"
            name="userId"
            placeholder="Enter a unique user identifier"
            value={userId}
            onChange={(e) => onChange('userId', e.target.value)}
            required
          />
          <label htmlFor="signinCode">Personal code</label>
          <input
            type="password"
            id="signinCode"
            name="signinCode"
            required
            placeholder="Enter your saved code"
            onChange={(e) => onChange('code', e.target.value)}
          />
          <div className="form-actions">
            <button type="submit" className="primary">
              Sign In
            </button>
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
          {error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function ChatTranscript({ conversation }) {
  if (!conversation.length) {
    return <div className="info">No conversation yet. Start by sending a message.</div>;
  }
  return (
    <div className="chat-log">
      {conversation.map((entry, index) => (
        <div key={index} className={`chat-entry ${entry.role}`}>
          <div className="chat-meta">{entry.role}</div>
          <div className="chat-message">{entry.content}</div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [view, setView] = useState('home');
  const [statusMessage, setStatusMessage] = useState('Signed out');
  const [role, setRole] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinError, setSigninError] = useState('');
  const [signinState, setSigninState] = useState({ code: '', userId: '' });
  const [personalCodes, setPersonalCodes] = useState(() => {
    const stored = localStorage.getItem('ppssCodes');
    return stored ? JSON.parse(stored) : {};
  });
  const [workspaceNote, setWorkspaceNote] = useState('Provide a policy prompt to explore options. Sign-in is required to persist notes.');
  const [policyPrompt, setPolicyPrompt] = useState('');
  const [aiOutcome, setAiOutcome] = useState('');
  const [problemPrompt, setProblemPrompt] = useState('');
  const [problemConversation, setProblemConversation] = useState([]);
  const [problemSummary, setProblemSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [sending, setSending] = useState(false);
  const stageTabs = [
    'Project Description',
    'Data Analysis',
    'Design/Plan Alternatives',
    'Design/Plan Evaluation',
    'Design/Plan Decision',
  ];

  useEffect(() => {
    const rolesWithCodes = Object.keys(personalCodes).length;
    if (!sessionId) {
      setStatusMessage('Signed out');
    } else if (role) {
      setStatusMessage(`${role} · Signed in`);
    }
    const defaultText =
      'Defaults: Government code is 0000 and The Public (citizen) code is 3000. You can override them here.';
    const statusLine = rolesWithCodes
      ? `${rolesWithCodes} personal code(s) stored locally. ${defaultText}`
      : `No custom personal code is stored yet. ${defaultText}`;
    const el = document.getElementById('codeStatus');
    if (el) el.textContent = statusLine;
  }, [personalCodes, role, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setProblemConversation([]);
      setProblemSummary('');
      return;
    }
    fetchJson(`/api/stage/problem-definition/chat?sessionId=${encodeURIComponent(sessionId)}`)
      .then((data) => {
        setProblemConversation(data.conversation || []);
        setProblemSummary(data.summary || '');
      })
      .catch(() => {
        setProblemConversation([]);
        setProblemSummary('');
      });
  }, [sessionId]);

  const openSignin = (selectedRole) => {
    setSigninError('');
    setSigninState((prev) => ({ ...prev, code: '' }));
    setRole(selectedRole);
    setSigninOpen(true);
  };

  const closeSignin = () => {
    setSigninError('');
    setSigninOpen(false);
  };

  const requireCode = () => {
    if (!role) {
      setSigninError('Select a stakeholder role to continue.');
      return null;
    }
    const saved = personalCodes[role] || defaultRoleCodes[role] || '';
    if (!saved) {
      setSigninError('No personal code found. Please save one in Settings.');
      return null;
    }
    return saved;
  };

  const persistCode = (selectedRole, code) => {
    const next = { ...personalCodes, [selectedRole]: code };
    setPersonalCodes(next);
    localStorage.setItem('ppssCodes', JSON.stringify(next));
  };

  const handleSigninSubmit = async () => {
    const expected = requireCode();
    if (!expected) return;
    if (!signinState.code) {
      setSigninError('Please enter your personal code.');
      return;
    }
    if (signinState.code !== expected) {
      setSigninError('The code does not match the saved personal code.');
      return;
    }
    try {
      const payload = {
        userId: signinState.userId || `${role}-guest`,
        stakeholder_type: role,
      };
      const data = await fetchJson('/api/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSessionId(data.sessionId);
      setSystemPrompt(data.systemPrompt);
      setConversation(data.conversation || []);
      setStatusMessage(`${role} · Signed in`);
      setWorkspaceNote('You are authenticated. Draft or save notes to capture policy discussions.');
      setView('workspace');
      closeSignin();
    } catch (error) {
      setSigninError(error.message);
    }
  };

  const logout = () => {
    setSessionId(null);
    setRole(null);
    setConversation([]);
    setPolicyPrompt('');
    setAiOutcome('');
    setProblemPrompt('');
    setProblemConversation([]);
    setProblemSummary('');
    setWorkspaceNote('Provide a policy prompt to explore options. Sign-in is required to persist notes.');
    setView('home');
    setStatusMessage('Signed out');
  };

  const runSimulation = () => {
    if (!sessionId) {
      setWorkspaceNote('Please sign in to run simulations and save the AI-assisted outcomes.');
      return;
    }
    if (!policyPrompt.trim()) {
      setWorkspaceNote('Enter a policy prompt to simulate a scenario.');
      return;
    }
    const summary = `Simulated outcomes for: ${policyPrompt}\n\n• Stakeholder alignment pathways.\n• Risk mitigation strategies.\n• Data-backed rationale mirroring the PPSS case study.`;
    setAiOutcome(summary);
    setWorkspaceNote('A scenario draft has been generated based on your prompt.');
  };

  const saveNotes = () => {
    if (!sessionId) {
      setWorkspaceNote('Sign in to save notes tied to your session.');
      return;
    }
    setWorkspaceNote('Notes saved locally for this session. Export to the Report Center for review.');
  };

  const sendProblemMessage = async () => {
    if (!sessionId) {
      setWorkspaceNote('Sign in to chat with your personalized agent.');
      return;
    }
    if (!problemPrompt.trim()) {
      setWorkspaceNote('Enter a problem-definition prompt to engage the agent.');
      return;
    }
    setSending(true);
    try {
      const data = await fetchJson('/api/stage/problem-definition/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message: problemPrompt }),
      });
      setProblemConversation(data.conversation || []);
      setProblemSummary(data.summary || problemSummary);
      setWorkspaceNote('Problem-definition conversation updated.');
    } catch (error) {
      setWorkspaceNote(error.message);
    } finally {
      setSending(false);
    }
  };

  const generateProblemSummary = async () => {
    if (!sessionId) {
      setWorkspaceNote('Sign in to request a cross-user summary.');
      return;
    }
    setLoadingSummary(true);
    try {
      const data = await fetchJson('/api/stage/problem-definition/summary', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      setProblemSummary(data.summary || '');
      setWorkspaceNote('Latest stage-level summary prepared by chat_summary_agent.');
    } catch (error) {
      setWorkspaceNote(error.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const sendMessage = async () => {
    if (!sessionId) {
      setWorkspaceNote('Sign in to chat with your personalized agent.');
      return;
    }
    if (!policyPrompt.trim()) {
      setWorkspaceNote('Enter a prompt before sending it to the agent.');
      return;
    }
    setSending(true);
    try {
      const data = await fetchJson('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message: policyPrompt }),
      });
      setConversation(data.conversation || []);
      setAiOutcome(data.assistantMessage?.content || aiOutcome);
      setWorkspaceNote('Conversation updated with the personalized agent response.');
    } catch (error) {
      setWorkspaceNote(error.message);
    } finally {
      setSending(false);
    }
  };

  const Home = () => (
    <section className={`view ${view === 'home' ? 'active' : ''}`} aria-label="Home">
      <div className="notice">Sign in with your personal code to move into the collaborative workspace.</div>
      <div className="audience-grid">
        {['The Public', 'Business Owners', 'Planners', 'Government'].map((roleKey) => (
          <div key={roleKey} className="audience-card" data-role={roleKey}>
            <div className="audience-icon">
              {roleKey === 'The Public' && '👥'}
              {roleKey === 'Business Owners' && '🏢'}
              {roleKey === 'Planners' && '✏️'}
              {roleKey === 'Government' && '🏛️'}
            </div>
            <h3>{roleKey}</h3>
            <p>
              {roleKey === 'The Public'
                ? 'Share everyday observations and community knowledge to enrich scenario planning.'
                : roleKey === 'Business Owners'
                ? 'Provide business insights to align policies with market-driven implementation needs.'
                : roleKey === 'Planners'
                ? 'Co-design policies and review generated scenarios before public deliberation.'
                : 'Lead decision-making, consolidate feedback, and publish transparent reports.'}
            </p>
            <button className="primary" data-action="signin" onClick={() => openSignin(roleKey)}>
              Sign In
            </button>
          </div>
        ))}
      </div>
    </section>
  );

  const Workspace = () => (
    <section className={`view ${view === 'workspace' ? 'active' : ''}`} aria-label="Workspace">
      <div className="panel stage-header">
        <div className="stage-meta">
          <p className="stage-kicker">Problem Definition Stage</p>
          <h2>Seoul Station Overpass</h2>
          <p>
            Following the PPSS study, participants align on the context, problems, and constraints before co-creating alternatives. Use the personalized agent to refine the statement and capture diverse viewpoints.
          </p>
        </div>
        <div className="stage-tabs">
          {stageTabs.map((tab) => (
            <span key={tab} className={`stage-pill ${tab === 'Project Description' ? 'active' : ''}`}>
              {tab}
            </span>
          ))}
        </div>
      </div>

      <div className="problem-grid">
        <div className="panel project-brief">
          <div className="brief-header">
            <div>
              <h3>Project Description</h3>
              <p className="muted">Grounded in the case study’s Figure 6 layout.</p>
            </div>
            <span className="badge">Resident View</span>
          </div>
          <div className="brief-media" role="img" aria-label="Seoul Station overpass aerial view">
            <div className="image-mask">
              <img
                src="https://images.unsplash.com/photo-1526485797145-81f272bb1b83?auto=format&fit=crop&w=900&q=80"
                alt="Seoul city skyline"
              />
            </div>
          </div>
          <p>
            Construction of the Seoul Station Overpass began on March 18, 1969 and opened on August 15, 1970. For over 45 years, it has served as a key corridor but now faces aging infrastructure challenges. Residents feel the corridor separates the city while carrying freight and commuter loads.
          </p>
          <div className="two-column">
            <div>
              <h4>Summary of Key Solutions</h4>
              <ul>
                <li>Improve walking paths and public transit integration.</li>
                <li>Reduce the dominance of freight traffic in nearby streets.</li>
                <li>Revitalize neighborhoods through safer crossings and better amenities.</li>
                <li>Repurpose disused overpass segments into cultural and green spaces.</li>
              </ul>
            </div>
            <div>
              <h4>Summary of Key Strategies</h4>
              <ul>
                <li>Create continuous pedestrian and universal-design access.</li>
                <li>Introduce curated open spaces with art, planting, and seating.</li>
                <li>Reuse railway heritage in ways that celebrate local history.</li>
                <li>Enable citizens to co-design the corridor identity with data-driven guidance.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="panel agent-panel">
          <div className="agent-header">
            <div>
              <p className="muted">Personalized Agent</p>
              <h3>Problem-definition dialogue</h3>
            </div>
            <button className="secondary" onClick={generateProblemSummary} disabled={loadingSummary}>
              {loadingSummary ? 'Summarizing...' : 'Generate cross-user summary'}
            </button>
          </div>
          <label htmlFor="problemPrompt">Prompt the agent</label>
          <textarea
            id="problemPrompt"
            placeholder="Ask about neighborhood impacts, heritage reuse, or design priorities..."
            value={problemPrompt}
            onChange={(e) => setProblemPrompt(e.target.value)}
          ></textarea>
          <div className="workspace-actions">
            <button className="primary" onClick={sendProblemMessage} disabled={sending}>
              {sending ? 'Sending...' : 'Send to Personalized Agent'}
            </button>
            <button className="secondary" onClick={saveNotes}>
              Save Notes
            </button>
          </div>
          <div className="info" id="workspaceStatus">
            {workspaceNote}
          </div>
          <div className="panel nested">
            <h4>Conversation</h4>
            <ChatTranscript conversation={problemConversation} />
            {systemPrompt ? (
              <div className="info">
                Active system prompt: <code>{systemPrompt}</code>
              </div>
            ) : null}
          </div>
          {problemSummary ? (
            <div className="summary-card">
              <div className="summary-title">chat_summary_agent output</div>
              <p>{problemSummary}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <h3>Scenario Drafting</h3>
        <p className="muted">Optional quick draft area that feeds the workspace simulation.</p>
        <div className="workspace-content">
          <div>
            <label htmlFor="policyPrompt">Policy prompt</label>
            <textarea
              id="policyPrompt"
              placeholder="Describe the policy context, goals, and constraints..."
              value={policyPrompt}
              onChange={(e) => setPolicyPrompt(e.target.value)}
            ></textarea>
          </div>
          <div>
            <label htmlFor="aiOutcome">AI-assisted outcome</label>
            <textarea
              id="aiOutcome"
              placeholder="Scenario drafts, synthesized insights, and alternative pathways appear here."
              value={aiOutcome}
              readOnly
            ></textarea>
          </div>
        </div>
        <div className="workspace-actions">
          <button className="primary" id="simulateBtn" onClick={runSimulation}>
            Simulate Scenario
          </button>
          <button className="secondary" id="saveNotesBtn" onClick={saveNotes}>
            Save Notes
          </button>
          <button className="primary ghost" onClick={sendMessage} disabled={sending}>
            {sending ? 'Sending...' : 'Send to Personalized Agent'}
          </button>
        </div>
        <div className="info" id="scenarioStatus">
          {workspaceNote}
        </div>
        <div className="panel nested">
          <h4>Conversation</h4>
          <ChatTranscript conversation={conversation} />
        </div>
      </div>
    </section>
  );

  const Report = () => (
    <section className={`view ${view === 'report' ? 'active' : ''}`} aria-label="Report">
      <div className="panel">
        <h2>Report Center</h2>
        <p>
          Consolidate deliberation outcomes, generate exportable summaries, and align final recommendations with stakeholder roles. The structure follows the reporting elements described in the PPSS workflow.
        </p>
        <ul className="report-list">
          <li>
            <strong>Engagement Summary:</strong> Narrative of participant contributions across roles.
          </li>
          <li>
            <strong>Scenario Comparison:</strong> Contrasting AI-generated pathways with human feedback.
          </li>
          <li>
            <strong>Implementation Readiness:</strong> Steps for policy rollout, monitoring, and evaluation.
          </li>
        </ul>
      </div>
    </section>
  );

  const Settings = () => {
    const [codeRole, setCodeRole] = useState('The Public');
    const [personalCode, setPersonalCode] = useState('');
    return (
      <section className={`view ${view === 'settings' ? 'active' : ''}`} aria-label="Settings">
        <div className="panel">
          <h2>Personal Code Management</h2>
          <p>
            Store or update your personal code to access the PPSS workspace. The code is kept locally in your browser to align with the privacy-aware setup described in the study.
          </p>
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!personalCode) return;
              persistCode(codeRole, personalCode);
              setPersonalCode('');
            }}
          >
            <label htmlFor="codeRole">Select role</label>
            <select id="codeRole" name="codeRole" value={codeRole} onChange={(e) => setCodeRole(e.target.value)}>
              <option value="The Public">The Public (citizen)</option>
              <option value="Business Owners">Business Owners</option>
              <option value="Planners">Planners</option>
              <option value="Government">Government (server manager)</option>
            </select>
            <label htmlFor="personalCode">Personal code</label>
            <input
              type="password"
              id="personalCode"
              name="personalCode"
              required
              placeholder="Enter a private access code"
              value={personalCode}
              onChange={(e) => setPersonalCode(e.target.value)}
            />
            <button type="submit" className="primary">
              Save Code
            </button>
          </form>
          <div className="info" id="codeStatus"></div>
        </div>
      </section>
    );
  };

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={setView} />
      <main className="main">
        <header className="top-bar">
          <div>
            <h1>ChatGPT-assisted Public Participation Support System</h1>
            <p className="subtitle">Prototype inspired by the PPSS platform described in the referenced study.</p>
          </div>
          <div className="user-status">
            <div className="status-text" id="statusText">
              {statusMessage}
            </div>
            {sessionId ? (
              <button className="secondary" id="logoutBtn" aria-label="Log out" onClick={logout}>
                Log Out
              </button>
            ) : null}
          </div>
        </header>
        <Home />
        <Workspace />
        <Report />
        <Settings />
      </main>
      <SigninModal
        open={signinOpen}
        activeRole={role}
        userId={signinState.userId}
        error={signinError}
        onClose={closeSignin}
        onSubmit={handleSigninSubmit}
        onChange={(key, value) => setSigninState((prev) => ({ ...prev, [key]: value }))}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
