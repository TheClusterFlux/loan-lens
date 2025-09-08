let budgetState = {
  income: 0,
  fixed: [], // { id, name, detail, amount }
  variable: [], // { id, name, detail, min, max }
  unplanned: [] // { id, name, detail, amount }
};

document.addEventListener('DOMContentLoaded', function(){
  // Load profile income
  try { const p = Common.getProfile(); if (p && p.income) document.getElementById('monthly-income').value = p.income; } catch(e){}
  // Load saved budget
  loadBudget();
  // Wire selects for custom
  setupCustomToggle('fixed-name','fixed-custom');
  setupCustomToggle('var-name','var-custom');
  setupCustomToggle('unp-name','unp-custom');
  // Wire buttons
  document.getElementById('add-fixed').addEventListener('click', addFixed);
  document.getElementById('add-var').addEventListener('click', addVar);
  document.getElementById('add-unp').addEventListener('click', addUnp);
  document.getElementById('refresh-profile').addEventListener('click', () => {
    try { const p = Common.getProfile(); if (p && p.income) { document.getElementById('monthly-income').value = p.income; recalc(); saveBudget(); } } catch(e){}
  });
  document.getElementById('clear-budget').addEventListener('click', () => {
    if (!confirm('Clear saved budget data?')) return;
    localStorage.removeItem('budgetEstimator');
    budgetState = { income: 0, fixed: [], variable: [], unplanned: [] };
    renderLists();
    recalc();
  });
  document.getElementById('monthly-income').addEventListener('input', () => { recalc(); saveBudget(); });
  // Initial render
  renderLists();
  recalc();
  ensureContextPanel();
});

function setupCustomToggle(selectId, inputId){
  const sel = document.getElementById(selectId);
  const inp = document.getElementById(inputId);
  sel.addEventListener('change', () => { inp.style.display = sel.value === 'custom' ? '' : 'none'; });
}

function addFixed(){
  const nameSel = document.getElementById('fixed-name');
  const custom = document.getElementById('fixed-custom').value.trim();
  const detail = document.getElementById('fixed-detail').value.trim();
  const amount = Number(document.getElementById('fixed-amount').value) || 0;
  const name = nameSel.value === 'custom' ? (custom || 'Custom') : nameSel.value;
  if (amount <= 0) return;
  budgetState.fixed.push({ id: Date.now(), name, detail, amount });
  document.getElementById('fixed-amount').value = '';
  document.getElementById('fixed-detail').value = '';
  renderLists();
  recalc();
  saveBudget();
}

function addVar(){
  const nameSel = document.getElementById('var-name');
  const custom = document.getElementById('var-custom').value.trim();
  const detail = document.getElementById('var-detail').value.trim();
  const min = Number(document.getElementById('var-min').value) || 0;
  const max = Number(document.getElementById('var-max').value) || 0;
  const name = nameSel.value === 'custom' ? (custom || 'Custom') : nameSel.value;
  if (min < 0 || max < 0) return;
  budgetState.variable.push({ id: Date.now(), name, detail, min, max: Math.max(min, max) });
  document.getElementById('var-min').value = '';
  document.getElementById('var-max').value = '';
  document.getElementById('var-detail').value = '';
  renderLists();
  recalc();
  saveBudget();
}

function addUnp(){
  const nameSel = document.getElementById('unp-name');
  const custom = document.getElementById('unp-custom').value.trim();
  const detail = document.getElementById('unp-detail').value.trim();
  const amount = Number(document.getElementById('unp-amount').value) || 0;
  const name = nameSel.value === 'custom' ? (custom || 'Custom') : nameSel.value;
  if (amount <= 0) return;
  budgetState.unplanned.push({ id: Date.now(), name, detail, amount });
  document.getElementById('unp-amount').value = '';
  document.getElementById('unp-detail').value = '';
  renderLists();
  recalc();
  saveBudget();
}

