const SECTIONS = [
  { key: 'businessSummary',   icon: '&#127919;', title: 'Business Summary' },
  { key: 'marketingChannels', icon: '&#128227;', title: 'Best Marketing Channels' },
  { key: 'messagingAngles',   icon: '&#128172;', title: 'Core Messaging Angles' },
  { key: 'leadMagnets',       icon: '&#129522;', title: 'Lead Magnet Ideas' },
  { key: 'contentPlan',       icon: '&#128197;', title: 'Content Plan' },
  { key: 'aiWorkflows',       icon: '&#129302;', title: 'AI Workflows' },
  { key: 'thirtyDayPlan',     icon: '&#128467;', title: '30-Day Action Plan' },
];

const SUPABASE_URL = 'https://ommmdzitrpdilhskprre.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v2_045kZo4Jc_yU2YRLroQ_pR7Wcxkk';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentPlanId = null;
let pendingPlan   = null;
let currentUser   = null;

// ── Init ───────────────────────────────────────────────────────
(async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    setUser(session.user);
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      setUser(session.user);
      const storedPlanId = localStorage.getItem('pendingPlanId');
      if (storedPlanId) {
        localStorage.removeItem('pendingPlanId');
        currentPlanId = storedPlanId;
        await claimPlan(storedPlanId, session.user.id, session.access_token);
        await fetchAndShowPlan(storedPlanId);
      }
    }
    if (event === 'SIGNED_OUT') {
      clearUser();
    }
  });

  const storedPlanId = localStorage.getItem('pendingPlanId');
  if (storedPlanId && currentUser) {
    localStorage.removeItem('pendingPlanId');
    currentPlanId = storedPlanId;
    const { data: { session: sess } } = await sb.auth.getSession();
    if (sess) {
      await claimPlan(storedPlanId, sess.user.id, sess.access_token);
    }
    await fetchAndShowPlan(storedPlanId);
  }
})();

// ── Auth helpers ───────────────────────────────────────────────
function setUser(user) {
  currentUser = user;
  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('userBadge').classList.remove('hidden');
}

function clearUser() {
  currentUser = null;
  document.getElementById('userBadge').classList.add('hidden');
  document.getElementById('userEmail').textContent = '';
}

// ── Inline Validation ─────────────────────────────────────────
function validateField(id) {
  const el = document.getElementById(id);
  const field = el.closest('.field');
  if (!el.value.trim()) {
    field.classList.add('has-error');
    return false;
  }
  if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) {
    field.classList.add('has-error');
    return false;
  }
  field.classList.remove('has-error');
  return true;
}

// Clear errors on input
['businessDescription', 'targetAudience', 'audienceChallenges', 'emailAddress'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      el.closest('.field').classList.remove('has-error');
    });
  }
});

// ── Form Submit ────────────────────────────────────────────────
document.getElementById('planForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate required fields
  const v1 = validateField('businessDescription');
  const v2 = validateField('targetAudience');
  const v3 = validateField('audienceChallenges');
  const v4 = validateField('emailAddress');
  if (!v1 || !v2 || !v3 || !v4) return;

  const businessDescription       = document.getElementById('businessDescription').value.trim();
  const targetAudience            = document.getElementById('targetAudience').value.trim();
  const audienceChallenges        = document.getElementById('audienceChallenges').value.trim();
  const stage                     = document.getElementById('stage').value;
  const marketingBudget           = document.getElementById('marketingBudget').value;
  const primaryMarketingGoal      = document.getElementById('primaryMarketingGoal').value;
  const currentMarketingChannels  = document.getElementById('currentMarketingChannels').value.trim();
  const currentChannelPerformance = document.getElementById('currentChannelPerformance').value.trim();
  const differentiators           = document.getElementById('differentiators').value.trim();
  const emailAddress              = document.getElementById('emailAddress').value.trim();
  const newsletterOptIn           = document.getElementById('newsletterOptIn').checked;

  showLoading();

  try {
    // Use auth token if signed in, otherwise anon key
    let authToken = SUPABASE_ANON_KEY;
    if (currentUser) {
      const { data: { session } } = await sb.auth.getSession();
      if (session) authToken = session.access_token;
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        businessDescription,
        targetAudience,
        audienceChallenges,
        stage,
        marketingBudget,
        primaryMarketingGoal,
        currentMarketingChannels,
        currentChannelPerformance,
        differentiators,
        email: emailAddress,
        newsletterOptIn,
      }),
    });

    const data = await res.json();

    // Handle "account required" — first plan was free, need to sign up for more
    if (!res.ok && data.code === 'ACCOUNT_REQUIRED') {
      hideLoading();
      showAccountRequired(emailAddress);
      return;
    }

    if (!res.ok) throw new Error(data.error || 'Something went wrong.');

    currentPlanId = data.planId;
    pendingPlan   = data.plan;

    hideLoading();

    // Always show the plan immediately
    renderResults(pendingPlan);

    // If logged in, claim the plan
    if (currentUser) {
      const { data: { session } } = await sb.auth.getSession();
      if (session && currentPlanId) {
        await claimPlan(currentPlanId, session.user.id, session.access_token);
      }
    }
  } catch (err) {
    showError(err.message);
    hideLoading();
  }
});

