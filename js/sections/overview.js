// File: js/sections/overview.js
function renderOverview({ customer, locationData, balanceData, rechargeData, monthlyCur, monthlyPrev, daily, usedKwhThisMonth }) {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const thisYearKey  = String(now.getFullYear());
  
    const usedThisMonthUnit = balanceData.currentMonthConsumption || 0;
    const lastMonthRecord = monthlyCur[monthlyCur.length - 1] || {};
    const maxLoadLastMonth = lastMonthRecord.maximumDemand || 0;
    const maxLoadThisYear  = monthlyCur.map(m => m.maximumDemand || 0).reduce((mx, val) => Math.max(mx, val), 0);
  
    const rechargeThisMonth = rechargeData.filter(r => r.rechargeDate.slice(0,7) === thisMonthKey).reduce((sum, r) => sum + (r.totalAmount||0), 0);
    const rechargeThisYear = rechargeData.filter(r => r.rechargeDate.slice(0,4) === thisYearKey).reduce((sum, r) => sum + (r.totalAmount||0), 0);
  
    const sorted = [...monthlyCur].sort((a,b)=>a.consumedTaka-b.consumedTaka);
    const best = sorted.length ? `${sorted[0].month} (${sorted[0].consumedTaka.toFixed(2)} kWh)` : 'N/A';
    const worst= sorted.length ? `${sorted[sorted.length-1].month} (${sorted[sorted.length-1].consumedTaka.toFixed(2)} kWh)` : 'N/A';
    const daysCount = daily.length;
    const avgDailyUsage = daysCount ? (daily.reduce((s,d)=>s + d.dailyUnit, 0) / daysCount).toFixed(2) : 'N/A';
  
    $('#overview').html(`
      <div class="row text-center mb-4 g-3">
        <div class="col-md-3">
          <div class="card card-custom h-100 p-3 d-flex flex-column justify-content-between">
            <h6 class="mb-2">Balance</h6>
            <h4 class="text-primary mb-0">${balanceData.balance?.toFixed(2) ?? 'N/A'} BDT</h4>
          </div>
        </div>
  
        <div class="col-md-3">
          <div class="card card-custom h-100 p-3 d-flex flex-column justify-content-between">
            <h6 class="mb-2">Used This Month</h6>
            <h4 class="text-primary mb-0">${usedThisMonthUnit.toFixed(2)} BDT</h4>
            <h5 class="text-warning mb-1">${usedKwhThisMonth} kWh</h5>
          </div>
        </div>
  
        <div class="col-md-3">
          <div class="card card-custom h-100 p-3 d-flex flex-column justify-content-between">
            <h6 class="mb-2">Max Load</h6>
            <p class="mb-1">Last: <span class="text-success">${maxLoadLastMonth.toFixed(2)} kW</span></p>
            <p class="mb-0">Year: <span class="text-success">${maxLoadThisYear.toFixed(2)} kW</span></p>
          </div>
        </div>
  
        <div class="col-md-3">
          <div class="card card-custom h-100 p-3 d-flex flex-column justify-content-between">
            <h6 class="mb-2">Recharged</h6>
            <p class="mb-1">Month: <span class="text-primary">${rechargeThisMonth.toFixed(2)} BDT</span></p>
            <p class="mb-0">Year: <span class="text-primary">${rechargeThisYear.toFixed(2)} BDT</span></p>
          </div>
        </div>
      </div>
  
    <div class="card card-custom mb-4 p-3">
    <h5 class="mb-3">Consumer Information</h5>
    
    <div class="row">
        <!-- Name (full width) -->
        <div class="col-12 mb-2">
        <strong>Name:</strong> <span>${customer.customerName}</span>
        </div>

        <!-- Address (full width) -->
        <div class="col-12 mb-3">
        <strong>Address:</strong> <span>${customer.installationAddress}</span>
        </div>

        <!-- Remaining details in 3 columns -->
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
        ]
        .map(
            ([label, value]) => `
            <div class="col-md-4 mb-2">
            <strong>${label}:</strong> <span>${value}</span>
            </div>
        `
        )
        .join('')}
    </div>
    </div>

  
      <div class="row text-center mb-4">
        <div class="col-md-4 mb-3">
          <div class="card card-custom p-3">
            <h6>Avg Daily Usage</h6>
            <h5 class="text-primary mb-0">${avgDailyUsage} kWh</h5>
          </div>
        </div>
        <div class="col-md-4 mb-3">
          <div class="card card-custom p-3">
            <h6>Best Month</h6>
            <h5 class="text-success mb-0">${best}</h5>
          </div>
        </div>
        <div class="col-md-4 mb-3">
          <div class="card card-custom p-3">
            <h6>Worst Month</h6>
            <h5 class="text-danger mb-0">${worst}</h5>
          </div>
        </div>
      </div>
    `);
  }