function renderLists(){
  renderList('fixed-list', budgetState.fixed, 'item-fixed', (it) => ({
    cat: escapeHtml(it.name),
    left: escapeHtml(it.detail || ''),
    right: Common.formatCurrency(it.amount)
  }));
  renderList('var-list', budgetState.variable, 'item-var', (it) => ({
    cat: escapeHtml(it.name),
    left: escapeHtml(it.detail || ''),
    right: `${Common.formatCurrency(it.min)} - ${Common.formatCurrency(it.max)}`
  }));
  renderList('unp-list', budgetState.unplanned, 'item-unp', (it) => ({
    cat: escapeHtml(it.name),
    left: escapeHtml(it.detail || ''),
    right: Common.formatCurrency(it.amount)
  }));
}

function renderList(targetId, arr, rowClass, mapFn){
  const el = document.getElementById(targetId);
  el.innerHTML = '';
  arr.forEach((it, idx) => {
    const row = document.createElement('div');
    row.className = 'item ' + rowClass;
    const left = document.createElement('div');
    const mapped = mapFn(it);
    left.innerHTML = `<div class=\"item-cat\">${mapped.cat}</div><div class=\"item-line\"><div class=\"item-detail\">${mapped.left}</div><div class=\"item-amount\">${mapped.right}</div></div>`;
    const right = document.createElement('div');
    right.className = 'actions';
    const del = document.createElement('button');
    del.textContent = 'Remove';
    del.className = 'danger';
    del.onclick = () => { arr.splice(idx,1); renderLists(); recalc(); saveBudget(); };
    right.appendChild(del);
    row.appendChild(left);
    row.appendChild(right);
    el.appendChild(row);
  });
}

function recalc(){
  const income = Number(document.getElementById('monthly-income').value) || 0;
  budgetState.income = income;
  const sumFixed = budgetState.fixed.reduce((a,b)=>a + (Number(b.amount)||0),0);
  const sumVarMin = budgetState.variable.reduce((a,b)=>a + (Number(b.min)||0),0);
  const sumVarMax = budgetState.variable.reduce((a,b)=>a + (Number(b.max)||0),0);
  const sumUnp = budgetState.unplanned.reduce((a,b)=>a + (Number(b.amount)||0),0);
  const best = income - (sumFixed + sumVarMin + sumUnp);
  const worst = income - (sumFixed + sumVarMax + sumUnp);
  // Update UI
  setText('sum-income', Common.formatCurrency(income));
  setText('sum-fixed', Common.formatCurrency(sumFixed));
  setText('sum-var-min', Common.formatCurrency(sumVarMin));
  setText('sum-var-max', Common.formatCurrency(sumVarMax));
  setText('sum-unp', Common.formatCurrency(sumUnp));
  setText('leftover-best', Common.formatCurrency(best));
  setText('leftover-worst', Common.formatCurrency(worst));

  // Build cross-app context and suggestions
  const ctx = computeCrossContext({ income, sumFixed, sumVarMin, sumVarMax, sumUnp, best, worst });
  renderContextPanel(ctx);
  saveBudgetSummary(ctx);
}

function saveBudget(){
  try { localStorage.setItem('budgetEstimator', JSON.stringify(budgetState)); } catch(e){}
}
function loadBudget(){
  try {
    const raw = localStorage.getItem('budgetEstimator'); if (!raw) return; const b = JSON.parse(raw); if (!b) return;
    budgetState = {
      income: b.income||0,
      fixed: Array.isArray(b.fixed)? b.fixed : [],
      variable: Array.isArray(b.variable)? b.variable : [],
      unplanned: Array.isArray(b.unplanned)? b.unplanned : []
    };
    document.getElementById('monthly-income').value = budgetState.income || '';
  } catch(e){}
}

function setText(id, text){ const el = document.getElementById(id); if (el) el.textContent = text; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }


// ------- Cross-tool context, suggestions, and persistence -------

function readLocal(key){ try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; } }

