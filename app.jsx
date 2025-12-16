const { useState, useEffect } = React;

const defaultRoleCodes = {
  Government: '0000',
  'The Public': '3000',
};

const stageSteps = [
  { id: 'problem', label: 'Problem Definition', icon: '🧭' },
  { id: 'analysis', label: 'Data Analysis', icon: '📊' },
  { id: 'design', label: 'Design/Plan Alternatives', icon: '🎨' },
  { id: 'evaluation', label: 'Design/Plan Evaluation', icon: '✅' },
];

const workflowStages = [
  {
    id: 'problem',
    label: 'Problem Definition',
    icon: '🧭',
    helper: 'Frame the challenge and collect stakeholder inputs.',
  },
  {
    id: 'analysis',
    label: 'Data Analysis',
    icon: '📊',
    helper: 'Interrogate precedents with multimodal evidence.',
  },
  {
    id: 'design',
    label: 'Design/Plan Alternatives',
    icon: '🎨',
    helper: 'Generate and refine visual options with the agent.',
  },
];

const API_BASES = [window.API_BASE_URL, window.location?.origin, 'http://localhost:3001']
  .filter(Boolean)
  .filter((value, index, self) => self.indexOf(value) === index);

async function fetchJson(url, options) {
  let lastError = null;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.error || 'Unexpected server error';
        throw new Error(message);
      }
      return data;
    } catch (error) {
      lastError = error;
      // Try the next base URL on network errors; for HTTP errors, stop early.
      if (!(error instanceof TypeError)) {
        break;
      }
    }
  }
  throw new Error(lastError?.message || 'Unable to reach the server. Please start the backend.');
}

