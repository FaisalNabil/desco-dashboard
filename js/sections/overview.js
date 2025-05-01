// File: js/sections/overview.js
function formatDate(dateStr, withDay = false) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: withDay ? '2-digit' : undefined,
      month: 'short',
      year: 'numeric'
    }).replace(',', '');
  }
  
  function getValueColorClass(value, scale = 1000) {
    const ratio = Math.min(value / scale, 1);
    if (ratio > 0.8) return 'text-danger';
    if (ratio > 0.5) return 'text-warning';
    if (ratio > 0.2) return 'text-success';
    return 'text-muted';
  }
  
function renderOverview({ customer, locationData, balanceData, rechargeData, monthlyCur, monthlyPrev, daily, usedKwhThisMonth }) {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisYearKey = String(now.getFullYear());
    const thisMonthName = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  
    const usedThisMonthUnit = balanceData?.currentMonthConsumption ?? 0;
    const lastMonthRecord = monthlyCur[monthlyCur.length - 1] || {};
    const maxLoadLastMonth = lastMonthRecord?.maximumDemand ?? 0;
    const maxLoadThisYear = monthlyCur.map(m => m.maximumDemand ?? 0).reduce((mx, val) => Math.max(mx, val), 0);

    const rechargeThisMonth = rechargeData
    .filter(r => r.rechargeDate?.slice(0, 7) === thisMonthKey)
    .reduce((sum, r) => sum + (r.totalAmount ?? 0), 0);
    const rechargeThisYear = rechargeData.filter(r => r.rechargeDate.slice(0, 4) === thisYearKey).reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  
    const sorted = [...monthlyCur].sort((a, b) => a.consumedTaka - b.consumedTaka);
    const best = sorted.length ? `${sorted[0].month} (${sorted[0].consumedTaka.toFixed(2)} BDT)` : 'N/A';
    const worst = sorted.length ? `${sorted[sorted.length - 1].month} (${sorted[sorted.length - 1].consumedTaka.toFixed(2)} BDT)` : 'N/A';
    const daysCount = daily.length;
    const avgDailyUsage = daysCount ? (daily.reduce((s, d) => s + d.dailyUnit, 0) / daysCount).toFixed(2) : 'N/A';
    const avgDailyTaka7 = daily.slice(-7).reduce((s, d) => s + d.consumedTaka, 0) / 7;
    const estDaysLeft = avgDailyTaka7 > 0 ? Math.floor((balanceData?.balance || 0) / avgDailyTaka7) : 'N/A';
  
    const highestDay = daily.reduce((max, d) => d.dailyUnit > max.dailyUnit ? d : max, { dailyUnit: 0 });
    const lastRecharge = rechargeData[rechargeData.length - 1];
    const lastRechargeDate = lastRecharge ? new Date(lastRecharge.rechargeDate) : null;
    const daysSinceRecharge = lastRechargeDate ? Math.floor((now - lastRechargeDate) / (1000 * 60 * 60 * 24)) : 'N/A';
  
    const mostExpensiveMonth = monthlyCur.reduce((max, m) => m.consumedTaka > max.consumedTaka ? m : max, { consumedTaka: 0 });
    const latestMonth = monthlyCur[monthlyCur.length - 1]?.month;
    const latestMonthTaka = monthlyCur[monthlyCur.length - 1]?.consumedTaka;
    const latestMonthRecharge = rechargeData.filter(r => r.rechargeDate.startsWith(latestMonth)).reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  
    const rechargeDates = rechargeData.map(r => new Date(r.rechargeDate)).sort((a, b) => a - b);
    const rechargeIntervals = rechargeDates.slice(1).map((d, i) => (d - rechargeDates[i]) / (1000 * 60 * 60 * 24));
    const rechargeFreq = rechargeIntervals.length ? (rechargeIntervals.reduce((a, b) => a + b) / rechargeIntervals.length).toFixed(1) : 'N/A';
  
    const avgWeek = arr => arr.reduce((sum, d) => sum + d.dailyUnit, 0) / arr.length;
    const thisWeek = daily.slice(-7);
    const lastWeek = daily.slice(-14, -7);
    const spikePercent = lastWeek.length && thisWeek.length ? (((avgWeek(thisWeek) - avgWeek(lastWeek)) / avgWeek(lastWeek)) * 100).toFixed(0) : 'N/A';
  
    const eveningRecharges = rechargeData.filter(r => new Date(r.rechargeDate).getHours() >= 20);
    const offPeakMsg = eveningRecharges.length >= rechargeData.length / 2 ? '🌙 Most recharges occur after 8PM. Consider scheduling early to avoid delays.' : '';
  
    const rechargeTotal = rechargeData.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const rechargeCount = rechargeData.length;
    const rechargeAvg = rechargeCount ? Math.round(rechargeTotal / rechargeCount) : 0;

    const tips = [
        'One 100W bulb used for 10 hours = 1 kWh',
        'Running a 1.5-ton AC for 8 hours = ~12 kWh',
        'Ceiling fans consume 70–90W on average',
        'Unplug chargers when not in use to save energy',
        'LED bulbs use up to 80% less power than incandescent ones',
        'Ironing clothes in bulk saves electricity',
        'Your fridge uses 100–200 kWh/month on average',
        'Charging a smartphone uses less than 0.01 kWh',
        'Cooking with induction stoves is more energy efficient',
        'Every 1°C lower on AC increases power usage by ~6%'
      ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
  
    $('#overview').html(`
      <div class="row text-center mb-4 g-3">
        <div class="col-md-3 col-sm-6">
          <div class="card card-custom h-100 p-3">
            <h6 class="mb-2">💰 Balance</h6>
            <h4 class="${getValueColorClass(balanceData?.balance, 500)} mb-0">${balanceData?.balance?.toFixed(2) ?? 'N/A'} BDT</h4>
          </div>
        </div>
  
        <div class="col-md-3 col-sm-6">
          <div class="card card-custom h-100 p-3">
            <h6 class="mb-2">📊 Used in ${thisMonthName}</h6>
            <p class="mb-0 ${getValueColorClass(usedThisMonthUnit, 500)}">${usedThisMonthUnit.toFixed(2)} BDT</p>
            <p class="mb-0 ${getValueColorClass(usedKwhThisMonth, 100)}">${usedKwhThisMonth} kWh</p>
          </div>
        </div>
  
        <div class="col-md-3 col-sm-6">
          <div class="card card-custom h-100 p-3">
            <h6 class="mb-2">⚡ Max Load</h6>
            <p class="mb-1">Last: <span class="${getValueColorClass(maxLoadLastMonth, 10)}">${maxLoadLastMonth.toFixed(2)} kW</span></p>
            <p class="mb-0">Year: <span class="${getValueColorClass(maxLoadThisYear, 10)}">${maxLoadThisYear.toFixed(2)} kW</span></p>
          </div>
        </div>
  
        <div class="col-md-3 col-sm-6">
          <div class="card card-custom h-100 p-3">
            <h6 class="mb-2">🔄 Recharge</h6>
            <p class="mb-1">Month: <span class="${getValueColorClass(rechargeThisMonth, 500)}">${rechargeThisMonth.toFixed(2)} BDT</span></p>
            <p class="mb-0">Year: <span class="${getValueColorClass(rechargeThisYear, 500)}">${rechargeThisYear.toFixed(2)} BDT</span></p>
          </div>
        </div>
      </div>
  
      <div class="row text-center mb-4 g-3">
        <div class="col-md-3 col-sm-6">
          <div class="card card-custom h-100 p-3">
            <h6>📆 Est. Run-Out</h6>
            <p class="mb-0">~ <span class="${getValueColorClass(estDaysLeft, 5)}">${estDaysLeft}</span> days left</p>
          </div>
        </div>
  
        <div class="col-md-3 col-sm-6">
          <div class="card card-custom h-100 p-3">
            <h6>📈 Highest Usage</h6>
            <p class="mb-0">${formatDate(highestDay.date, true)}: <span class="${getValueColorClass(highestDay.dailyUnit, 10)}">${highestDay.dailyUnit?.toFixed(2)}</span> kWh</p>
          </div>
        </div>
  
        <div class="col-md-3 col-sm-6">
          <div class="card card-custom h-100 p-3">
            <h6>🕓 Last Recharge</h6>
            <p class="mb-0">${lastRecharge ? formatDate(lastRecharge.rechargeDate, true) : 'N/A'}<br>${daysSinceRecharge} days ago</p>
          </div>
        </div>
  
        <div class="col-md-3 col-sm-6">
          <div class="card card-custom h-100 p-3">
            <h6>📅 Recharge Frequency</h6>
            <p class="mb-0">Every ~${rechargeFreq} days</p>
          </div>
        </div>
      </div>
  
      <div class="row text-center mb-4 g-3">
        <div class="col-md-4">
          <div class="card card-custom p-3">
            <h6>💸 Most Expensive Month</h6>
            <p class="mb-0">${formatDate(mostExpensiveMonth.month, false)} — <span class="${getValueColorClass(mostExpensiveMonth.consumedTaka, 1500)}">${mostExpensiveMonth.consumedTaka.toFixed(2)}</span> BDT</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-custom p-3">
            <h6>⚠️ Usage Spike</h6>
            <p class="mb-0"><span class="${getValueColorClass(spikePercent, 0)}">${spikePercent > 0 ? `+${spikePercent}% ↑` : 'No spike detected'}</span></p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-custom p-3">
            <h6>🔄 Usage vs Recharge (${formatDate(latestMonth, false)})</h6>
            <p class="mb-0">Used: ${latestMonthTaka?.toFixed(0)} BDT / Recharged: ${latestMonthRecharge.toFixed(0)} BDT</p>
          </div>
        </div>
      </div>
  
      <div class="text-center text-muted small mb-4">${offPeakMsg}</div>
      <div id="energyTipBox" class="text-center text-muted small mt-3">
        💡 Did You Know? ${randomTip}
      </div>

  
      <div class="card card-custom mb-4 p-3">
        <h5 class="mb-3">📋 Consumer Information</h5>
        <div class="row">
          <div class="col-12 mb-2">
            <strong>👤 Name:</strong> <span>${customer.customerName}</span>
          </div>
          <div class="col-12 mb-3">
            <strong>🏠 Address:</strong> <span>${customer.installationAddress}</span>
          </div>
          ${[
            ['Account No', customer.accountNo],
            ['Meter No', customer.meterNo],
            ['Tariff', customer.tariffSolution],
            ['S & D', customer.SDName || 'N/A'],
            ['Transformer', customer.transformer || 'N/A'],
            ['Feeder', customer.feederName],
            ['Inst Date', customer.installationDate],
            ['Reg Date', customer.registerDate],
            ['Meter Model', customer.meterModel || 'N/A'],
            ['Phase Type', customer.phaseType],
            ['Zone', locationData.zone || 'N/A'],
            ['Block', locationData.block || 'N/A'],
            ['Route', locationData.route || 'N/A'],
            ['Sanctioned Load', customer.sanctionLoad + ' kW']
          ].map(([label, value]) => `<div class="col-md-4 mb-2"><strong>${label}:</strong> <span>${value}</span></div>`).join('')}
        </div>
      </div>
    `);

    function showTip(tip) {
        $('#energyTipBox').html(`
          <div class="alert alert-light border d-inline-block shadow-sm" role="alert">
            💡 <strong>Did You Know?</strong> ${tip}
          </div>
        `);
      }
      
      // Rotate every 12s
      setInterval(() => {
        const nextTip = tips[Math.floor(Math.random() * tips.length)];
        showTip(nextTip);
      }, 12000);
      

  }
  