function computeCrossContext(basics){
  const loan = readLocal('loanLensState');
  const investTarget = readLocal('investmentTargetState');
  const investPlan = readLocal('investmentPlannerState');

  // Loans summary
  const loanItems = Array.isArray(loan?.tabs) ? loan.tabs.map(t => ({
    title: t.title || 'Loan',
    monthlyPayment: Number(t.monthlyPayment) || 0
  })) : [];
  const loanTotalMonthly = loanItems.reduce((a,b)=>a + (b.monthlyPayment||0),0);

  // Investment summary (prefer target calculator result, else planner rules)
  let investMonthlyFromTarget = 0;
  if (investTarget && Array.isArray(investTarget.scenarios) && investTarget.scenarios.length > 0){
    const idx = typeof investTarget.activeIndex === 'number' ? Math.min(Math.max(0, investTarget.activeIndex), investTarget.scenarios.length-1) : 0;
    const s = investTarget.scenarios[idx];
    investMonthlyFromTarget = Number(s?.result?.monthlyInvestmentNeeded) || 0;
  }
  let investMonthlyFromPlanner = 0;
  if (investPlan && Array.isArray(investPlan.rules)){
    investMonthlyFromPlanner = investPlan.rules
      .filter(r => r.type === 'recurring' && r.frequency === 'monthly')
      .reduce((sum, r) => sum + (Number(r.amount)||0), 0);
  }
  const investMonthly = Math.max(investMonthlyFromTarget, investMonthlyFromPlanner) || 0;

  const afterCommitmentsBest = basics.best - loanTotalMonthly - investMonthly;
  const afterCommitmentsWorst = basics.worst - loanTotalMonthly - investMonthly;

  const allocations = computeAllocations({
    leftoverBest: basics.best,
    loanItems,
    investMonthly,
    loanTotalMonthly
  });

  const suggestions = buildSuggestions({
    basics,
    loanItems,
    loanTotalMonthly,
    investMonthly,
    allocations,
    afterCommitmentsBest,
    afterCommitmentsWorst
  });

  return {
    income: basics.income,
    budget: {
      sumFixed: basics.sumFixed,
      sumVarMin: basics.sumVarMin,
      sumVarMax: basics.sumVarMax,
      sumUnp: basics.sumUnp,
      leftoverBest: basics.best,
      leftoverWorst: basics.worst
    },
    loans: { totalMonthly: loanTotalMonthly, items: loanItems },
    investments: { monthlyNeeded: investMonthly },
    afterCommitmentsBest,
    afterCommitmentsWorst,
    allocations,
    suggestions
  };
}

function computeAllocations({ leftoverBest, loanItems, investMonthly, loanTotalMonthly }){
  const allocations = { toInvest: 0, toLoansExtraTotal: 0, perLoanExtras: [] };
  if (leftoverBest <= 0) return allocations;

  // First try to cover investment monthly need
  const toInvest = Math.min(leftoverBest, Math.max(0, investMonthly));
  let remaining = leftoverBest - toInvest;

  // Then propose rounding each loan payment up to next $50, within remaining
  const perLoan = [];
  loanItems
    .slice()
    .sort((a,b)=> (b.monthlyPayment||0)-(a.monthlyPayment||0))
    .forEach(li => {
      if (remaining <= 0) return;
      const current = Number(li.monthlyPayment)||0;
      const nextRound = Math.ceil(current / 50) * 50;
      let extra = Math.max(0, nextRound - current);
      if (extra === 0) extra = 50; // if already multiple of 50, suggest extra 50
      const applied = Math.min(extra, remaining);
      if (applied > 0){
        perLoan.push({ title: li.title, extra: applied });
        remaining -= applied;
      }
    });

  allocations.toInvest = toInvest;
  allocations.toLoansExtraTotal = perLoan.reduce((a,b)=>a + b.extra, 0);
  allocations.perLoanExtras = perLoan;
  return allocations;
}

