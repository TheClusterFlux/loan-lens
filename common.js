(function(){
  const DEFAULTS = {
    currencyCode: 'USD',
    expectedReturnByRisk: { Conservative: 5, Moderate: 7, Aggressive: 9 },
    defaultInflation: 2.5,
    defaultSWR: 4
  };

  function getProfile(){
    try { return JSON.parse(localStorage.getItem('aboutYouProfile')) || {}; } catch(e){ return {}; }
  }

  function saveProfile(p){
    try { localStorage.setItem('aboutYouProfile', JSON.stringify(p || {})); } catch(e){}
  }

  function getPrefs(){
    const p = getProfile();
    return { currencyCode: p.currencyCode || DEFAULTS.currencyCode };
  }

  function formatCurrency(value){
    const { currencyCode } = getPrefs();
    const symbols = { USD: '$', EUR: '€', ZAR: 'R' };
    const symbol = symbols[currencyCode] || (currencyCode + ' ');
    const num = formatNumber(value || 0);
    return symbol + num;
  }

  function formatNumber(value){
    try { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0); } catch(e){ return String(value || 0); }
  }

  function clearAllData(){
    if (!confirm('Clear ALL saved data for this site? This cannot be undone.')) return;
    ['loanLensState','investmentTargetState','investmentPlannerState','aboutYouProfile','privacyBannerDismissed','budgetEstimator','budgetEstimatorSummary'].forEach(k => localStorage.removeItem(k));
    location.reload();
  }

  function initPrivacyBanner(){
    try { if (localStorage.getItem('privacyBannerDismissed') === '1') return; } catch(e){}
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,.8);color:#fff;padding:10px 16px;z-index:9999;display:flex;justify-content:space-between;align-items:center;font-family:Roboto,Arial,sans-serif;';
    bar.innerHTML = '<span style="font-size:14px;opacity:.9;">This app stores your inputs locally in your browser. No data is sent to a server. You can clear saved data anytime.</span>';
    const btn = document.createElement('button');
    btn.textContent = 'Dismiss';
    btn.style.cssText = 'margin-left:12px;background:#4caf50;color:#fff;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;';
    btn.onclick = function(){ try { localStorage.setItem('privacyBannerDismissed','1'); } catch(e){} document.body.removeChild(bar); };
    const actions = document.createElement('div');
    const clr = document.createElement('button');
    clr.textContent = 'Clear All Data';
    clr.style.cssText = 'margin-left:8px;background:#f44336;color:#fff;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;';
    clr.onclick = clearAllData;
    actions.appendChild(btn);
    actions.appendChild(clr);
    bar.appendChild(actions);
    document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(bar); });
  }

  function getDefaultsFromRisk(){
    const p = getProfile();
    const risk = p.riskTolerance || 'Moderate';
    const expectedReturn = Number(p.expectedReturnDefault) || DEFAULTS.expectedReturnByRisk[risk] || DEFAULTS.expectedReturnByRisk.Moderate;
    const inflation = (p.inflationDefault != null) ? Number(p.inflationDefault) : DEFAULTS.defaultInflation;
    const swr = (p.swrDefault != null) ? Number(p.swrDefault) : DEFAULTS.defaultSWR;
    return { expectedReturn, inflation, swr };
  }

  window.Common = {
    getProfile,
    saveProfile,
    getPrefs,
    formatCurrency,
    formatNumber,
    clearAllData,
    initPrivacyBanner,
    getDefaultsFromRisk,
    DEFAULTS
  };
})();


