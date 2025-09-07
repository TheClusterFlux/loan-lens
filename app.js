// LoanLens - Single file loan calculator application
// This file contains all the logic for the loan calculator in one place

// Loan calculation function - similar to what was in server.js but now in the frontend
function calculateLoan(principal, annualInterestRate, monthlyPayment, deposits) {
  let balance = principal;
  const balances = [balance];
  let totalRepayment = 0;
  let totalInterest = 0;
  
  // Convert annual interest rate to monthly rate
  const monthlyInterestRate = annualInterestRate / 100 / 12;
  
  // Calculate loan repayment
  for (let month = 1; month <= 1000; month++) {
    const interest = balance * monthlyInterestRate;
    const adjustment = monthlyPayment - interest;
    balance -= adjustment;
    totalRepayment += monthlyPayment;
    totalInterest += interest;
    
    // Apply any deposits for this month
    const deposit = deposits[month] || 0;
    if (deposit > 0) {
      balance -= deposit;
      totalRepayment += deposit;
    }
    
    // Make sure balance doesn't go below zero
    balance = Math.max(0, balance);
    
    balances.push(balance);
    
    // Check if loan is paid off
    if (balance <= 0) {
      break;
    }
  }
  
  return {
    timeToRepayment: balances.length - 1, // in months
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    balances: balances.map(b => Math.round(b * 100) / 100)
  };
}

// DOM Elements
let tabs = [];
let currentTabIndex = 0;
let chart = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Add event listeners to buttons
  document.getElementById('add-tab-btn').addEventListener('click', addNewTab);
  document.getElementById('duplicate-tab-btn').addEventListener('click', duplicateCurrentTab);
  const removeBtn = document.getElementById('remove-tab-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', removeCurrentTab);
  }
  
  // Initialize Chart.js
  const ctx = document.getElementById('loan-chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
                if (window.Common && Common.formatCurrency) {
                  label += Common.formatCurrency(context.parsed.y);
                } else {
                  label += '$' + (Math.round(context.parsed.y)).toLocaleString();
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
            text: 'Months'
          },
          ticks: {
            stepSize: 12, // Show every year (12 months)
            callback: function(value, index, values) {
              // Convert months to years for cleaner display
              if (value % 12 === 0) {
                return Math.floor(value / 12) + ' yr';
              }
              return '';
            }
          }
        },
        y: {
          title: {
            display: true,
            text: 'Remaining Balance ($)'
          },
          ticks: {
            callback: function(value) {
              if (window.Common && Common.formatCurrency) {
                return Common.formatCurrency(value);
              }
              return '$' + (Math.round(value)).toLocaleString();
            }
          },
          // Set minimum value to 0 to prevent negative values
          min: 0
        }
      }
    }
  });
  
  // Load saved state or add an initial tab
  loadLoanStateOrInit();
});

// Add a new tab
function addNewTab() {
  const tabId = Date.now();
  const tabNumber = tabs.length + 1;
  
  // Create a new tab object
  const newTab = {
    id: tabId,
    title: `Loan ${tabNumber}`,
    principal: 0,
    interestRate: 0,
    monthlyPayment: 0,
    deposits: {},
    results: null
  };
  
  // Add tab to list
  tabs.push(newTab);
  
  // Create tab button
  const tabsContainer = document.getElementById('tabs-container');
  const tabButton = document.createElement('button');
  tabButton.className = 'tab-button';
  tabButton.textContent = newTab.title;
  tabButton.dataset.tabId = tabId;
  // Fix: Use index for selectTab instead of the length
  const tabIndex = tabs.length - 1;
  tabButton.addEventListener('click', () => selectTab(tabIndex));
  tabsContainer.appendChild(tabButton);
  
  // Create tab panel
  const tabContent = createTabPanel(newTab);
  document.getElementById('tab-panels').appendChild(tabContent);
  
  // Select the new tab
  selectTab(tabs.length - 1);
  saveLoanState();
}

