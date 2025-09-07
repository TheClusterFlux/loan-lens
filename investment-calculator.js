// Investment Calculator - Calculate monthly investment needed for target passive income
// This file contains all the logic for the investment calculator

let scenarios = [];
let currentScenarioIndex = 0;
let chart = null;
let currentChartView = 'portfolio'; // 'portfolio' or 'income'

// Investment calculation function
function calculateInvestmentPlan(targetMonthlyIncome, targetDate, annualReturn, initialInvestment, withdrawalRate, inflationRate, projectionYears, birthDate) {
  const currentDate = new Date();
  const target = new Date(targetDate);
  
  // Calculate months to target
  const monthsToTarget = Math.max(1, Math.round((target - currentDate) / (1000 * 60 * 60 * 24 * 30.44)));
  const yearsToTarget = monthsToTarget / 12;
  
  // Adjust target income for inflation to maintain purchasing power
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsToTarget);
  const inflationAdjustedIncome = targetMonthlyIncome * inflationMultiplier;
  
  // Calculate required portfolio value using inflation-adjusted income
  const requiredPortfolio = (inflationAdjustedIncome * 12) / (withdrawalRate / 100);
  
  // Convert annual return to monthly rate
  const monthlyReturn = annualReturn / 100 / 12;
  const monthlyInflation = inflationRate / 100 / 12;
  
  // Calculate future value of initial investment
  const futureValueInitial = initialInvestment * Math.pow(1 + monthlyReturn, monthsToTarget);
  
  // Calculate required monthly investment using future value of annuity formula
  // FV = PMT * [((1 + r)^n - 1) / r]
  // PMT = (FV - FV_initial) / [((1 + r)^n - 1) / r]
  
  let monthlyInvestmentNeeded = 0;
  if (monthlyReturn > 0) {
    const annuityFactor = (Math.pow(1 + monthlyReturn, monthsToTarget) - 1) / monthlyReturn;
    monthlyInvestmentNeeded = Math.max(0, (requiredPortfolio - futureValueInitial) / annuityFactor);
  } else {
    // If no return, simple division
    monthlyInvestmentNeeded = Math.max(0, (requiredPortfolio - initialInvestment) / monthsToTarget);
  }
  
  // Calculate total invested and growth
  const totalInvested = initialInvestment + (monthlyInvestmentNeeded * monthsToTarget);
  const investmentGrowth = requiredPortfolio - totalInvested;
  
  // Determine withdrawal phase length
  let withdrawalMonths;
  if (birthDate) {
    // If using age method, calculate until age 100 or projection years, whichever is shorter
    const birth = new Date(birthDate);
    const ageAtTarget = Math.floor((target - birth) / (1000 * 60 * 60 * 24 * 365.25));
    const maxAge = Math.min(100, ageAtTarget + projectionYears);
    withdrawalMonths = Math.max(0, (maxAge - ageAtTarget) * 12);
  } else {
    // If using date method, use projection years
    withdrawalMonths = projectionYears * 12;
  }
  
  // Generate monthly portfolio values for charting
  const portfolioValues = [];
  const monthlyIncomes = [];
  const timeLabels = [];
  let currentPortfolio = initialInvestment;
  
  // Investment phase - generate data every month but labels more sparsely
  for (let month = 0; month <= monthsToTarget; month++) {
    portfolioValues.push(currentPortfolio);
    monthlyIncomes.push(currentPortfolio * (withdrawalRate / 100) / 12);
    
    // Generate time labels - but only every 6 months for cleaner display
    if (month % 6 === 0 || month === monthsToTarget) {
      const currentTime = new Date(currentDate);
      currentTime.setMonth(currentTime.getMonth() + month);
      
      if (birthDate) {
        // Calculate age
        const birth = new Date(birthDate);
        const age = Math.floor((currentTime - birth) / (1000 * 60 * 60 * 24 * 365.25));
        timeLabels.push(age);
      } else {
        // Use date - only whole years
        timeLabels.push(currentTime.getFullYear());
      }
    } else {
      // Add empty label for data points without labels
      timeLabels.push('');
    }
    
    if (month < monthsToTarget) {
      // Add monthly investment and apply growth
      currentPortfolio += monthlyInvestmentNeeded;
      currentPortfolio *= (1 + monthlyReturn);
    }
  }
  
  // Withdrawal phase - use calculated withdrawal months with inflation adjustment
  let currentMonthlyWithdrawal = inflationAdjustedIncome; // Start with inflation-adjusted income
  let actualWithdrawalMonths = 0; // Track how long portfolio actually lasts
  
  for (let month = 1; month <= withdrawalMonths; month++) {
    // Apply growth first
    currentPortfolio *= (1 + monthlyReturn);
    
    // Apply inflation to withdrawal amount each month
    currentMonthlyWithdrawal *= (1 + monthlyInflation);
    
    // Then subtract the inflation-adjusted monthly withdrawal
    currentPortfolio -= currentMonthlyWithdrawal;
    
    // Don't let portfolio go negative
    currentPortfolio = Math.max(0, currentPortfolio);
    
    portfolioValues.push(currentPortfolio);
    // During withdrawal phase, monthly income is the current withdrawal amount (until portfolio depletes)
    monthlyIncomes.push(currentPortfolio > 0 ? currentMonthlyWithdrawal : 0);
    
    // Generate time labels for withdrawal phase - every 6 months for cleaner display
    if (month % 6 === 0 || month === withdrawalMonths || currentPortfolio <= 0) {
      const currentTime = new Date(target);
      currentTime.setMonth(currentTime.getMonth() + month);
      
      if (birthDate) {
        // Calculate age
        const birth = new Date(birthDate);
        const age = Math.floor((currentTime - birth) / (1000 * 60 * 60 * 24 * 365.25));
        timeLabels.push(age);
      } else {
        // Use date - only whole years
        timeLabels.push(currentTime.getFullYear());
      }
    } else {
      // Add empty label for data points without labels
      timeLabels.push('');
    }
    
    // Track actual sustainability
    if (currentPortfolio > 0) {
      actualWithdrawalMonths = month;
    }
    
    // Stop if portfolio is depleted
    if (currentPortfolio <= 0) {
      break;
    }
  }
  
  // Calculate actual sustainability
  const actualSustainabilityYears = actualWithdrawalMonths / 12;
  const portfolioLastsFullProjection = actualWithdrawalMonths >= withdrawalMonths;
  
  return {
    requiredPortfolio: Math.round(requiredPortfolio),
    inflationAdjustedIncome: Math.round(inflationAdjustedIncome),
    monthsToTarget,
    yearsToTarget: Math.round(yearsToTarget * 10) / 10,
    monthlyInvestmentNeeded: Math.round(monthlyInvestmentNeeded),
    totalInvested: Math.round(totalInvested),
    investmentGrowth: Math.round(investmentGrowth),
    portfolioValues: portfolioValues.map(v => Math.round(v)),
    monthlyIncomes: monthlyIncomes.map(i => Math.round(i)),
    timeLabels: timeLabels,
    withdrawalPhaseLength: actualWithdrawalMonths, // How many months the portfolio actually lasts
    portfolioSustainable: portfolioLastsFullProjection, // Whether portfolio lasts the full projection period
    actualSustainabilityYears: Math.round(actualSustainabilityYears * 10) / 10 // Actual years portfolio lasts
  };
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Set default target date to 10 years from now
  const defaultTargetDate = new Date();
  defaultTargetDate.setFullYear(defaultTargetDate.getFullYear() + 10);
  document.getElementById('target-date-0').value = defaultTargetDate.toISOString().split('T')[0];
  
  // Initialize scenarios array with saved state if present
  const saved = loadInvestmentTargetState();
  const profile = (function(){ try{ return JSON.parse(localStorage.getItem('aboutYouProfile'))||null; }catch(e){ return null; } })();
  if (saved && Array.isArray(saved.scenarios) && saved.scenarios.length > 0) {
    scenarios = [];
  } else {
    scenarios = [{
      id: 0,
      name: 'Scenario 1',
      targetIncome: 5000,
      targetDate: defaultTargetDate.toISOString().split('T')[0],
      annualReturn: 7,
      initialInvestment: 0,
      withdrawalRate: 4,
      inflationRate: 2.5
    }];
  }
  
  // Initialize Chart.js
  const ctx = document.getElementById('investment-chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: {
          top: 10,
          bottom: 20,
          left: 10,
          right: 10
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (window.Common && Common.formatNumber) {
                  label += Common.formatNumber(context.parsed.y);
                } else {
                  label += (Math.round(context.parsed.y)).toLocaleString();
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Timeline'
          },
          ticks: {
            maxTicksLimit: 15, // Limit number of ticks for cleaner display
            callback: function(value, index, values) {
              const label = this.getLabelForValue(value);
              // Only show non-empty labels
              return label !== '' ? label : '';
            }
          }
        },
        y: {
          title: {
            display: true,
            text: 'Portfolio Value'
          },
          ticks: {
            callback: function(value) {
              if (window.Common && Common.formatNumber) {
                return Common.formatNumber(value);
              }
              return (Math.round(value)).toLocaleString();
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
  
  // If saved scenarios exist, rebuild UI from saved, else init default
  if (saved && Array.isArray(saved.scenarios) && saved.scenarios.length > 0) {
    // Initialize in-memory scenarios placeholders
    scenarios = saved.scenarios.map((s, i) => ({ id: i, name: s.name || `Scenario ${i + 1}` }));
    rebuildScenariosUI(saved.scenarios.length);
    saved.scenarios.forEach((s, i) => {
      // Set scenario name field
      const nm = document.getElementById(`scenario-name-${i}`);
      if (nm) nm.value = s.name || `Scenario ${i + 1}`;
      document.getElementById(`target-income-${i}`).value = Number(s.targetIncome) || 0;
      document.getElementById(`annual-return-${i}`).value = Number(s.annualReturn) || 0;
      document.getElementById(`initial-investment-${i}`).value = Number(s.initialInvestment) || 0;
      document.getElementById(`withdrawal-rate-${i}`).value = Number(s.withdrawalRate) || 4;
      document.getElementById(`inflation-rate-${i}`).value = Number(s.inflationRate) || 2.5;
      document.getElementById(`projection-years-${i}`).value = Number(s.projectionYears) || 50;
      if (s.targetDate) {
        toggleTargetMethod(i, 'date');
        document.getElementById(`target-date-${i}`).value = s.targetDate;
      } else if (s.birthDate && s.targetAge) {
        toggleTargetMethod(i, 'age');
        document.getElementById(`birth-date-${i}`).value = s.birthDate || (profile && profile.dateOfBirth ? profile.dateOfBirth : '');
        document.getElementById(`target-age-${i}`).value = Number(s.targetAge) || (profile && profile.retireAge ? Number(profile.retireAge) : 65);
      }
      calculateInvestment(i);
    });
    const idx = typeof saved.activeIndex === 'number' ? Math.min(Math.max(0, saved.activeIndex), saved.scenarios.length - 1) : 0;
    switchScenario(idx);
  } else {
    // Initial calculation
    // Apply About You defaults for scenario 0 if available
    if (profile && (profile.dateOfBirth || profile.retireAge)) {
      // Default to age method if DOB or retireAge present
      toggleTargetMethod(0, 'age');
      if (profile.dateOfBirth) {
        const dobEl = document.getElementById('birth-date-0');
        if (dobEl) dobEl.value = profile.dateOfBirth;
      }
      if (profile.retireAge) {
        const targEl = document.getElementById('target-age-0');
        if (targEl) targEl.value = Number(profile.retireAge);
      }
    }
    // Apply defaults from risk for returns/inflation/SWR
    const defs = Common.getDefaultsFromRisk();
    const rEl = document.getElementById('annual-return-0'); if (rEl && !rEl.value) rEl.value = defs.expectedReturn;
    const infEl = document.getElementById('inflation-rate-0'); if (infEl && !infEl.value) infEl.value = defs.inflation;
    const swrEl = document.getElementById('withdrawal-rate-0'); if (swrEl && !swrEl.value) swrEl.value = defs.swr;
    calculateInvestment(0);
  }
});

// Calculate investment for a specific scenario
function calculateInvestment(scenarioIndex) {
  const targetIncome = parseFloat(document.getElementById(`target-income-${scenarioIndex}`).value) || 0;
  const annualReturn = parseFloat(document.getElementById(`annual-return-${scenarioIndex}`).value) || 0;
  const initialInvestment = parseFloat(document.getElementById(`initial-investment-${scenarioIndex}`).value) || 0;
  const withdrawalRate = parseFloat(document.getElementById(`withdrawal-rate-${scenarioIndex}`).value) || 4;
  const inflationRate = parseFloat(document.getElementById(`inflation-rate-${scenarioIndex}`).value) || 2.5;
  const projectionYears = parseFloat(document.getElementById(`projection-years-${scenarioIndex}`).value) || 50;
  
  // Determine target date based on method (date picker vs age)
  let targetDate, birthDate;
  const dateInputs = document.getElementById(`date-inputs-${scenarioIndex}`);
  const ageInputs = document.getElementById(`age-inputs-${scenarioIndex}`);
  
  if (dateInputs && dateInputs.classList.contains('active')) {
    targetDate = document.getElementById(`target-date-${scenarioIndex}`).value;
    birthDate = null;
  } else if (ageInputs && ageInputs.classList.contains('active')) {
    birthDate = document.getElementById(`birth-date-${scenarioIndex}`).value;
    const targetAge = parseFloat(document.getElementById(`target-age-${scenarioIndex}`).value) || 65;
    
    if (birthDate) {
      const birth = new Date(birthDate);
      const target = new Date(birth);
      target.setFullYear(birth.getFullYear() + targetAge);
      targetDate = target.toISOString().split('T')[0];
    }
  }
  
  // Clear previous messages
  document.getElementById(`error-message-${scenarioIndex}`).textContent = '';
  document.getElementById(`success-message-${scenarioIndex}`).textContent = '';
  
  // Validation
  if (!targetDate) {
    document.getElementById(`error-message-${scenarioIndex}`).textContent = 'Please select a target date or enter your birth date and target age';
    return;
  }
  
  const target = new Date(targetDate);
  const current = new Date();
  
  if (target <= current) {
    document.getElementById(`error-message-${scenarioIndex}`).textContent = 'Target date must be in the future';
    return;
  }
  
  if (targetIncome <= 0) {
    document.getElementById(`error-message-${scenarioIndex}`).textContent = 'Target income must be greater than 0';
    return;
  }
  
  // Calculate investment plan
  const result = calculateInvestmentPlan(targetIncome, targetDate, annualReturn, initialInvestment, withdrawalRate, inflationRate, projectionYears, birthDate);
  
  // Update scenario data
  scenarios[scenarioIndex] = {
    ...scenarios[scenarioIndex],
    targetIncome,
    targetDate,
    annualReturn,
    initialInvestment,
    withdrawalRate,
    inflationRate,
    projectionYears,
    birthDate,
    result
  };
  
  // Update UI
  document.getElementById(`portfolio-value-${scenarioIndex}`).textContent = 
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(result.requiredPortfolio);
  document.getElementById(`adjusted-income-${scenarioIndex}`).textContent = 
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(result.inflationAdjustedIncome);
  document.getElementById(`years-to-target-${scenarioIndex}`).textContent = result.yearsToTarget + ' years';
  document.getElementById(`monthly-investment-${scenarioIndex}`).textContent = 
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(result.monthlyInvestmentNeeded);
  document.getElementById(`total-invested-${scenarioIndex}`).textContent = 
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(result.totalInvested);
  document.getElementById(`investment-growth-${scenarioIndex}`).textContent = 
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(result.investmentGrowth);
  
  // Portfolio sustainability
  const sustainabilityElement = document.getElementById(`portfolio-sustainability-${scenarioIndex}`);
  if (result.portfolioSustainable) {
    sustainabilityElement.textContent = `${result.actualSustainabilityYears}+ years`;
    sustainabilityElement.style.color = '#4caf50';
  } else {
    sustainabilityElement.textContent = `${result.actualSustainabilityYears} years`;
    sustainabilityElement.style.color = result.actualSustainabilityYears >= 15 ? '#ff9800' : '#f44336';
  }
  
  // Show success message
  if (result.monthlyInvestmentNeeded > 0) {
    document.getElementById(`success-message-${scenarioIndex}`).textContent = 
      `Great! Invest ${result.monthlyInvestmentNeeded.toLocaleString()} monthly to reach your goal.`;
  }
  
  // Update chart
  updateChart();
  // Save state after calculation
  saveInvestmentTargetState();
  // Monthly income warning vs profile income
  try {
    const prof = Common.getProfile();
    const income = Number(prof.income) || 0;
    const lbl = document.getElementById(`success-message-${scenarioIndex}`);
    if (income > 0 && scenarios[scenarioIndex]?.result?.monthlyInvestmentNeeded) {
      const need = scenarios[scenarioIndex].result.monthlyInvestmentNeeded;
      if (need > income) {
        lbl.textContent = `Warning: Required monthly investment ${Common.formatCurrency(need)} exceeds your monthly income ${Common.formatCurrency(income)}.`;
        lbl.style.color = '#f44336';
      }
    }
  } catch(e){}
}

// Update chart with all scenarios
function updateChart() {
  const datasets = [];
  const colors = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];
  let allTimeLabels = [];
  let maxDataPoints = 0;
  
  scenarios.forEach((scenario, index) => {
    if (scenario.result && scenario.result.portfolioValues) {
      maxDataPoints = Math.max(maxDataPoints, scenario.result.portfolioValues.length);
      if (scenario.result.timeLabels && scenario.result.timeLabels.length > allTimeLabels.length) {
        allTimeLabels = scenario.result.timeLabels;
      }
      
      const targetMonth = scenario.result.monthsToTarget;
      const color = colors[index % colors.length];
      
      if (currentChartView === 'portfolio') {
        // Investment phase
        const investmentPhaseData = scenario.result.portfolioValues.slice(0, targetMonth + 1);
        datasets.push({
          label: `${scenario.name} - Investment Phase`,
          data: investmentPhaseData,
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 3,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 5
        });
        
        // Withdrawal phase (if exists)
        if (scenario.result.portfolioValues.length > targetMonth + 1) {
          const withdrawalPhaseData = new Array(targetMonth).fill(null)
            .concat(scenario.result.portfolioValues.slice(targetMonth));
          
          datasets.push({
            label: `${scenario.name} - Withdrawal Phase`,
            data: withdrawalPhaseData,
            borderColor: color,
            backgroundColor: color + '10',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5
          });
        }
      } else if (currentChartView === 'income') {
        // Investment phase income potential
        const investmentPhaseIncomes = scenario.result.monthlyIncomes.slice(0, targetMonth + 1);
        datasets.push({
          label: `${scenario.name} - Potential Income`,
          data: investmentPhaseIncomes,
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 5
        });
        
        // Actual withdrawal income (if exists)
        if (scenario.result.monthlyIncomes.length > targetMonth + 1) {
          const withdrawalPhaseIncomes = new Array(targetMonth).fill(null)
            .concat(scenario.result.monthlyIncomes.slice(targetMonth));
          
          datasets.push({
            label: `${scenario.name} - Actual Income`,
            data: withdrawalPhaseIncomes,
            borderColor: color,
            backgroundColor: color + '30',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5
          });
        }
      }
    }
  });
  
  // Determine x-axis title based on whether we're using age or date
  let xAxisTitle = 'Time';
  const hasAgeLabels = scenarios.some(s => s.birthDate);
  if (hasAgeLabels) {
    xAxisTitle = 'Age';
  } else {
    xAxisTitle = 'Year';
  }
  
  // Update y-axis title based on current view
  const yAxisTitle = currentChartView === 'portfolio' ? 'Portfolio Value' : 'Monthly Income';
  chart.options.scales.y.title.text = yAxisTitle;
  chart.options.scales.x.title.text = xAxisTitle;
  
  chart.data.labels = allTimeLabels;
  chart.data.datasets = datasets;
  chart.update();
}

