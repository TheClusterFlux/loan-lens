// Investment Planner - Flexible contribution schedule with inflation toggle

let plannerState = {
  initialInvestment: 10000,
  annualReturn: 7,
  inflationRate: 2.5,
  projectionYears: 40,
  adjustForInflation: false,
  rules: [], // { id, type: 'recurring'|'one-time', label, amount, startMonth, endMonth?, frequency? }
  editingRuleId: null
};

let plannerChart = null;

document.addEventListener('DOMContentLoaded', function() {
  // Wire inputs
  const bindNumber = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const val = parseFloat(el.value) || 0;
      plannerState[key] = val;
      recalcAndRender();
    });
  };
  bindNumber('initial-investment', 'initialInvestment');
  bindNumber('annual-return', 'annualReturn');
  bindNumber('inflation-rate', 'inflationRate');
  bindNumber('projection-years', 'projectionYears');

  const adjustToggle = document.getElementById('adjust-inflation');
  adjustToggle.addEventListener('change', () => {
    plannerState.adjustForInflation = adjustToggle.checked;
    recalcAndRender();
  });

  // Rule form dynamics
  const ruleTypeEl = document.getElementById('rule-type');
  const frequencyGroup = document.getElementById('frequency-group');
  const endMonthGroup = document.getElementById('end-month-group');
  ruleTypeEl.addEventListener('change', () => {
    const type = ruleTypeEl.value;
    if (type === 'one-time') {
      frequencyGroup.style.display = 'none';
      endMonthGroup.style.display = 'none';
    } else {
      frequencyGroup.style.display = '';
      endMonthGroup.style.display = '';
    }
  });

  document.getElementById('add-rule').addEventListener('click', () => upsertRuleFromForm());
  const cancelBtn = document.getElementById('cancel-edit');
  cancelBtn.addEventListener('click', () => {
    clearRuleForm();
    plannerState.editingRuleId = null;
    cancelBtn.style.display = 'none';
  });

  const clearBtn = document.getElementById('clear-data');
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear saved planner data from this browser?')) {
      localStorage.removeItem('investmentPlannerState');
      // Reset to defaults
      plannerState = {
        initialInvestment: 10000,
        annualReturn: 7,
        inflationRate: 2.5,
        projectionYears: 40,
        adjustForInflation: false,
        rules: [],
        editingRuleId: null
      };
      // Seed base rule
      plannerState.rules.push({ id: Date.now(), type: 'recurring', label: 'Base monthly', amount: 500, startMonth: 1, frequency: 'monthly' });
      clearRuleForm();
      setEditIndicator(null);
      setAddButtonEditing(false);
      renderRules();
      recalcAndRender();
      alert('Saved data cleared.');
    }
  });

  // Initialize chart
  const ctx = document.getElementById('planner-chart').getContext('2d');
  plannerChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: 'Months' } },
        y: { title: { display: true, text: 'Value' }, beginAtZero: true }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false }
    }
  });

  // Load saved state if available
  const saved = localStorage.getItem('investmentPlannerState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Basic shape validation
      if (parsed && typeof parsed === 'object') {
        plannerState = {
          initialInvestment: Number(parsed.initialInvestment) || 0,
          annualReturn: Number(parsed.annualReturn) || 0,
          inflationRate: Number(parsed.inflationRate) || 0,
          projectionYears: Number(parsed.projectionYears) || 1,
          adjustForInflation: !!parsed.adjustForInflation,
          rules: Array.isArray(parsed.rules) ? parsed.rules : [],
          editingRuleId: null
        };
      }
    } catch {}
  }
  // Seed base rule if none
  if (!plannerState.rules || plannerState.rules.length === 0) {
    plannerState.rules = [{ id: Date.now(), type: 'recurring', label: 'Base monthly', amount: 500, startMonth: 1, frequency: 'monthly' }];
  }

  // Reflect state into inputs
  document.getElementById('initial-investment').value = plannerState.initialInvestment;
  document.getElementById('annual-return').value = plannerState.annualReturn;
  document.getElementById('inflation-rate').value = plannerState.inflationRate;
  document.getElementById('projection-years').value = plannerState.projectionYears;
  document.getElementById('adjust-inflation').checked = plannerState.adjustForInflation === true;
  renderRules();
  recalcAndRender();
});