// Create the HTML for a new tab panel
function createTabPanel(tab) {
  const panel = document.createElement('div');
  panel.className = 'tab-panel';
  panel.dataset.tabId = tab.id;
  panel.style.display = 'none';
  
  panel.innerHTML = `
    <div class="loan-form">
      <div class="form-row">
        <label>Loan Name:</label>
        <input type="text" class="loan-title" value="${tab.title}" />
      </div>
      <div class="form-row">
        <label>Principal Amount:</label>
        <input type="number" class="principal" value="${tab.principal}" min="0" />
      </div>
      <div class="form-row">
        <label>Interest Rate (%):</label>
        <input type="number" class="interest-rate" value="${tab.interestRate}" min="0" step="0.01" />
      </div>
      <div class="form-row">
        <label>Monthly Payment:</label>
        <input type="number" class="monthly-payment" value="${tab.monthlyPayment}" min="0" />
      </div>
    </div>
    
    <div class="results-container" style="display: none;">
      <div class="results-row">
        <div class="result-box">
          <h3>Time to Repayment</h3>
          <div class="time-to-repayment-value">-</div>
          <div class="time-to-repayment-years">-</div>
        </div>
        <div class="result-box">
          <h3>Total Repayment</h3>
          <div class="total-repayment-value">-</div>
        </div>
        <div class="result-box">
          <h3>Total Interest</h3>
          <div class="total-interest-value">-</div>
        </div>
      </div>
    </div>
    
    <div class="deposits-section">
      <h3>Additional Deposits</h3>
      <div class="form-row">
        <label>Month:</label>
        <input type="number" class="deposit-month" min="1" />
      </div>
      <div class="form-row">
        <label>Amount:</label>
        <input type="number" class="deposit-amount" min="0" />
      </div>
      <button class="add-deposit-btn">Add Deposit</button>
      
      <div class="deposits-list-container">
        <h4>Current Deposits</h4>
        <ul class="deposits-list"></ul>
      </div>
    </div>
  `;
  
  // Add event listeners to the form fields
  const titleInput = panel.querySelector('.loan-title');
  const principalInput = panel.querySelector('.principal');
  const interestRateInput = panel.querySelector('.interest-rate');
  const monthlyPaymentInput = panel.querySelector('.monthly-payment');
  
  titleInput.addEventListener('input', (e) => {
    const index = tabs.findIndex(t => t.id === tab.id);
    if (index !== -1) {
      tabs[index].title = e.target.value;
      document.querySelector(`.tab-button[data-tab-id="${tab.id}"]`).textContent = e.target.value;
      saveLoanState();
    }
  });
  
  // Update calculation when inputs change
  [principalInput, interestRateInput, monthlyPaymentInput].forEach(input => {
    input.addEventListener('input', () => updateCalculation(tab.id));
  });
  
  // Set up deposit functionality
  const addDepositBtn = panel.querySelector('.add-deposit-btn');
  addDepositBtn.addEventListener('click', () => {
    const monthInput = panel.querySelector('.deposit-month');
    const amountInput = panel.querySelector('.deposit-amount');
    
    const month = parseInt(monthInput.value);
    const amount = parseFloat(amountInput.value);
    
    if (!isNaN(month) && !isNaN(amount) && month > 0 && amount > 0) {
      // Add deposit to the tab data
      const index = tabs.findIndex(t => t.id === tab.id);
      if (index !== -1) {
        tabs[index].deposits[month] = amount;
        
        // Update deposits list
        updateDepositsList(panel, tabs[index].deposits);
        
        // Clear inputs
        monthInput.value = '';
        amountInput.value = '';
        
        // Update calculation
        updateCalculation(tab.id);
        saveLoanState();
      }
    }
  });
  
  return panel;
}

// Select a tab
function selectTab(index) {
  // Update current tab index
  currentTabIndex = index;
  
  // Hide all tab panels
  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(panel => panel.style.display = 'none');
  
  // Remove 'active' class from all tab buttons
  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach(button => button.classList.remove('active'));
  
  // Show selected tab panel and mark button as active
  const selectedTab = tabs[index];
  if (!selectedTab) return; // Safety check
  
  const panel = document.querySelector(`.tab-panel[data-tab-id="${selectedTab.id}"]`);
  if (panel) panel.style.display = 'block';
  
  const button = document.querySelector(`.tab-button[data-tab-id="${selectedTab.id}"]`);
  if (button) button.classList.add('active');
  // Persist selected index
  saveLoanState();
}