// Add new scenario
function addScenario() {
  const newIndex = scenarios.length;
  const defaultTargetDate = new Date();
  defaultTargetDate.setFullYear(defaultTargetDate.getFullYear() + 10);
  
  // Add to scenarios array
  scenarios.push({
    id: newIndex,
    name: `Scenario ${newIndex + 1}`,
    targetIncome: 5000,
    targetDate: defaultTargetDate.toISOString().split('T')[0],
    annualReturn: 7,
    initialInvestment: 0,
    withdrawalRate: 4,
    inflationRate: 2.5
  });
  // Rebuild tabs/panels to ensure correct numbering and handlers
  rebuildScenariosUI(scenarios.length);
  // Set default values for the new scenario
  const dateInput = document.getElementById(`target-date-${newIndex}`);
  const dobEl = document.getElementById(`birth-date-${newIndex}`);
  const targEl = document.getElementById(`target-age-${newIndex}`);
  const nm = document.getElementById(`scenario-name-${newIndex}`);
  if (nm) nm.value = `Scenario ${newIndex + 1}`;
  if (dateInput) dateInput.value = defaultTargetDate.toISOString().split('T')[0];
  if (profile && (profile.dateOfBirth || profile.retireAge)) {
    // Prefer age method when profile available
    toggleTargetMethod(newIndex, 'age');
    if (dobEl && profile.dateOfBirth) dobEl.value = profile.dateOfBirth;
    if (targEl && profile.retireAge) targEl.value = Number(profile.retireAge);
  }
  // Apply defaults from risk for returns/inflation/SWR
  const defs = Common.getDefaultsFromRisk();
  const rEl = document.getElementById(`annual-return-${newIndex}`); if (rEl && !rEl.value) rEl.value = defs.expectedReturn;
  const infEl = document.getElementById(`inflation-rate-${newIndex}`); if (infEl && !infEl.value) infEl.value = defs.inflation;
  const swrEl = document.getElementById(`withdrawal-rate-${newIndex}`); if (swrEl && !swrEl.value) swrEl.value = defs.swr;
  calculateInvestment(newIndex);
  switchScenario(newIndex);
  saveInvestmentTargetState();
}