function renderRules() {
  const list = document.getElementById('rules-list');
  list.innerHTML = '';
  document.getElementById('rules-count').textContent = `${plannerState.rules.length} rule(s)`;
  const sorted = plannerState.rules.slice().sort((a, b) => a.startMonth - b.startMonth);
  sorted.forEach((rule, idx) => {
      const div = document.createElement('div');
      div.className = 'rule-item';
      const number = idx + 1;
      const meta = rule.type === 'recurring'
        ? `#${number} ${rule.label} • ${currency(rule.amount)} • ${rule.frequency} • start m${rule.startMonth}${rule.endMonth ? `- end m${rule.endMonth}` : ''}`
        : `#${number} ${rule.label} • ${currency(rule.amount)} • at m${rule.startMonth}`;
      div.innerHTML = `
        <div class="rule-meta">${meta}</div>
        <div>
          <button data-edit="${rule.id}" data-number="${number}" style="margin-right:8px;">Edit</button>
          <button class="danger" data-id="${rule.id}">Remove</button>
        </div>`;
      list.appendChild(div);
      div.querySelector('button.danger').addEventListener('click', () => {
        plannerState.rules = plannerState.rules.filter(r => r.id !== rule.id);
        if (plannerState.editingRuleId === rule.id) {
          plannerState.editingRuleId = null;
          document.getElementById('cancel-edit').style.display = 'none';
          setEditIndicator(null);
          clearRuleForm();
        }
        renderRules();
        recalcAndRender();
      });
      div.querySelector('button[data-edit]').addEventListener('click', (e) => {
        const n = e.currentTarget.getAttribute('data-number');
        startEditRule(rule.id, parseInt(n));
      });
    });
}

function startEditRule(ruleId, displayNumber) {
  const rule = plannerState.rules.find(r => r.id === ruleId);
  if (!rule) return;
  plannerState.editingRuleId = ruleId;
  document.getElementById('rule-type').value = rule.type;
  document.getElementById('rule-label').value = rule.label || '';
  document.getElementById('rule-amount').value = rule.amount;
  document.getElementById('rule-start').value = rule.startMonth;
  const frequencyGroup = document.getElementById('frequency-group');
  const endMonthGroup = document.getElementById('end-month-group');
  if (rule.type === 'recurring') {
    frequencyGroup.style.display = '';
    endMonthGroup.style.display = '';
    document.getElementById('rule-frequency').value = rule.frequency || 'monthly';
    document.getElementById('rule-end').value = rule.endMonth != null ? rule.endMonth : '';
  } else {
    frequencyGroup.style.display = 'none';
    endMonthGroup.style.display = 'none';
    document.getElementById('rule-end').value = '';
  }
  document.getElementById('cancel-edit').style.display = '';
  setEditIndicator(displayNumber || 1);
  setAddButtonEditing(true);
}

function upsertRuleFromForm() {
  const type = document.getElementById('rule-type').value;
  const label = (document.getElementById('rule-label').value || '').trim() || (type === 'recurring' ? 'Recurring' : 'One-time');
  const amount = Math.max(0, parseFloat(document.getElementById('rule-amount').value) || 0);
  const startMonth = Math.max(1, parseInt(document.getElementById('rule-start').value) || 1);
  const frequency = document.getElementById('rule-frequency').value;
  const endVal = document.getElementById('rule-end').value;
  const endMonth = endVal ? Math.max(startMonth, parseInt(endVal)) : undefined;

  if (plannerState.editingRuleId) {
    const idx = plannerState.rules.findIndex(r => r.id === plannerState.editingRuleId);
    if (idx !== -1) {
      const updated = { ...plannerState.rules[idx], type, label, amount, startMonth };
      if (type === 'recurring') {
        updated.frequency = frequency;
        if (endMonth) updated.endMonth = endMonth; else delete updated.endMonth;
      } else {
        delete updated.frequency;
        delete updated.endMonth;
      }
      plannerState.rules[idx] = updated;
    }
    plannerState.editingRuleId = null;
    document.getElementById('cancel-edit').style.display = 'none';
    setEditIndicator(null);
    setAddButtonEditing(false);
  } else {
    const rule = { id: Date.now(), type, label, amount, startMonth };
    if (type === 'recurring') {
      rule.frequency = frequency; // monthly|quarterly|annual
      if (endMonth) rule.endMonth = endMonth;
    }
    plannerState.rules.push(rule);
  }
  clearRuleForm();
  renderRules();
  recalcAndRender();
}

function clearRuleForm() {
  document.getElementById('rule-type').value = 'recurring';
  document.getElementById('rule-label').value = '';
  document.getElementById('rule-amount').value = 500;
  document.getElementById('rule-start').value = 1;
  document.getElementById('rule-frequency').value = 'monthly';
  document.getElementById('rule-end').value = '';
  document.getElementById('frequency-group').style.display = '';
  document.getElementById('end-month-group').style.display = '';
}

function setEditIndicator(ruleNumberOrNull) {
  const el = document.getElementById('edit-indicator');
  if (!el) return;
  if (ruleNumberOrNull == null) {
    el.textContent = '';
  } else {
    el.textContent = `(editing rule #${ruleNumberOrNull})`;
  }
}

function setAddButtonEditing(isEditing) {
  const btn = document.getElementById('add-rule');
  if (!btn) return;
  btn.textContent = isEditing ? 'Save Changes' : 'Add Rule';
}