// Duplicate the current tab
function duplicateCurrentTab() {
  if (tabs.length === 0) return;
  
  const currentTab = tabs[currentTabIndex];
  const tabId = Date.now();
  
  // Create a copy of the current tab
  const newTab = {
    id: tabId,
    title: `${currentTab.title} (Copy)`,
    principal: currentTab.principal,
    interestRate: currentTab.interestRate,
    monthlyPayment: currentTab.monthlyPayment,
    deposits: { ...currentTab.deposits },
    results: currentTab.results ? { ...currentTab.results } : null
  };
  
  // Add the new tab
  tabs.push(newTab);
  
  // Create tab button
  const tabsContainer = document.getElementById('tabs-container');
  const tabButton = document.createElement('button');
  tabButton.className = 'tab-button';
  tabButton.textContent = newTab.title;
  tabButton.dataset.tabId = tabId;
  // Fix: Use index for selectTab
  const tabIndex = tabs.length - 1;
  tabButton.addEventListener('click', () => selectTab(tabIndex));
  tabsContainer.appendChild(tabButton);
  
  // Create tab panel
  const tabContent = createTabPanel(newTab);
  document.getElementById('tab-panels').appendChild(tabContent);
  
  // Update deposits list in the new tab
  const panel = document.querySelector(`.tab-panel[data-tab-id="${tabId}"]`);
  updateDepositsList(panel, newTab.deposits);
  
  // Fill in form values
  panel.querySelector('.principal').value = newTab.principal;
  panel.querySelector('.interest-rate').value = newTab.interestRate;
  panel.querySelector('.monthly-payment').value = newTab.monthlyPayment;
  
  // Update the calculation for the new tab
  updateCalculation(tabId);
  
  // Select the new tab
  selectTab(tabs.length - 1);
  saveLoanState();
}

// Remove the current tab
function removeCurrentTab() {
  if (tabs.length === 0) return;
  if (!confirm('Remove the selected loan? This cannot be undone.')) return;
  const removed = tabs.splice(currentTabIndex, 1);
  // Remove panel and button elements and rebuild
  document.getElementById('tabs-container').innerHTML = '';
  document.getElementById('tab-panels').innerHTML = '';
  // Recreate all tabs/buttons/panels
  const existing = [...tabs];
  tabs = [];
  existing.forEach((t, i) => {
    const tabId = t.id || Date.now() + i;
    const newTab = {
      id: tabId,
      title: t.title,
      principal: t.principal,
      interestRate: t.interestRate,
      monthlyPayment: t.monthlyPayment,
      deposits: t.deposits || {},
      results: null
    };
    tabs.push(newTab);
    const tabsContainer = document.getElementById('tabs-container');
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.textContent = newTab.title;
    tabButton.dataset.tabId = newTab.id;
    const tabIndex = tabs.length - 1;
    tabButton.addEventListener('click', () => selectTab(tabIndex));
    tabsContainer.appendChild(tabButton);
    const tabContent = createTabPanel(newTab);
    document.getElementById('tab-panels').appendChild(tabContent);
    // Fill values
    tabContent.querySelector('.principal').value = newTab.principal;
    tabContent.querySelector('.interest-rate').value = newTab.interestRate;
    tabContent.querySelector('.monthly-payment').value = newTab.monthlyPayment;
    updateDepositsList(tabContent, newTab.deposits);
    // Compute results if possible
    updateCalculation(newTab.id);
  });
  // Select a sensible tab index
  currentTabIndex = Math.min(currentTabIndex, Math.max(0, tabs.length - 1));
  selectTab(currentTabIndex);
  updateChart();
  saveLoanState();
}

// Update the deposits list in the UI
function updateDepositsList(panel, deposits) {
  const depositsList = panel.querySelector('.deposits-list');
  depositsList.innerHTML = '';
  
  // Sort deposits by month
  const sortedDeposits = Object.entries(deposits)
    .sort(([monthA], [monthB]) => parseInt(monthA) - parseInt(monthB));
  
  sortedDeposits.forEach(([month, amount]) => {
    const li = document.createElement('li');
    li.innerHTML = `Month ${month}: $${amount.toLocaleString()} <button class="remove-deposit" data-month="${month}">Remove</button>`;
    depositsList.appendChild(li);
    
    // Add event listener to remove button
    const removeBtn = li.querySelector('.remove-deposit');
    removeBtn.addEventListener('click', () => {
      const tabId = panel.dataset.tabId;
      const index = tabs.findIndex(t => t.id === parseInt(tabId));
      
      if (index !== -1) {
        delete tabs[index].deposits[month];
        updateDepositsList(panel, tabs[index].deposits);
        updateCalculation(parseInt(tabId));
        saveLoanState();
      }
    });
  });
}