// Remove current scenario
function removeCurrentScenario() {
  if (scenarios.length <= 1) {
    alert('At least one scenario is required.');
    return;
  }
  if (!confirm('Remove the current scenario?')) return;
  const index = currentScenarioIndex;
  scenarios.splice(index, 1);
  // Rebuild UI based on new length
  rebuildScenariosUI(scenarios.length);
  // Recalculate each panel with existing DOM values
  for (let i = 0; i < scenarios.length; i++) {
    calculateInvestment(i);
  }
  // Select a valid index
  currentScenarioIndex = Math.min(index, scenarios.length - 1);
  switchScenario(currentScenarioIndex);
  saveInvestmentTargetState();
}

// Helper: rebuild scenario tabs and panels to match count
function rebuildScenariosUI(count) {
  // Remove existing tabs (scenario buttons only)
  document.querySelectorAll('.scenario-tabs .tab-button').forEach(el => el.remove());
  // Remove existing panels
  document.querySelectorAll('.scenario-panel').forEach(p => p.remove());
  const tabsContainer = document.querySelector('.scenario-tabs');
  const firstActionBtn = tabsContainer.querySelector('.add-scenario-btn');
  const chartContainer = document.querySelector('.chart-container');
  // Create tabs and panels
  for (let i = 0; i < count; i++) {
    if (scenarios[i]) {
      scenarios[i].id = i;
      scenarios[i].name = `Scenario ${i + 1}`;
    }
    // Tab
    const tab = document.createElement('div');
    tab.className = 'tab-button';
    tab.textContent = scenarios[i]?.name || `Scenario ${i + 1}`;
    tab.onclick = () => switchScenario(i);
    tabsContainer.insertBefore(tab, firstActionBtn);
    // Panel
    const panel = document.createElement('div');
    panel.id = `scenario-${i}`;
    panel.className = 'scenario-panel' + (i === 0 ? ' active' : '');
    panel.innerHTML = `
      <div class="calculator-container">
        <div class="input-panel">
          <h3>Investment Parameters</h3>
          <div class="form-section">
            <div class="section-title">Scenario</div>
            <div class="form-group">
              <label for="scenario-name-${i}">Scenario Name</label>
              <input type="text" id="scenario-name-${i}" value="${scenarios[i]?.name || `Scenario ${i + 1}`}" oninput="renameScenario(${i}, this.value)">
            </div>
          </div>
          <div class="form-section">
            <div class="section-title">Goal Settings</div>
            <div class="form-group">
              <div class="field-with-tooltip">
                <label for="target-income-${i}">Target Monthly Passive Income (pre tax)</label>
                <div class="info-icon">i
                  <div class="tooltip">The amount of monthly income you want to receive from your investments without touching the principal.</div>
                </div>
              </div>
              <input type="number" id="target-income-${i}" min="0" step="100" value="5000" oninput="calculateInvestment(${i})">
            </div>
            <div class="form-group">
              <div class="field-with-tooltip">
                <label>Target Timeline</label>
                <div class="info-icon">i
                  <div class="tooltip">Choose how you want to specify when you want to achieve your goal.</div>
                </div>
              </div>
              <div class="target-method-toggle">
                <div class="toggle-button active" onclick="toggleTargetMethod(${i}, 'date')">Target Date</div>
                <div class="toggle-button" onclick="toggleTargetMethod(${i}, 'age')">Target Age</div>
              </div>
              <div class="date-inputs active" id="date-inputs-${i}">
                <label for="target-date-${i}">Target Date</label>
                <input type="date" id="target-date-${i}" oninput="calculateInvestment(${i})">
              </div>
              <div class="age-inputs" id="age-inputs-${i}">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div>
                    <label for="birth-date-${i}">Date of Birth</label>
                    <input type="date" id="birth-date-${i}" oninput="calculateInvestment(${i})">
                  </div>
                  <div>
                    <label for="target-age-${i}">Target Age</label>
                    <input type="number" id="target-age-${i}" min="18" max="100" value="65" oninput="calculateInvestment(${i})">
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="form-section">
            <div class="section-title">Investment Settings</div>
            <div class="form-grid">
              <div class="form-group">
                <div class="field-with-tooltip">
                  <label for="annual-return-${i}">Expected Annual Return (%)</label>
                  <div class="info-icon">i<div class="tooltip">Average yearly return you expect from investments.</div></div>
                </div>
                <input type="number" id="annual-return-${i}" min="0" max="50" step="0.1" value="7" oninput="calculateInvestment(${i})">
              </div>
              <div class="form-group">
                <div class="field-with-tooltip">
                  <label for="initial-investment-${i}">Initial Investment</label>
                  <div class="info-icon">i<div class="tooltip">Amount you already have invested as a lump sum.</div></div>
                </div>
                <input type="number" id="initial-investment-${i}" min="0" step="1000" value="0" oninput="calculateInvestment(${i})">
              </div>
            </div>
          </div>
          <div class="form-section">
            <div class="section-title">Withdrawal & Risk Settings</div>
            <div class="form-grid">
              <div class="form-group">
                <div class="field-with-tooltip">
                  <label for="withdrawal-rate-${i}">Safe Withdrawal Rate (%)</label>
                  <div class="info-icon">i<div class="tooltip">Percentage of your portfolio you can withdraw annually.</div></div>
                </div>
                <input type="number" id="withdrawal-rate-${i}" min="1" max="10" step="0.1" value="4" oninput="calculateInvestment(${i})">
              </div>
              <div class="form-group">
                <div class="field-with-tooltip">
                  <label for="inflation-rate-${i}">Expected Inflation Rate (%)</label>
                  <div class="info-icon">i<div class="tooltip">Expected annual inflation rate.</div></div>
                </div>
                <input type="number" id="inflation-rate-${i}" min="0" max="10" step="0.1" value="2.5" oninput="calculateInvestment(${i})">
              </div>
            </div>
          </div>
          <div class="form-section">
            <div class="section-title">Chart Settings</div>
            <div class="form-group">
              <div class="field-with-tooltip">
                <label for="projection-years-${i}">Projection Period (Years)</label>
                <div class="info-icon">i<div class="tooltip">Years to show beyond target date.</div></div>
              </div>
              <input type="number" id="projection-years-${i}" min="10" max="70" step="5" value="50" oninput="calculateInvestment(${i})">
            </div>
          </div>
        </div>
        <div class="results-panel">
          <h3>Investment Results</h3>
          <div class="result-item"><span class="result-label">Required Portfolio Value:</span><span class="result-value" id="portfolio-value-${i}">0</span></div>
          <div class="result-item"><span class="result-label">Inflation-Adjusted Target Income:</span><span class="result-value" id="adjusted-income-${i}">0</span></div>
          <div class="result-item"><span class="result-label">Years to Target:</span><span class="result-value" id="years-to-target-${i}">0</span></div>
          <div class="result-item"><span class="result-label">Monthly Investment Needed:</span><span class="result-value highlight" id="monthly-investment-${i}">0</span></div>
          <div class="result-item"><span class="result-label">Total Invested:</span><span class="result-value" id="total-invested-${i}">0</span></div>
          <div class="result-item"><span class="result-label">Investment Growth:</span><span class="result-value" id="investment-growth-${i}">0</span></div>
          <div class="result-item"><span class="result-label">Portfolio Sustainability:</span><span class="result-value" id="portfolio-sustainability-${i}">-</span></div>
          <div id="error-message-${i}" class="error"></div>
          <div id="success-message-${i}" class="success"></div>
        </div>
      </div>
    `;
    chartContainer.parentNode.insertBefore(panel, chartContainer);
  }
}