// ── Auth Gate ──────────────────────────────────────────────────
let lastAuthEmail = '';

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const btn   = document.getElementById('authBtn');

  btn.disabled    = true;
  btn.textContent = 'Sending\u2026';
  lastAuthEmail   = email;

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  });

  if (error) {
    document.getElementById('authError').textContent = error.message;
    document.getElementById('authError').classList.remove('hidden');
    btn.disabled    = false;
    btn.textContent = 'Send Magic Link';
    return;
  }

  document.getElementById('authForm').classList.add('hidden');
  document.getElementById('authSent').classList.remove('hidden');
});

document.getElementById('authResend').addEventListener('click', async () => {
  if (!lastAuthEmail) return;
  await sb.auth.signInWithOtp({
    email: lastAuthEmail,
    options: { emailRedirectTo: window.location.origin }
  });
});

// ── Logout ─────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  clearUser();
  resetToForm();
});

// ── Claim plan ─────────────────────────────────────────────────
async function claimPlan(planId, userId, accessToken) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/claim-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ planId, userId }),
    });
  } catch (err) {
    console.error('Claim plan error:', err);
  }
}

// ── Fetch plan from Supabase ───────────────────────────────────
async function fetchAndShowPlan(planId) {
  showLoading();
  const { data, error } = await sb
    .from('plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  hideLoading();

  if (error || !data) {
    showError('Could not load your plan. Please try generating a new one.');
    resetToForm();
    return;
  }

  renderResults(data.plan_data);
}

// ── Start Over ─────────────────────────────────────────────────
document.getElementById('regenerateBtn').addEventListener('click', () => {
  resetToForm();
});

function resetToForm() {
  document.getElementById('results').classList.add('hidden');
  document.getElementById('authGate').classList.add('hidden');
  document.getElementById('accountGate').classList.add('hidden');
  document.getElementById('formSection').classList.remove('hidden');

  // Show all landing page sections
  document.getElementById('heroSection').classList.remove('hidden');
  document.querySelectorAll('.final-cta-section').forEach(el => {
    el.classList.remove('hidden');
  });

  document.getElementById('planForm').reset();
  document.getElementById('errorMsg').classList.add('hidden');
  document.getElementById('cards').innerHTML = '';

  // Clear validation errors
  document.querySelectorAll('.field.has-error').forEach(f => f.classList.remove('has-error'));

  // Reset auth gate state
  document.getElementById('authForm').classList.remove('hidden');
  document.getElementById('authSent').classList.add('hidden');
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authBtn').disabled    = false;
  document.getElementById('authBtn').textContent = 'Send Magic Link';

  currentPlanId = null;
  pendingPlan   = null;
  localStorage.removeItem('pendingPlanId');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Download Plan ─────────────────────────────────────────────
let lastRenderedPlan = null;

function planToMarkdown(plan) {
  let md = '# Your Marketing Plan\n\n';

  // Business Summary
  if (plan.businessSummary) {
    const s = plan.businessSummary;
    md += '## Business Summary\n\n';
    if (s.whatBusinessDoes) md += `**What the business does:** ${s.whatBusinessDoes}\n\n`;
    if (s.likelyBuyer) md += `**Likely buyer:** ${s.likelyBuyer}\n\n`;
    if (s.primaryAudienceChallenges) md += `**Audience challenges:** ${s.primaryAudienceChallenges}\n\n`;
    if (s.coreProblem) md += `**Core problem:** ${s.coreProblem}\n\n`;
    if (s.valueProposition) md += `**Value proposition:** ${s.valueProposition}\n\n`;
    if (s.topMarketingPriority) md += `**Top priority:** ${s.topMarketingPriority}\n\n`;
    if (s.budgetContext) md += `**Budget context:** ${s.budgetContext}\n\n`;
    if (s.assumptions) md += `**Assumptions:** ${s.assumptions}\n\n`;
  }

  // Marketing Channels
  if (plan.marketingChannels) {
    md += '## Best Marketing Channels\n\n';
    plan.marketingChannels.forEach((c, i) => {
      md += `### ${i + 1}. ${c.channel}\n\n`;
      if (c.whyItFits) md += `${c.whyItFits}\n\n`;
      if (c.goal) md += `- **Goal:** ${c.goal}\n`;
      if (c.budgetFit) md += `- **Budget fit:** ${c.budgetFit}\n`;
      if (c.suggestedTools) md += `- **Suggested tools:** ${c.suggestedTools}\n`;
      if (c.estimatedCost) md += `- **Estimated cost:** ${c.estimatedCost}\n`;
      if (c.firstAction) md += `- **First action:** ${c.firstAction}\n`;
      if (c.expectedTimeToSignal) md += `- **Time to signal:** ${c.expectedTimeToSignal}\n`;
      if (c.executionNotes) md += `- **Notes:** ${c.executionNotes}\n`;
      md += '\n';
    });
  }

  // Messaging Angles
  if (plan.messagingAngles) {
    md += '## Core Messaging Angles\n\n';
    plan.messagingAngles.forEach(m => {
      md += `### ${m.angle}\n\n`;
      if (m.targetPainPoint) md += `**Pain point:** ${m.targetPainPoint}\n\n`;
      if (m.whyItResonates) md += `- **Why it resonates:** ${m.whyItResonates}\n`;
      if (m.objectionItHelpsOvercome) md += `- **Objection it overcomes:** ${m.objectionItHelpsOvercome}\n`;
      if (m.sampleHook) md += `- **Sample hook:** "${m.sampleHook}"\n`;
      if (m.callToAction) md += `- **CTA:** ${m.callToAction}\n`;
      md += '\n';
    });
  }

  // Lead Magnets
  if (plan.leadMagnets) {
    md += '## Lead Magnet Ideas\n\n';
    plan.leadMagnets.forEach(l => {
      md += `### ${l.title} (${l.format})\n\n`;
      if (l.problemItSolves) md += `${l.problemItSolves}\n\n`;
      if (l.audienceSegment) md += `- **Audience:** ${l.audienceSegment}\n`;
      if (l.relatedChallenge) md += `- **Related challenge:** ${l.relatedChallenge}\n`;
      if (l.whyThisWouldConvert) md += `- **Why it converts:** ${l.whyThisWouldConvert}\n`;
      if (l.simpleCreationApproach) md += `- **How to create:** ${l.simpleCreationApproach}\n`;
      md += '\n';
    });
  }

  // Content Plan
  if (plan.contentPlan) {
    const cp = plan.contentPlan;
    md += '## Content Plan\n\n';
    if (cp.strategicTheme) md += `**Strategic theme:** ${cp.strategicTheme}\n\n`;
    if (cp.contentPillars) md += `**Pillars:** ${cp.contentPillars.join(', ')}\n\n`;
    if (cp.contentIdeas) {
      cp.contentIdeas.forEach((idea, i) => {
        md += `### ${i + 1}. ${idea.title} (${idea.format})\n\n`;
        if (idea.coreMessage) md += `${idea.coreMessage}\n\n`;
        if (idea.pillar) md += `- **Pillar:** ${idea.pillar}\n`;
        if (idea.audienceIntent) md += `- **Intent:** ${idea.audienceIntent}\n`;
        if (idea.relatedChallenge) md += `- **Challenge:** ${idea.relatedChallenge}\n`;
        if (idea.distributionChannel) md += `- **Channel:** ${idea.distributionChannel}\n`;
        if (idea.callToAction) md += `- **CTA:** ${idea.callToAction}\n`;
        md += '\n';
      });
    }
    if (cp.repurposingNotes) md += `**Repurposing:** ${cp.repurposingNotes}\n\n`;
  }

  // AI Workflows
  if (plan.aiWorkflows) {
    md += '## AI Workflows\n\n';
    plan.aiWorkflows.forEach(w => {
      md += `### ${w.workflowName}\n\n`;
      if (w.purpose) md += `${w.purpose}\n\n`;
      if (w.inputNeeded) md += `- **Input:** ${w.inputNeeded}\n`;
      if (w.outputProduced) md += `- **Output:** ${w.outputProduced}\n`;
      if (w.suggestedTools) md += `- **Suggested tools:** ${w.suggestedTools}\n`;
      if (w.estimatedCost) md += `- **Estimated cost:** ${w.estimatedCost}\n`;
      if (w.howToUseIt) md += `- **How to use:** ${w.howToUseIt}\n`;
      if (w.timeSavedEstimate) md += `- **Time saved:** ${w.timeSavedEstimate}\n`;
      md += '\n';
    });
  }

  // 30-Day Plan
  if (plan.thirtyDayPlan) {
    md += '## 30-Day Action Plan\n\n';
    ['week1', 'week2', 'week3', 'week4'].forEach((key, i) => {
      const actions = plan.thirtyDayPlan[key];
      if (actions && actions.length) {
        md += `### Week ${i + 1}\n\n`;
        actions.forEach(a => { md += `- ${a}\n`; });
        md += '\n';
      }
    });
  }

  md += '\n---\nGenerated by Lawton Learns — lawtonlearns.com\n';
  return md;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  if (!lastRenderedPlan) return;
  // Open a clean print window with the plan content
  const md = planToMarkdown(lastRenderedPlan);
  const html = markdownToHtml(md);
  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html>
<html><head><title>Your Marketing Plan — Lawton Learns</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #111827; line-height: 1.7; font-size: 14px; }
  h1 { font-size: 24px; font-weight: 800; margin-bottom: 24px; }
  h2 { font-size: 18px; font-weight: 700; margin-top: 32px; margin-bottom: 12px; color: #4f46e5; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  h3 { font-size: 15px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; }
  p { margin: 0 0 8px; }
  ul { margin: 0 0 12px; padding-left: 20px; }
  li { margin-bottom: 4px; }
  strong { font-weight: 600; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
  @media print { body { margin: 20px; } }
</style>
</head><body>${html}</body></html>`);
  printWin.document.close();
  setTimeout(() => { printWin.print(); }, 300);
});

document.getElementById('downloadMdBtn').addEventListener('click', () => {
  if (!lastRenderedPlan) return;
  const md = planToMarkdown(lastRenderedPlan);
  downloadFile(md, 'marketing-plan.md', 'text/markdown');
});

// Simple markdown-to-HTML converter for the PDF print view
function markdownToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`)
    .replace(/"(.+?)"/g, '&ldquo;$1&rdquo;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul]|<hr|<p)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

// ── Render helpers ─────────────────────────────────────────────
function esc(str) { return str || ''; }

function makeCard(icon, title, bodyHtml) {
  const card = document.createElement('div');
  card.className = 'plan-card';
  card.innerHTML = `
    <div class="plan-card-header">
      <div class="plan-card-icon">${icon}</div>
      <h3>${title}</h3>
    </div>
    <div class="plan-card-body">${bodyHtml}</div>
  `;
  return card;
}

function renderBusinessSummary(d) {
  return `
    <div class="summary-grid">
      <div class="summary-row"><span class="summary-label">What the business does</span><span class="summary-value">${esc(d.whatBusinessDoes)}</span></div>
      <div class="summary-row"><span class="summary-label">Likely buyer</span><span class="summary-value">${esc(d.likelyBuyer)}</span></div>
      <div class="summary-row"><span class="summary-label">Audience challenges</span><span class="summary-value">${esc(d.primaryAudienceChallenges)}</span></div>
      <div class="summary-row"><span class="summary-label">Core problem</span><span class="summary-value">${esc(d.coreProblem)}</span></div>
      <div class="summary-row"><span class="summary-label">Value proposition</span><span class="summary-value">${esc(d.valueProposition)}</span></div>
      <div class="summary-row"><span class="summary-label">Top priority</span><span class="summary-value">${esc(d.topMarketingPriority)}</span></div>
      <div class="summary-row"><span class="summary-label">Budget context</span><span class="summary-value">${esc(d.budgetContext)}</span></div>
      ${d.assumptions ? `<div class="summary-row summary-assumptions"><span class="summary-label">Assumptions</span><span class="summary-value">${esc(d.assumptions)}</span></div>` : ''}
    </div>`;
}

function renderChannels(items) {
  return `<ul class="plan-items">${(items || []).map((c, i) => `
    <li class="channel-item">
      <div class="channel-rank">${i + 1}</div>
      <div class="channel-body">
        <div class="plan-item-title">${esc(c.channel)}</div>
        <div class="plan-item-desc">${esc(c.whyItFits)}</div>
        <div class="detail-grid">
          <div><span class="detail-label">Goal</span> ${esc(c.goal)}</div>
          <div><span class="detail-label">Budget fit</span> ${esc(c.budgetFit)}</div>
          <div><span class="detail-label">Suggested tools</span> ${esc(c.suggestedTools)}</div>
          <div><span class="detail-label">Estimated cost</span> ${esc(c.estimatedCost)}</div>
          <div><span class="detail-label">First action</span> ${esc(c.firstAction)}</div>
          <div><span class="detail-label">Time to signal</span> ${esc(c.expectedTimeToSignal)}</div>
        </div>
        ${c.executionNotes ? `<div class="exec-notes">${esc(c.executionNotes)}</div>` : ''}
      </div>
    </li>`).join('')}</ul>`;
}

function renderMessaging(items) {
  return `<ul class="plan-items">${(items || []).map(m => `
    <li class="plan-item">
      <div class="plan-item-title">${esc(m.angle)}</div>
      <div class="plan-item-desc">${esc(m.targetPainPoint)}</div>
      <div class="detail-grid">
        <div><span class="detail-label">Why it resonates</span> ${esc(m.whyItResonates)}</div>
        <div><span class="detail-label">Objection it overcomes</span> ${esc(m.objectionItHelpsOvercome)}</div>
        <div><span class="detail-label">Sample hook</span> <em>"${esc(m.sampleHook)}"</em></div>
        <div><span class="detail-label">CTA</span> ${esc(m.callToAction)}</div>
      </div>
    </li>`).join('')}</ul>`;
}

function renderLeadMagnets(items) {
  return `<ul class="plan-items">${(items || []).map(l => `
    <li class="plan-item">
      <div class="plan-item-title">${esc(l.title)} <span class="topic-tag">${esc(l.format)}</span></div>
      <div class="plan-item-desc">${esc(l.problemItSolves)}</div>
      <div class="detail-grid">
        <div><span class="detail-label">Audience</span> ${esc(l.audienceSegment)}</div>
        <div><span class="detail-label">Related challenge</span> ${esc(l.relatedChallenge)}</div>
        <div><span class="detail-label">Why it converts</span> ${esc(l.whyThisWouldConvert)}</div>
        <div><span class="detail-label">How to create</span> ${esc(l.simpleCreationApproach)}</div>
      </div>
    </li>`).join('')}</ul>`;
}

function renderContentPlan(d) {
  const pillarsHtml = (d.contentPillars || []).map(p => `<span class="topic-tag">${esc(p)}</span>`).join('');
  const ideasHtml = (d.contentIdeas || []).map(idea => `
    <li class="plan-item">
      <div class="plan-item-title">${esc(idea.title)} <span class="topic-tag">${esc(idea.format)}</span></div>
      <div class="plan-item-desc">${esc(idea.coreMessage)}</div>
      <div class="detail-grid">
        <div><span class="detail-label">Pillar</span> ${esc(idea.pillar)}</div>
        <div><span class="detail-label">Intent</span> ${esc(idea.audienceIntent)}</div>
        <div><span class="detail-label">Challenge addressed</span> ${esc(idea.relatedChallenge)}</div>
        <div><span class="detail-label">Channel</span> ${esc(idea.distributionChannel)}</div>
        <div><span class="detail-label">CTA</span> ${esc(idea.callToAction)}</div>
      </div>
    </li>`).join('');

  return `
    <div class="content-theme"><span class="detail-label">Strategic theme</span> ${esc(d.strategicTheme)}</div>
    <div class="topics-list" style="margin-bottom:16px">${pillarsHtml}</div>
    <ul class="plan-items">${ideasHtml}</ul>
    ${d.repurposingNotes ? `<div class="exec-notes" style="margin-top:16px"><span class="detail-label">Repurposing</span> ${esc(d.repurposingNotes)}</div>` : ''}`;
}

function renderAiWorkflows(items) {
  return `<ul class="plan-items">${(items || []).map(w => `
    <li class="plan-item">
      <div class="plan-item-title">${esc(w.workflowName)}</div>
      <div class="plan-item-desc">${esc(w.purpose)}</div>
      <div class="detail-grid">
        <div><span class="detail-label">Input</span> ${esc(w.inputNeeded)}</div>
        <div><span class="detail-label">Output</span> ${esc(w.outputProduced)}</div>
        <div><span class="detail-label">Suggested tools</span> ${esc(w.suggestedTools)}</div>
        <div><span class="detail-label">Estimated cost</span> ${esc(w.estimatedCost)}</div>
        <div><span class="detail-label">How to use</span> ${esc(w.howToUseIt)}</div>
        <div><span class="detail-label">Time saved</span> ${esc(w.timeSavedEstimate)}</div>
      </div>
    </li>`).join('')}</ul>`;
}

function renderThirtyDayPlan(d) {
  const weeks = [
    { label: 'Week 1', key: 'week1' },
    { label: 'Week 2', key: 'week2' },
    { label: 'Week 3', key: 'week3' },
    { label: 'Week 4', key: 'week4' },
  ];
  return `<ul class="plan-items">${weeks.map(w => {
    const actions = d[w.key] || [];
    const actionsHtml = actions.map(a => `<li>${esc(a)}</li>`).join('');
    return `
      <li class="week-item">
        <div class="week-label">${w.label}</div>
        <ul class="week-actions">${actionsHtml}</ul>
      </li>`;
  }).join('')}</ul>`;
}

const RENDERERS = {
  businessSummary: renderBusinessSummary,
  marketingChannels: renderChannels,
  messagingAngles: renderMessaging,
  leadMagnets: renderLeadMagnets,
  contentPlan: renderContentPlan,
  aiWorkflows: renderAiWorkflows,
  thirtyDayPlan: renderThirtyDayPlan,
};

// ── Render Results ─────────────────────────────────────────────
function renderResults(plan) {
  lastRenderedPlan = plan;
  const container = document.getElementById('cards');
  container.innerHTML = '';

  SECTIONS.forEach(({ key, icon, title }) => {
    const data = plan[key];
    if (!data) return;
    const renderer = RENDERERS[key];
    if (!renderer) return;
    container.appendChild(makeCard(icon, title, renderer(data)));
  });

  // Hide landing page sections, show results
  document.getElementById('heroSection').classList.add('hidden');
  document.querySelectorAll('.final-cta-section').forEach(el => {
    el.classList.add('hidden');
  });
  document.getElementById('formSection').classList.add('hidden');
  document.getElementById('authGate').classList.add('hidden');
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── UI Helpers ─────────────────────────────────────────────────
function showLoading() {
  document.getElementById('generateBtn').disabled = true;
  document.getElementById('generateBtn').textContent = 'Generating\u2026';
  document.getElementById('errorMsg').classList.add('hidden');
  document.getElementById('loadingState').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('generateBtn').disabled    = false;
  document.getElementById('generateBtn').textContent = 'Get My Marketing Plan';
}

function showAuthGate() {
  document.getElementById('heroSection').classList.add('hidden');
  document.querySelectorAll('.final-cta-section').forEach(el => {
    el.classList.add('hidden');
  });
  document.getElementById('formSection').classList.add('hidden');
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('authGate').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAuthGateSent(email) {
  lastAuthEmail = email;
  showAuthGate();
  document.getElementById('authForm').classList.add('hidden');
  document.getElementById('authSent').classList.remove('hidden');
}

function showError(msg) {
  document.getElementById('formSection').classList.remove('hidden');
  const err = document.getElementById('errorMsg');
  err.textContent = msg;
  err.classList.remove('hidden');
}

// ── Account Required Gate ──────────────────────────────────────
let lastAccountEmail = '';

function showAccountRequired(email) {
  document.getElementById('heroSection').classList.add('hidden');
  document.querySelectorAll('.final-cta-section').forEach(el => el.classList.add('hidden'));
  document.getElementById('formSection').classList.add('hidden');
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('accountGate').classList.remove('hidden');
  document.getElementById('accountEmail').value = email || '';
  // Reset state
  document.getElementById('accountForm').classList.remove('hidden');
  document.getElementById('accountSent').classList.add('hidden');
  document.getElementById('accountError').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('accountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('accountEmail').value.trim();
  const btn = document.getElementById('accountBtn');

  btn.disabled = true;
  btn.textContent = 'Sending\u2026';
  lastAccountEmail = email;

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  });

  if (error) {
    document.getElementById('accountError').textContent = error.message;
    document.getElementById('accountError').classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Create Free Account';
    return;
  }

  document.getElementById('accountForm').classList.add('hidden');
  document.getElementById('accountSent').classList.remove('hidden');
});

document.getElementById('accountResend').addEventListener('click', async () => {
  if (!lastAccountEmail) return;
  await sb.auth.signInWithOtp({
    email: lastAccountEmail,
    options: { emailRedirectTo: window.location.origin }
  });
});

// ── Smooth scroll for CTA links ────────────────────────────────
document.querySelectorAll('a[href="#formSection"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('formSection');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