function recalcAndRender() {
  const months = Math.max(1, Math.round(plannerState.projectionYears * 12));
  const monthlyReturn = (plannerState.annualReturn / 100) / 12;
  const monthlyInflation = (plannerState.inflationRate / 100) / 12;

  // Precompute monthly contributions per month
  const monthlyContrib = new Array(months).fill(0);
  plannerState.rules.forEach(rule => {
    if (rule.type === 'one-time') {
      const idx = clampToRange(rule.startMonth - 1, 0, months - 1);
      monthlyContrib[idx] += rule.amount;
    } else {
      const freqStep = rule.frequency === 'monthly' ? 1 : rule.frequency === 'quarterly' ? 3 : 12;
      const startIdx = clampToRange(rule.startMonth - 1, 0, months - 1);
      const endIdx = rule.endMonth ? clampToRange(rule.endMonth - 1, 0, months - 1) : months - 1;
      for (let m = startIdx; m <= endIdx; m += freqStep) {
        monthlyContrib[m] += rule.amount;
      }
    }
  });

  const labels = Array.from({ length: months }, (_, i) => i + 1);
  const portfolioValues = new Array(months).fill(0);
  const cumulativeContribs = new Array(months).fill(0);
  const cumulativeInflation = new Array(months).fill(1);

  let portfolio = plannerState.initialInvestment;
  let contribSum = 0;
  for (let m = 0; m < months; m++) {
    contribSum += monthlyContrib[m];
    portfolio += monthlyContrib[m];
    portfolio *= (1 + monthlyReturn);
    portfolioValues[m] = portfolio;
    cumulativeContribs[m] = plannerState.initialInvestment + contribSum;
    if (m === 0) cumulativeInflation[m] = 1;
    else cumulativeInflation[m] = cumulativeInflation[m - 1] * (1 + monthlyInflation);
  }

  // Display numbers
  const endIdx = months - 1;
  const nominalEnd = portfolioValues[endIdx];
  const nominalContrib = cumulativeContribs[endIdx];
  const nominalGrowth = Math.max(0, nominalEnd - nominalContrib);

  const realFactor = cumulativeInflation[endIdx];
  const realEnd = nominalEnd / realFactor;
  const realContrib = cumulativeContribs.map((v, i) => v / cumulativeInflation[i])[endIdx];
  const realGrowth = Math.max(0, realEnd - realContrib);

  const useReal = plannerState.adjustForInflation;
  document.getElementById('ending-portfolio').textContent = currency(useReal ? realEnd : nominalEnd);
  document.getElementById('total-contributions').textContent = currency(useReal ? realContrib : nominalContrib);
  document.getElementById('total-growth').textContent = currency(useReal ? realGrowth : nominalGrowth);

  // Prepare chart datasets
  let valueSeries = portfolioValues;
  let contribSeries = cumulativeContribs;
  if (useReal) {
    valueSeries = portfolioValues.map((v, i) => v / cumulativeInflation[i]);
    contribSeries = cumulativeContribs.map((v, i) => v / cumulativeInflation[i]);
  }

  plannerChart.data.labels = labels;
  plannerChart.data.datasets = [
    {
      label: useReal ? 'Portfolio Value (real)' : 'Portfolio Value (nominal)',
      data: valueSeries.map(x => Math.round(x)),
      borderColor: '#1976d2',
      backgroundColor: '#1976d222',
      borderWidth: 3,
      fill: false,
      tension: 0.1,
      pointRadius: 0
    },
    {
      label: useReal ? 'Cumulative Contributions (real)' : 'Cumulative Contributions (nominal)',
      data: contribSeries.map(x => Math.round(x)),
      borderColor: '#4caf50',
      backgroundColor: '#4caf5022',
      borderWidth: 2,
      borderDash: [6, 4],
      fill: false,
      tension: 0.1,
      pointRadius: 0
    }
  ];
  plannerChart.options.scales.y.title.text = useReal ? "Value (Today's Dollars)" : 'Value';
  plannerChart.update();

  // Persist state (throttle not critical here as inputs are not high-frequency)
  try {
    const toSave = {
      initialInvestment: plannerState.initialInvestment,
      annualReturn: plannerState.annualReturn,
      inflationRate: plannerState.inflationRate,
      projectionYears: plannerState.projectionYears,
      adjustForInflation: plannerState.adjustForInflation,
      rules: plannerState.rules
    };
    localStorage.setItem('investmentPlannerState', JSON.stringify(toSave));
  } catch {}
}

function currency(v) {
  if (window.Common && Common.formatCurrency) return Common.formatCurrency(v);
  return '$' + (Math.round(v || 0)).toLocaleString();
}

function clampToRange(v, min, max) { return Math.max(min, Math.min(max, v)); }