function buildSuggestions({ basics, loanItems, loanTotalMonthly, investMonthly, allocations, afterCommitmentsBest, afterCommitmentsWorst }){
  const msgs = [];
  if (loanTotalMonthly > 0) msgs.push(`Loans: current monthly payments ${Common.formatCurrency(loanTotalMonthly)} across ${loanItems.length} loan(s).`);
  if (investMonthly > 0) msgs.push(`Investments: to hit your target, set aside about ${Common.formatCurrency(investMonthly)} monthly.`);
  if (allocations.toInvest > 0) msgs.push(`Allocate ${Common.formatCurrency(allocations.toInvest)} to investments this month.`);
  if (allocations.perLoanExtras.length > 0){
    allocations.perLoanExtras.slice(0,3).forEach(pl => {
      msgs.push(`Add ${Common.formatCurrency(pl.extra)} to "${pl.title}" this month.`);
    });
    const remainingLoans = allocations.perLoanExtras.length - 3;
    if (remainingLoans > 0) msgs.push(`And ${remainingLoans} more loan(s) with smaller top-ups.`);
  }
  if (basics.best < 0) msgs.push(`Shortfall (best-case): ${Common.formatCurrency(Math.abs(basics.best))}. Consider trimming variable/unplanned expenses.`);
  if (afterCommitmentsBest < 0) msgs.push(`After loans/investments, shortfall (best-case) is ${Common.formatCurrency(Math.abs(afterCommitmentsBest))}. Reduce spend or adjust goals.`);
  if (msgs.length === 0) msgs.push('No suggestions available yet. Start by entering income and expenses.');
  return msgs;
}

function ensureContextPanel(){
  if (document.getElementById('context-suggestions')) return;
  const panel = document.createElement('div');
  panel.id = 'context-suggestions';
  panel.className = 'panel';
  panel.innerHTML = '<div class="section-title" style="font-size:14px;font-weight:700;color:#1976d2;margin-bottom:8px;">Context & Suggestions</div>'+
    '<div id="context-lines" style="color:#333;line-height:1.6"></div>'+
    '<div id="context-metrics" style="margin-top:8px;color:#555;font-size:13px"></div>';
  const container = document.querySelector('.container');
  if (container) container.appendChild(panel); else document.body.appendChild(panel);
}

function renderContextPanel(ctx){
  ensureContextPanel();
  const lines = document.getElementById('context-lines');
  const metrics = document.getElementById('context-metrics');
  if (!lines || !metrics) return;
  const summaryTop = [
    `Loans monthly: <b>${escapeHtml(Common.formatCurrency(ctx.loans.totalMonthly))}</b>`,
    `Investments monthly: <b>${escapeHtml(Common.formatCurrency(ctx.investments.monthlyNeeded))}</b>`,
    `Leftover after commitments (best/worst): <b>${escapeHtml(Common.formatCurrency(ctx.afterCommitmentsBest))}</b> / <b>${escapeHtml(Common.formatCurrency(ctx.afterCommitmentsWorst))}</b>`
  ].join(' · ');
  metrics.innerHTML = summaryTop;
  lines.innerHTML = ctx.suggestions.map(s => `<div>• ${escapeHtml(s)}</div>`).join('');
}

function saveBudgetSummary(ctx){
  const payload = {
    version: 1,
    updatedAt: Date.now(),
    income: ctx.income,
    budget: ctx.budget,
    loans: { totalMonthly: ctx.loans.totalMonthly, items: ctx.loans.items.map(it => ({ title: it.title, monthlyPayment: it.monthlyPayment })) },
    investments: ctx.investments,
    afterCommitmentsBest: ctx.afterCommitmentsBest,
    afterCommitmentsWorst: ctx.afterCommitmentsWorst,
    allocations: ctx.allocations,
    suggestions: ctx.suggestions.slice(0, 8)
  };
  try { localStorage.setItem('budgetEstimatorSummary', JSON.stringify(payload)); } catch(e){}
}