function Sidebar({ view, onNavigate, activeRole, sessionId }) {
  const items = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'workflow', icon: '🧭', label: 'Workflow' },
    { id: 'report', icon: '📑', label: 'Report' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];
  return (
    <aside className="sidebar">
      <div className="logo" aria-label="PPSS Logo">
        <span className="logo-mark">PP</span>
      </div>
      <div className="sidebar-status" aria-live="polite">
        <div className="sidebar-status-label">Signed in as</div>
        <div className="sidebar-status-value">
          {sessionId ? activeRole || 'Stakeholder' : 'Not signed in'}
        </div>
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

function SigninModal({ open, activeRole, code, onClose, onSubmit, onChange, error }) {
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
          <label htmlFor="signinCode">Personal code</label>
          <input
            type="password"
            id="signinCode"
            name="signinCode"
            required
            placeholder="Enter your saved code"
            value={code}
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
        <div
          key={index}
          className={`chat-row ${entry.role === 'user' ? 'align-right' : 'align-left'}`}
        >
          <div className={`chat-entry bubble ${entry.role}`}>
            <div className="chat-meta">
              {entry.role === 'user' ? 'You' : entry.role === 'assistant' ? 'Personalized Agent' : 'System'}
            </div>
            <div className="chat-message">{entry.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StageProgress({ currentStage }) {
  const activeIndex = Math.max(stageSteps.findIndex((step) => step.id === currentStage), 0);
  return (
    <div className="stage-progress" role="list" aria-label="PPSS stage progress">
      {stageSteps.map((step, index) => {
        const status =
          index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming';
        return (
          <div key={step.id} className={`stage-node ${status}`} role="listitem">
            <div className="stage-icon" aria-hidden="true">
              {step.icon}
            </div>
            <div className="stage-label">{step.label}</div>
            {index < stageSteps.length - 1 ? <span className="stage-connector" aria-hidden="true"></span> : null}
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [view, setView] = useState('home');
  const [statusMessage, setStatusMessage] = useState('Signed out');
  const [role, setRole] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [workflowStage, setWorkflowStage] = useState('problem');
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinError, setSigninError] = useState('');
  const [signinState, setSigninState] = useState({ code: '' });
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
  const [analysisCaseIndex, setAnalysisCaseIndex] = useState(0);
  const [analysisQuestion, setAnalysisQuestion] = useState('');
  const [analysisConversation, setAnalysisConversation] = useState([]);
  const [analysisResult, setAnalysisResult] = useState('');
  const [designIdea, setDesignIdea] = useState('');
  const [designPrompt, setDesignPrompt] = useState('');
  const [designRefinement, setDesignRefinement] = useState('');
  const [designGallery, setDesignGallery] = useState([]);
  const [designStatus, setDesignStatus] = useState('');
  const [designLoading, setDesignLoading] = useState(false);

  const navigate = (nextView) => {
    if (nextView === 'workflow' && !sessionId) {
      setStatusMessage('Sign in required to enter the workflow.');
      setWorkspaceNote('Sign in to enter the workflow stages.');
      setView('home');
      return;
    }
    setView(nextView);
  };

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

    if (!sessionId) {
      setDesignGallery([]);
      return;
    }
    fetchJson(`/api/design/alternatives?sessionId=${encodeURIComponent(sessionId)}`)
      .then((data) => setDesignGallery(data.gallery || []))
      .catch(() => setDesignGallery([]));
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
      const userKey = `ppssUser-${role || 'guest'}`;
      const derivedUserId = localStorage.getItem(userKey) || `${role || 'user'}-${Date.now()}`;
      localStorage.setItem(userKey, derivedUserId);
      const payload = {
        userId: derivedUserId,
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
      setView('workflow');
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

  const analysisCases = [
    {
      title: 'Gyeongui Line Forest Park',
      subtitle: 'Park summary',
      image:
        'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
      description:
        'Starting with the Daehyeon-dong section in March 2012, the Gyeongui Line Forest Park, which deviates from the existing railway tracks, was built in 7 sections (4.3 km) over 9 years. The park provides an essential green corridor and leisure space for citizens after the transformation of defunct railway areas.',
      strategies: [
        'Affordable housing policies limit rent increases for local renters.',
        'Community participation plans include citizen-led place making.',
        'Design/plan policies integrate inclusive programs for public life.',
        'Urban regeneration programs prevent speculative displacement and preserve local identity.',
      ],
      questions: [
        'How could similar regeneration practices prevent resident displacement in Seoul Station overpass?',
        'Which design elements protect local businesses while attracting new visitors?',
      ],
    },
    {
      title: 'Case 2: Elevated Greenway',
      subtitle: 'Reclaimed transit corridor',
      image:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
      description:
        'An elevated freight route converted into a linear park with mobility lanes and cultural pockets. Operations prioritized continuous access, shade, and active frontage with community vendors.',
      strategies: [
        'Blend slow mobility lanes with planting for climate resilience.',
        'Stage construction phases to minimize disruption to commuters.',
        'Pair greenway programs with night-time activation for safety.',
        'Use tactical urbanism pilots to validate permanent features.',
      ],
      questions: [
        'How can phased delivery maintain access for freight and pedestrians?',
        'What participatory tools help select amenities for each block?',
      ],
    },
    {
      title: 'Case 3: Waterfront Rail Park',
      subtitle: 'Coastal regeneration',
      image:
        'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80',
      description:
        'A decommissioned coastal rail line transformed into a waterfront promenade combining flood-protection berms, community plazas, and habitat nodes.',
      strategies: [
        'Integrate blue-green infrastructure to manage storm surges.',
        'Preserve maritime heritage through interpretive signage and art.',
        'Align vendor permits with local cooperatives to reduce displacement.',
        'Link monitoring data to adaptive maintenance budgets.',
      ],
      questions: [
        'How should coastal precedents inform inland overpass retrofits?',
        'What funding mechanisms support upkeep while remaining equitable?',
      ],
    },
  ];

  const activeCase = analysisCases[analysisCaseIndex];

  const sendAnalysisQuery = async () => {
    if (!sessionId) {
      setWorkspaceNote('Sign in to ask analysis questions.');
      return;
    }
    if (!analysisQuestion.trim()) {
      setWorkspaceNote('Enter a question for the personalized agent.');
      return;
    }

    setSending(true);
    try {
      const context_docs = analysisCases.map((entry, idx) => ({
        title: `${idx + 1}. ${entry.title}`,
        text: `${entry.subtitle}. ${entry.description} Key strategies: ${entry.strategies.join('; ')}`,
        image: entry.image,
      }));

      const data = await fetchJson('/api/analysis/query', {
        method: 'POST',
        body: JSON.stringify({ sessionId, user_question: analysisQuestion, context_docs }),
      });

      const assistantMessage = data?.answer || 'No response returned yet.';
      const nextConversation = [
        ...analysisConversation,
        { role: 'user', content: analysisQuestion },
        { role: 'assistant', content: assistantMessage },
      ];
      setAnalysisConversation(nextConversation);
      setAnalysisResult(JSON.stringify(data, null, 2));
      setWorkspaceNote('Analysis response received from the multimodal agent.');
      setAnalysisQuestion('');
    } catch (error) {
      setWorkspaceNote(error.message);
    } finally {
      setSending(false);
    }
  };

  const generateDesignAlternative = async () => {
    if (!sessionId) {
      setDesignStatus('Sign in to generate design alternatives.');
      return;
    }
    if (!designIdea.trim()) {
      setDesignStatus('Provide an idea or sketch description to synthesize a prompt.');
      return;
    }
    setDesignLoading(true);
    try {
      const data = await fetchJson('/api/design/alternatives/generate', {
        method: 'POST',
        body: JSON.stringify({ sessionId, idea: designIdea }),
      });
      setDesignPrompt(data.prompt || '');
      setDesignGallery(data.gallery || []);
      setDesignStatus('Image prompt generated with supporting gallery previews.');
    } catch (error) {
      setDesignStatus(error.message);
    } finally {
      setDesignLoading(false);
    }
  };

  const refineDesignPrompt = async () => {
    if (!sessionId) {
      setDesignStatus('Sign in to refine image prompts.');
      return;
    }
    if (!designPrompt.trim()) {
      setDesignStatus('Generate a prompt first before refinement.');
      return;
    }
    if (!designRefinement.trim()) {
      setDesignStatus('Describe how you want the prompt adjusted.');
      return;
    }
    setDesignLoading(true);
    try {
      const data = await fetchJson('/api/design/alternatives/refine', {
        method: 'POST',
        body: JSON.stringify({ sessionId, prompt: designPrompt, refinement: designRefinement }),
      });
      setDesignPrompt(data.prompt || '');
      setDesignGallery(data.gallery || []);
      setDesignRefinement('');
      setDesignStatus('Prompt refined and new variants added to the gallery.');
    } catch (error) {
      setDesignStatus(error.message);
    } finally {
      setDesignLoading(false);
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


  const stageCopy = {
    problem: {
      kicker: 'Stage 1 · Problem Definition',
      title: 'Seoul Station Overpass',
      description:
        'Frame the challenges and collect stakeholder feedback before moving into multimodal analysis. Based on the case study flow, this stage focuses on surfacing priorities from residents and other roles.',
    },
    analysis: {
      kicker: 'Stage 2 · Data Analysis',
      title: 'Evidence-driven insights',
      description:
        'Review precedent cases, interrogate the data with your personalized agent, and prepare the ground for creative synthesis.',
    },
    design: {
      kicker: 'Stage 3 · Design/Plan Alternatives',
      title: 'Generate visual options',
      description:
        'Translate ideas into render-ready prompts, refine directions, and curate gallery outputs before evaluation.',
    },
  };

  const Workflow = () => {
    const currentStageCopy = stageCopy[workflowStage];

    return (
      <section className={`view ${view === 'workflow' ? 'active' : ''}`} aria-label="Workflow">
        <div className="panel stage-header">
          <div className="stage-meta">
            <p className="stage-kicker">{currentStageCopy.kicker}</p>
            <h2>{currentStageCopy.title}</h2>
            <p>{currentStageCopy.description}</p>
          </div>
          <StageProgress currentStage={workflowStage} />
        </div>

        <div className="stage-switch" role="tablist" aria-label="Workflow stages">
          {workflowStages.map((stage) => (
            <button
              key={stage.id}
              className={`stage-switch-btn ${workflowStage === stage.id ? 'active' : ''}`}
              role="tab"
              aria-selected={workflowStage === stage.id}
              onClick={() => setWorkflowStage(stage.id)}
            >
              <span className="stage-switch-icon" aria-hidden="true">
                {stage.icon}
              </span>
              <span className="stage-switch-text">
                <strong>{stage.label}</strong>
                <span className="stage-switch-helper">{stage.helper}</span>
              </span>
            </button>
          ))}
        </div>

        {workflowStage === 'analysis' ? (
          <div className="analysis-layout" role="tabpanel" aria-label="Data Analysis">
            <div className="panel evidence-panel">
              <div className="panel-header">
                <div>
                  <p className="muted">Case Library</p>
                  <h3>Comparable precedents</h3>
                </div>
                <div className="case-tabs">
                  {analysisCases.map((entry, idx) => (
                    <button
                      key={entry.title}
                      className={`case-tab ${analysisCaseIndex === idx ? 'active' : ''}`}
                      onClick={() => setAnalysisCaseIndex(idx)}
                      aria-label={`Case ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div className="evidence-body">
                <div className="evidence-media" role="img" aria-label={activeCase.title}>
                  <img src={activeCase.image} alt={activeCase.title} />
                </div>
                <div className="evidence-content">
                  <p className="eyebrow">{activeCase.subtitle}</p>
                  <h4>{activeCase.title}</h4>
                  <p>{activeCase.description}</p>
                  <div className="two-column">
                    <div>
                      <h5>Summary of strategies</h5>
                      <ul>
                        {activeCase.strategies.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5>Prompt ideas</h5>
                      <ul>
                        {activeCase.questions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel agent-panel analysis-chat">
              <div className="agent-header">
                <div>
                  <p className="muted">Multimodal personalized agent</p>
                  <h3>Data Analysis dialogue</h3>
                </div>
                {systemPrompt ? <span className="badge">{role || 'Stakeholder'} context</span> : null}
              </div>
              <label htmlFor="analysisQuestion">Ask about the cases</label>
              <textarea
                id="analysisQuestion"
                placeholder="How do these cases reduce displacement risk while activating public life?"
                value={analysisQuestion}
                onChange={(e) => setAnalysisQuestion(e.target.value)}
              ></textarea>
              <div className="workspace-actions">
                <button className="primary" onClick={sendAnalysisQuery} disabled={sending}>
                  {sending ? 'Sending...' : 'Ask personalized agent'}
                </button>
                <button className="secondary" onClick={() => setAnalysisResult('')}>Clear result</button>
              </div>
              <div className="panel nested">
                <h4>Conversation</h4>
                <ChatTranscript conversation={analysisConversation} />
              </div>
              {analysisResult ? (
                <div className="json-block" role="region" aria-live="polite">
                  <div className="summary-title">Latest /analysis/query response</div>
                  <pre>{analysisResult}</pre>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {workflowStage === 'problem' ? (
          <div className="problem-grid" role="tabpanel" aria-label="Problem Definition">
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
              <div className="panel nested">
                <h4>Conversation</h4>
                <ChatTranscript conversation={problemConversation} />
              </div>
              {problemSummary ? (
                <div className="summary" role="region" aria-live="polite">
                  <div className="summary-title">Latest stage summary</div>
                  <p>{problemSummary}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {workflowStage === 'design' ? (
          <div role="tabpanel" aria-label="Design/Plan Alternatives">
            <div className="panel design-header">
              <div>
                <p className="stage-kicker">Stage 3 · Design/Plan Alternatives</p>
                <h3>Generate visual options with a personalized agent</h3>
                <p className="muted">
                  The agent converts your idea into a ready-to-render image prompt, calls the image generator, and stores the prompt + URLs for your session.
                </p>
              </div>
            </div>

            <div className="design-layout">
              <div className="panel design-form">
                <h4>Idea capture & prompt synthesis</h4>
                <label htmlFor="designIdea">Describe your idea</label>
                <textarea
                  id="designIdea"
                  placeholder="e.g., Convert the overpass into a terraced urban forest with night lighting and kiosks"
                  value={designIdea}
                  onChange={(e) => setDesignIdea(e.target.value)}
                ></textarea>
                <label htmlFor="designPrompt">Generated image prompt</label>
                <textarea id="designPrompt" value={designPrompt} readOnly placeholder="Prompt will appear here"></textarea>
                <div className="refinement-row">
                  <input
                    type="text"
                    id="designRefinement"
                    placeholder="Ask for refinements, e.g., 'make it more accessible and brighter'"
                    value={designRefinement}
                    onChange={(e) => setDesignRefinement(e.target.value)}
                  />
                  <button className="secondary" onClick={refineDesignPrompt} disabled={designLoading}>
                    {designLoading ? 'Working...' : 'Refine prompt'}
                  </button>
                </div>
                <div className="workspace-actions">
                  <button className="primary" onClick={generateDesignAlternative} disabled={designLoading}>
                    {designLoading ? 'Generating...' : 'Generate alternatives'}
                  </button>
                  <div className="info inline">{designStatus || 'Prompts and images are saved with your session.'}</div>
                </div>
              </div>
              <div className="panel design-gallery">
                <div className="design-gallery-header">
                  <h4>Gallery</h4>
                  <p className="muted">Latest prompts and generated URLs</p>
                </div>
                {designGallery.length === 0 ? (
                  <div className="info">No images yet. Generate a prompt to populate the gallery.</div>
                ) : (
                  <div className="gallery-grid">
                    {designGallery.map((entry, idx) => (
                      <div key={idx} className="gallery-card">
                        <div className="gallery-meta">
                          <div className="pill">{entry.refinement ? 'Refined' : 'Base'}</div>
                          <div className="timestamp">{new Date(entry.createdAt).toLocaleString()}</div>
                        </div>
                        <p className="gallery-prompt">{entry.prompt}</p>
                        <div className="gallery-images">
                          {(entry.images || []).map((url, imageIdx) => (
                            <img
                              key={imageIdx}
                              src={url}
                              alt={entry.prompt}
                              onClick={() => setDesignPrompt(entry.prompt)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
          </div>
        ) : null}
      </section>
    );
  };
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
      <Sidebar view={view} onNavigate={navigate} activeRole={role} sessionId={sessionId} />
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
        <Workflow />
        <Report />
        <Settings />
      </main>
      <SigninModal
        open={signinOpen}
        activeRole={role}
        code={signinState.code}
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