// Switch between scenarios
function switchScenario(index) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach((tab, i) => {
    if (i === index) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Update panels
  document.querySelectorAll('.scenario-panel').forEach((panel, i) => {
    if (i === index) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
  
  currentScenarioIndex = index;
  saveInvestmentTargetState();
}

// Rename scenario
function renameScenario(index, newName) {
  if (!scenarios[index]) return;
  scenarios[index].name = newName || `Scenario ${index + 1}`;
  // Update tab label
  const tabs = document.querySelectorAll('.scenario-tabs .tab-button');
  if (tabs[index]) tabs[index].textContent = scenarios[index].name;
  saveInvestmentTargetState();
}

// Refresh scenario from About You profile defaults
function refreshScenarioFromProfile() {
  const i = currentScenarioIndex;
  const prof = Common.getProfile();
  const defs = Common.getDefaultsFromRisk();
  if (prof.dateOfBirth) {
    toggleTargetMethod(i, 'age');
    const dobEl = document.getElementById(`birth-date-${i}`);
    if (dobEl) dobEl.value = prof.dateOfBirth;
  }
  if (prof.retireAge) {
    const ta = document.getElementById(`target-age-${i}`);
    if (ta) ta.value = Number(prof.retireAge);
  }
  const rEl = document.getElementById(`annual-return-${i}`); if (rEl) rEl.value = defs.expectedReturn;
  const infEl = document.getElementById(`inflation-rate-${i}`); if (infEl) infEl.value = defs.inflation;
  const swrEl = document.getElementById(`withdrawal-rate-${i}`); if (swrEl) swrEl.value = defs.swr;
  calculateInvestment(i);
}

// Toggle between date and age input methods
function toggleTargetMethod(scenarioIndex, method) {
  const dateInputs = document.getElementById(`date-inputs-${scenarioIndex}`);
  const ageInputs = document.getElementById(`age-inputs-${scenarioIndex}`);
  const toggleButtons = document.querySelectorAll(`#scenario-${scenarioIndex} .toggle-button`);
  
  // Update toggle buttons
  toggleButtons.forEach((button, i) => {
    if ((method === 'date' && i === 0) || (method === 'age' && i === 1)) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Show/hide appropriate inputs
  if (method === 'date') {
    dateInputs.classList.add('active');
    ageInputs.classList.remove('active');
  } else {
    dateInputs.classList.remove('active');
    ageInputs.classList.add('active');
  }
  
  // Recalculate when method changes
  calculateInvestment(scenarioIndex);
}

// Switch between chart views
function switchChartTab(view) {
  currentChartView = view;
  
  // Update tab buttons
  document.querySelectorAll('.chart-tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  if (view === 'portfolio') {
    document.querySelector('.chart-tab-button').classList.add('active');
  } else {
    document.querySelectorAll('.chart-tab-button')[1].classList.add('active');
  }
  
  // Update chart
  updateChart();
  saveInvestmentTargetState();
}

// Persistence helpers for Investment Target Calculator
function saveInvestmentTargetState() {
  try {
    const payload = {
      version: 1,
      activeIndex: currentScenarioIndex,
      scenarios: scenarios.map((s, i) => ({
        name: document.getElementById(`scenario-name-${i}`)?.value || s.name || `Scenario ${i + 1}`,
        targetIncome: Number(document.getElementById(`target-income-${i}`)?.value) || s.targetIncome || 0,
        targetDate: document.getElementById(`target-date-${i}`)?.value || s.targetDate || null,
        birthDate: document.getElementById(`birth-date-${i}`)?.value || s.birthDate || null,
        targetAge: Number(document.getElementById(`target-age-${i}`)?.value) || s.targetAge || null,
        annualReturn: Number(document.getElementById(`annual-return-${i}`)?.value) || s.annualReturn || 0,
        initialInvestment: Number(document.getElementById(`initial-investment-${i}`)?.value) || s.initialInvestment || 0,
        withdrawalRate: Number(document.getElementById(`withdrawal-rate-${i}`)?.value) || s.withdrawalRate || 4,
        inflationRate: Number(document.getElementById(`inflation-rate-${i}`)?.value) || s.inflationRate || 2.5,
        projectionYears: Number(document.getElementById(`projection-years-${i}`)?.value) || s.projectionYears || 50,
        // Store key result summaries for About You page
        result: s.result ? {
          requiredPortfolio: s.result.requiredPortfolio,
          monthlyInvestmentNeeded: s.result.monthlyInvestmentNeeded,
          inflationAdjustedIncome: s.result.inflationAdjustedIncome,
          yearsToTarget: s.result.yearsToTarget
        } : null
      }))
    };
    localStorage.setItem('investmentTargetState', JSON.stringify(payload));
  } catch (e) {}
}

function loadInvestmentTargetState() {
  try {
    const raw = localStorage.getItem('investmentTargetState');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // simple migration placeholder
    if (!parsed.version) parsed.version = 1;
    return parsed;
  } catch (e) {
    return null;
  }
}