// Update the loan calculation for a specific tab
function updateCalculation(tabId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;
  
  const tab = tabs[index];
  const panel = document.querySelector(`.tab-panel[data-tab-id="${tabId}"]`);
  
  // Get values from inputs
  const principal = parseFloat(panel.querySelector('.principal').value) || 0;
  const interestRate = parseFloat(panel.querySelector('.interest-rate').value) || 0;
  const monthlyPayment = parseFloat(panel.querySelector('.monthly-payment').value) || 0;
  
  // Update tab data
  tab.principal = principal;
  tab.interestRate = interestRate;
  tab.monthlyPayment = monthlyPayment;
  
  // Skip calculation if any required value is missing or zero
  if (!principal || !interestRate || !monthlyPayment) {
    // Hide results if we don't have valid inputs
    panel.querySelector('.results-container').style.display = 'none';
    return;
  }
  
  // Calculate loan
  const results = calculateLoan(principal, interestRate, monthlyPayment, tab.deposits);
  tab.results = results;
  
  // Update UI with results
  panel.querySelector('.time-to-repayment-value').textContent = `${results.timeToRepayment} months`;
  panel.querySelector('.time-to-repayment-years').textContent = 
    `(${Math.floor(results.timeToRepayment / 12)} years, ${results.timeToRepayment % 12} months)`;
  panel.querySelector('.total-repayment-value').textContent = `$${results.totalRepayment.toLocaleString()}`;
  panel.querySelector('.total-interest-value').textContent = `$${results.totalInterest.toLocaleString()}`;
  
  // Show results
  panel.querySelector('.results-container').style.display = 'block';
  
  // Update chart
  updateChart();
  // Persist after recalculation
  saveLoanState();
}

// Update the chart with data from all tabs
function updateChart() {
  // Prepare datasets for the chart
  const datasets = tabs.map((tab, index) => {
    if (!tab.results) return null;
    
    return {
      label: tab.title,
      data: tab.results.balances,
      borderColor: getLineColor(index),
      fill: false
    };
  }).filter(Boolean); // Remove null entries
  
  // Calculate maximum number of months for x-axis
  const maxMonths = datasets.reduce((max, dataset) => 
    Math.max(max, dataset.data.length), 0);
  
  // Create labels for x-axis (months)
  const labels = Array.from({ length: maxMonths }, (_, i) => i);
  
  // Update chart data
  chart.data.labels = labels;
  chart.data.datasets = datasets;
  chart.update();
}

// Generate distinct colors for different loan lines
function getLineColor(index) {
  const colors = [
    'rgb(54, 162, 235)',  // blue
    'rgb(255, 99, 132)',  // red
    'rgb(75, 192, 192)',  // green
    'rgb(255, 206, 86)',  // yellow
    'rgb(153, 102, 255)' // purple
  ];
  return colors[index % colors.length];
}

// Persistence helpers
function saveLoanState() {
  try {
    const state = {
      tabs: tabs.map(t => ({
        id: t.id,
        title: t.title,
        principal: t.principal,
        interestRate: t.interestRate,
        monthlyPayment: t.monthlyPayment,
        deposits: t.deposits || {}
      })),
      selectedIndex: currentTabIndex
    };
    localStorage.setItem('loanLensState', JSON.stringify(state));
  } catch (e) {
    // ignore
  }
}

function loadLoanStateOrInit() {
  try {
    const raw = localStorage.getItem('loanLensState');
    if (!raw) {
      addNewTab();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
      addNewTab();
      return;
    }
    parsed.tabs.forEach((savedTab, i) => {
      const tabId = savedTab.id || Date.now() + i;
      const tabNumber = tabs.length + 1;
      const newTab = {
        id: tabId,
        title: savedTab.title || `Loan ${tabNumber}`,
        principal: Number(savedTab.principal) || 0,
        interestRate: Number(savedTab.interestRate) || 0,
        monthlyPayment: Number(savedTab.monthlyPayment) || 0,
        deposits: savedTab.deposits || {},
        results: null
      };
      tabs.push(newTab);

      const tabsContainer = document.getElementById('tabs-container');
      const tabButton = document.createElement('button');
      tabButton.className = 'tab-button';
      tabButton.textContent = newTab.title;
      tabButton.dataset.tabId = tabId;
      const tabIndex = tabs.length - 1;
      tabButton.addEventListener('click', () => selectTab(tabIndex));
      tabsContainer.appendChild(tabButton);

      const tabContent = createTabPanel(newTab);
      document.getElementById('tab-panels').appendChild(tabContent);

      // Fill values
      tabContent.querySelector('.principal').value = newTab.principal;
      tabContent.querySelector('.interest-rate').value = newTab.interestRate;
      tabContent.querySelector('.monthly-payment').value = newTab.monthlyPayment;
      updateDepositsList(tabContent, newTab.deposits);

      // Calculate to populate results
      updateCalculation(tabId);
    });
    const sel = Math.min(Math.max(0, parsed.selectedIndex || 0), tabs.length - 1);
    selectTab(sel);
  } catch (e) {
    addNewTab();
  }
}