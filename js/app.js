// js/app.js

$(document).ready(function() {
  // ————————————
  // LOGIN / LOGOUT FLOW
  // ————————————
  $('#loginForm').submit(function(e) {
    e.preventDefault();
    const accountNo = $('#accountNo').val().trim();
    if (accountNo) {
      localStorage.setItem('accountNo', accountNo);
      window.location.href = 'dashboard.html';
    } else {
      alert('Please enter your Account No or Meter No');
    }
  });

  if (window.location.pathname.includes('dashboard.html')) {
    const accountNo = localStorage.getItem('accountNo');
    if (!accountNo) {
      window.location.href = 'index.html';
    } else {
      loadDashboardData(accountNo);
    }
  }

  $('#logoutBtn').click(function() {
    localStorage.removeItem('accountNo');
    window.location.href = 'index.html';
  });
});

// —————————————
// MAIN DATA LOADER
// —————————————

function loadDashboardData(accountNo) {
  $('#dashboardContent').html(`
    <div class="text-center my-5">
      <div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>
    </div>
  `);

  // 1. Fetch customer info
  $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerInfo?accountNo=${accountNo}`)
    .done(res => {
      if (res.code !== 200) {
        return $('#dashboardContent').html(`<p class="text-danger text-center">Account not found.</p>`);
      }
      const customer = res.data;
      const meterNo  = customer.meterNo;

      // ————————————————
      // Compute dynamic date ranges
      // ————————————————

      const today       = new Date();
      const yesterday   = new Date(today);
      yesterday.setDate(today.getDate() - 2);
      
      // helper
      function fmt(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }
      
      // 1) DAILY: from 30 days before yesterday → yesterday
      const dailyTo   = fmt(yesterday);
      const dailyFrom = fmt(new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 29));
      
      // 2) RECHARGE: 
      //    to   = last day of last month
      //    from = first day of this month, one year ago
      const rechargeToDate   = today;                              // 2025-04-29
      const rechargeFromDate = new Date(today);                    
      rechargeFromDate.setDate(today.getDate() - 364);            // go back 364 days

      const rechargeTo   = fmt(rechargeToDate);                   // "2025-04-29"
      const rechargeFrom = fmt(rechargeFromDate); 
      
      // 3) MONTHLY: 
      //    from = same month one year ago (today’s year−1, today’s month)
      //    to   = previous month this year
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const thisMonthFirst = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthFrom = `${today.getFullYear() - 1}-${String(today.getMonth()+1).padStart(2,'0')}`;
      const prevMonthEnd = lastMonthEnd;
      const monthTo   = `${prevMonthEnd.getFullYear()}-${String(prevMonthEnd.getMonth()+1).padStart(2,'0')}`;
      
      // 4) PREV YEAR: 
      //    from = same month two years ago
      //    to   = previous month one year ago
      const prevMonthFrom = `${today.getFullYear() - 2}-${String(today.getMonth()+1).padStart(2,'0')}`;
      const prevMonthTo   = `${prevMonthEnd.getFullYear() - 1}-${String(prevMonthEnd.getMonth()+1).padStart(2,'0')}`;

      // 5) LOG TO VERIFY
      console.log('Daily:     ', dailyFrom, '→', dailyTo);
      console.log('Recharge:  ', rechargeFrom, '→', rechargeTo);
      console.log('Monthly:   ', monthFrom, '→', monthTo);
      console.log('PrevYear:  ', prevMonthFrom, '→', prevMonthTo);

      // ————————————————
      // Parallel API calls
      // ————————————————
      Promise.allSettled([
        $.get(`https://prepaid.desco.org.bd/api/common/getCustomerLocation?accountNo=${accountNo}`),
        $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getBalance?accountNo=${accountNo}&meterNo=${meterNo}`),
        $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getRechargeHistory?accountNo=${accountNo}&meterNo=${meterNo}&dateFrom=${rechargeFrom}&dateTo=${rechargeTo}`),
        $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerMonthlyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&monthFrom=${monthFrom}&monthTo=${monthTo}`),
        $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerMonthlyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&monthFrom=${prevMonthFrom}&monthTo=${prevMonthTo}`),
        $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerDailyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&dateFrom=${dailyFrom}&dateTo=${dailyTo}`)
      ]).then(results => {
        // helper to safely grab .value.data if code===200, or fallback
        function safeArray(res) {
          return (
            res.status === 'fulfilled' &&
            res.value != null &&
            res.value.code === 200 &&
            Array.isArray(res.value.data)
          ) ? res.value.data : [];
        }
        function safeObject(res) {
          return (
            res.status === 'fulfilled' &&
            res.value != null &&
            res.value.code === 200 &&
            typeof res.value.data === 'object'
          ) ? res.value.data : {};
        }
        
        const locationData = safeObject( results[0] );
        const balanceData  = safeObject( results[1] );
        const rechargeData = safeArray(  results[2] );
        const monthlyCur   = safeArray(  results[3] );
        const monthlyPrev  = safeArray(  results[4] );
        const dailyRaw     = safeArray(  results[5] );

        // now dailyRaw is guaranteed to be an Array
        if (dailyRaw.length < 2) {
          // not enough points to compute a delta — show a friendly message instead of crash
          $('#dashboardContent').html(`
            <p class="text-warning text-center">
              Not enough daily data to display chart.
            </p>`);
          return;
        }

        // sort monthly arrays by month
        monthlyCur .sort((a,b)=>a.month.localeCompare(b.month));
        monthlyPrev.sort((a,b)=>a.month.localeCompare(b.month));

        // DAILY: drop baseline, compute deltas, clamp negatives
        const daily = dailyRaw.slice(1).map((d,i) => {
          const prev = dailyRaw[i];
          let takaDelta = d.consumedTaka - (prev?.consumedTaka||0);
          let unitDelta = d.consumedUnit - (prev?.consumedUnit||0);
          if (takaDelta < 0) takaDelta = -0.01;
          if (unitDelta < 0) unitDelta = -0.01;
          return { date: d.date, consumedTaka: takaDelta, dailyUnit: unitDelta };
        });

        // Get current month YYYY-MM
        const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2025-04"

        // Filter daily entries that belong to current month only
        const thisMonthDaily = daily.filter(d => d.date.startsWith(currentMonth));

        // Sum up unit and taka usage for current month
        const usedKwhThisMonth = thisMonthDaily.reduce((sum, d) => sum + d.dailyUnit, 0).toFixed(2);


        // render everything
        renderDashboard(customer, locationData, balanceData,
                        rechargeData, monthlyCur, monthlyPrev, daily,
                        usedKwhThisMonth);

        // update “last updated”
        const now = new Date();
        $('#lastUpdated').text(
          now.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) +
          ' ' + now.toLocaleTimeString('en-GB')
        );
      });
    })
    .fail(() => {
      $('#dashboardContent').html(`<p class="text-danger text-center">Failed to connect to DESCO API.</p>`);
    });
}

// —————————————
// RENDER DASHBOARD
// —————————————

function renderDashboard(customer, location, balance, recharge, monthlyCur, monthlyPrev, daily,
  usedThisMonthKwh) {
  const now          = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const thisYearKey  = String(now.getFullYear());

  // 1️⃣ Used kWh this month (from monthlyCur):
  const usedThisMonthUnit = balance.currentMonthConsumption || 0;

  // 2️⃣ Max load last month and max load *this year*:
  const lastMonthRecord = monthlyCur[monthlyCur.length - 1] || {};
  const maxLoadLastMonth = lastMonthRecord.maximumDemand || 0;
  const maxLoadThisYear  = monthlyCur
    .map(m => m.maximumDemand || 0)
    .reduce((mx, val) => Math.max(mx, val), 0);

  // 3️⃣ Recharged this month & this year:
  const rechargeThisMonth = recharge
    .filter(r => r.rechargeDate.slice(0,7) === thisMonthKey)
    .reduce((sum, r) => sum + (r.totalAmount||0), 0);
  const rechargeThisYear = recharge
    .filter(r => r.rechargeDate.slice(0,4) === thisYearKey)
    .reduce((sum, r) => sum + (r.totalAmount||0), 0);
  
  // Info Cards
  const infoCards = `
    <div class="row text-center mb-4 g-3">
      <!-- Balance -->
      <div class="col-md-3">
        <div class="card card-custom h-100 p-3 d-flex flex-column justify-content-between">
          <h6 class="mb-2">Balance</h6>
          <h4 class="text-primary mb-0">${balance.balance?.toFixed(2) ?? 'N/A'} BDT</h4>
        </div>
      </div>

      <!-- Used kWh This Month -->
      <div class="col-md-3">
        <div class="card card-custom h-100 p-3 d-flex flex-column justify-content-between">
          <h6 class="mb-2">Used This Month</h6>
          <h4 class="text-primary mb-0">${usedThisMonthUnit.toFixed(2)} BDT</h4>
          <h5 class="text-warning mb-1">${usedThisMonthKwh} kWh</h5>
        </div>
      </div>

      <!-- Max Load Last Month & This Year -->
      <div class="col-md-3">
        <div class="card card-custom h-100 p-3 d-flex flex-column justify-content-between">
          <h6 class="mb-2">Max Load</h6>
          <div class="mb-0">
            <p class="mb-1">Last month: <span class="text-success">${maxLoadLastMonth.toFixed(2)} kW</span></p>
            <p class="mb-0">This year: <span class="text-success">${maxLoadThisYear.toFixed(2)} kW</span></p>
          </div>
        </div>
      </div>

      <!-- Recharged This Month & Year -->
      <div class="col-md-3">
        <div class="card card-custom h-100 p-3 d-flex flex-column justify-content-between">
          <h6 class="mb-2">Recharged</h6>
          <div class="mb-0">
            <p class="mb-1">Month: <span class="text-primary">${rechargeThisMonth.toFixed(2)} BDT</span></p>
            <p class="mb-0">Year: <span class="text-primary">${rechargeThisYear.toFixed(2)} BDT</span></p>
          </div>
        </div>
      </div>
    </div>
  `;



  // Consumer Info
  const consumerInfo = `
    <div class="card card-custom mb-4 p-3">
      <h5>Consumer Information</h5>
      <dl class="row mb-0">
        ${[
          ['Name', customer.customerName],
          ['Account No', customer.accountNo],
          ['Meter No', customer.meterNo],
          ['Address', customer.installationAddress],
          ['Tariff', customer.tariffSolution],
          ['S & D', customer.SDName||'N/A'],
          ['Transformer', customer.transformer||'N/A'],
          ['Feeder', customer.feederName],
          ['Inst Date', customer.installationDate],
          ['Reg Date', customer.registerDate],
          ['Meter Model', customer.meterModel||'N/A'],
          ['Phase Type', customer.phaseType],
          ['Zone', location.zone||'N/A'],
          ['Block', location.block||'N/A'],
          ['Route', location.route||'N/A'],
          ['Sanctioned Load', customer.sanctionLoad+' kW']
        ].map(([dt,dd])=>
          `<dt class="col-sm-3">${dt}</dt><dd class="col-sm-9">${dd}</dd>`
        ).join('')}
      </dl>
    </div>
  `;

  // Recharge History
  const rechargeHtml = `
    <div class="card card-custom mb-4 p-3">
      <h5>Recharge History (Last 1 year)</h5>
      <button class="btn btn-sm btn-outline-primary" onclick="exportTableToExcel('rechargeTable', 'Recharge_History')">
        <i class="bi bi-download"></i> Export Excel
      </button>
      <div class="table-responsive">
        <table class="table table-sm table-bordered" id="rechargeTable">
          <thead class="table-light">
            <tr>
              <th>SL</th>
              <th>Meter No</th>
              <th>Date</th>
              <th>Total</th>
              <th>Energy</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${ recharge.map((r,i) => {
              const findAmt = name => {
                const it = (r.chargeItems||[]).find(x=>x.chargeItemName===name);
                return it ? it.chargeAmount.toFixed(2) : '--';
              };
              return `
                <tr>
                  <td>${i+1}</td>
                  <td>${r.meterNo}</td>
                  <td>${r.rechargeDate}</td>
                  <td>${r.totalAmount.toFixed(2)}</td>
                  <td>${r.energyAmount.toFixed(2)}</td>
                  <td>${r.orderStatus}</td>
                  <td>
                    <button 
                      class="btn btn-sm btn-outline-primary detail-btn" 
                      data-index="${i}"
                      data-customer-name="${customer.customerName}">
                      
                      Details
                    </button>
                  </td>
                </tr>`;
            }).join('') }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Action History
  const actionHtml = `
    <div class="card card-custom mb-4 p-3">
      <h5>Action History</h5>
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead class="table-light">
            <tr>
              <th>Date & Time</th><th>Meter No</th><th>Total</th><th>Energy</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recharge.map(r=>`
              <tr>
                <td>${r.rechargeDate}</td>
                <td>${r.meterNo}</td>
                <td>${r.totalAmount.toFixed(2)}</td>
                <td>${r.energyAmount.toFixed(2)}</td>
                <td>${r.orderStatus}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const months = monthlyCur.map(m=>m.month);
  // Labels for months
  const labels = monthlyCur.map((cur, i) => {
    const prev = monthlyPrev[i].month;  
    return `${cur.month} (${prev})`;
  });

  // Monthly Comparison (BDT)
  const compBDTHtml = `
    <div class="card card-custom mb-4 p-3">
      <h5>Monthly Comparison (BDT)</h5>
      <button class="btn btn-sm btn-outline-primary" onclick="exportChartToPdf('cmpBdtChart', 'Monthly Comparison (BDT)')">
        <i class="bi bi-download"></i> Export PDF
      </button>
      <canvas id="cmpBdtChart"></canvas>
    </div>
  `;

  // Monthly Comparison (kWh)
  const compUnitHtml = `
    <div class="card card-custom mb-4 p-3">
      <h5>Monthly Comparison (kWh)</h5>
      <button class="btn btn-sm btn-outline-primary" onclick="exportChartToPdf('cmpUnitChart', 'Monthly Comparison (kWh)')">
        <i class="bi bi-download"></i> Export PDF
      </button>
      <canvas id="cmpUnitChart"></canvas>
    </div>
  `;

  const comparisonSection = `
    <div class="row mb-4">
      <div class="col-lg-6 mb-3">${compBDTHtml}</div>
      <div class="col-lg-6 mb-3">${compUnitHtml}</div>
    </div>
  `;

  // Recharge vs Consumption
  // sum recharge per month
  const rechargePerMonth = months.map(m=>{
    return recharge
      .filter(r=>r.rechargeDate.startsWith(m))
      .reduce((s,r)=>s + r.totalAmount, 0);
  });
  const rvcHtml = `
    <div class="card card-custom mb-4 p-3">
      <h5>Recharge vs Consumption (BDT)</h5>
      <button class="btn btn-sm btn-outline-primary" onclick="exportChartToPdf('rvcChart', 'Recharge vs Consumption (BDT)')">
        <i class="bi bi-download"></i> Export PDF
      </button>
      <canvas id="rvcChart"></canvas>
      
      <button class="btn btn-sm btn-outline-primary" onclick="exportTableToExcel('rechargeVsConsumptionTable', 'Recharge vs Consumption (BDT)')">
        <i class="bi bi-download"></i> Export Excel
      </button>
      <div class="mt-3 table-responsive">
        <table class="table table-sm" id="rechargeVsConsumptionTable">
          <thead class="table-light">
            <tr><th>Month</th><th>Recharge</th><th>Consumption</th></tr>
          </thead>
          <tbody>
            ${months.map((m,i)=>`
              <tr>
                <td>${m}</td>
                <td>${rechargePerMonth[i].toFixed(2)}</td>
                <td>${monthlyCur[i].consumedTaka.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Maximum Demand
  const maxDemandHtml = `
    <div class="card card-custom mb-4 p-3">
      <button class="btn btn-sm btn-outline-primary" onclick="exportChartToPdf('maxDemandChart', 'Monthly Max Demand (kW)')">
        <i class="bi bi-download"></i> Export PDF
      </button>
      <h5>Monthly Max Demand (kW)</h5>
      <canvas id="maxDemandChart"></canvas>
    </div>
  `;

  // Daily & Monthly consumption sections
  const dailyHtml = `
    <div class="card card-custom mb-4 p-3">
      <button class="btn btn-sm btn-outline-primary" onclick="exportChartToPdf('dailyChart', 'Daily Consumption')">
        <i class="bi bi-download"></i> Export PDF
      </button>
      <h5>Daily Consumption</h5>
      <canvas id="dailyChart"></canvas>
    </div>
  `;
  const monthlyHtml = `
    <div class="card card-custom mb-4 p-3">
      <button class="btn btn-sm btn-outline-primary" onclick="exportChartToPdf('monthlyChart', 'Monthly Consumption')">
        <i class="bi bi-download"></i> Export PDF
      </button>
      <h5>Monthly Consumption</h5>
      <canvas id="monthlyChart"></canvas>
    </div>
  `;

  // Smart Insights
  const daysCount     = daily.length;     // however many days you actually have
  const totalUnits    = daily.reduce((s,d)=>s + d.dailyUnit, 0);
  const avgDailyUsage = daysCount ? (totalUnits / daysCount).toFixed(2) : 'N/A';
  const sorted = [...monthlyCur].sort((a,b)=>a.consumedTaka-b.consumedTaka);
  const best = sorted.length ? `${sorted[0].month} (${sorted[0].consumedTaka.toFixed(2)})` : 'N/A';
  const worst= sorted.length ? `${sorted[sorted.length-1].month} (${sorted[sorted.length-1].consumedTaka.toFixed(2)})` : 'N/A';
  const insightsHtml = `
    <div class="row text-center mb-4">
      <div class="col-md-4 mb-3"><div class="card card-custom p-3">
        <h6>Avg Daily Usage</h6><h5 class="text-primary mb-0">${avgDailyUsage} kWh</h5>
      </div></div>
      <div class="col-md-4 mb-3"><div class="card card-custom p-3">
        <h6>Best Month</h6><h5 class="text-success mb-0">${best}</h5>
      </div></div>
      <div class="col-md-4 mb-3"><div class="card card-custom p-3">
        <h6>Worst Month</h6><h5 class="text-danger mb-0">${worst}</h5>
      </div></div>
    </div>
  `;

  $('#dashboardContent').empty(); 

  // Inject all sections
  $('#dashboardContent').append(`
    ${infoCards}
    ${consumerInfo}
    ${dailyHtml}
    ${rechargeHtml}
    ${actionHtml}
    ${monthlyHtml}
    ${comparisonSection}
    ${rvcHtml}
    ${maxDemandHtml}
    ${insightsHtml}
  `);

  $('.detail-btn').on('click', function() {
    const idx = $(this).data('index');
    const name = $(this).data('customer-name');
    const r   = recharge[idx];
  
    // Populate modal fields
    $('#mod-date').text(r.rechargeDate);
    $('#mod-order').text(r.orderID);
    $('#mod-name').text(name);
    $('#mod-meter').text(r.meterNo);
    $('#mod-account').text(r.accountNo);
    $('#mod-status').text(r.orderStatus);
    $('#mod-energy').text(r.energyAmount.toFixed(2));
    $('#mod-demand').text((r.chargeItems.find(x=>x.chargeItemName==='Demand Charge-All')?.chargeAmount||0).toFixed(2));
    $('#mod-rent').text((r.chargeItems.find(x=>x.chargeItemName==='Meter Rent-1P')?.chargeAmount||0).toFixed(2));
    $('#mod-vat').text(r.VAT.toFixed(2));
    $('#mod-rebate').text(r.rebate.toFixed(2));
    $('#mod-gross').text(r.totalAmount.toFixed(2));
    // token is not in API—leave as “--” or fill if available
  
    // Show the modal
    new bootstrap.Modal($('#rechargeModal')).show();
  });

  // — Charts —

  // 1. Daily chart
  renderDailyConsumptionChart(daily);

  // 2. Monthly chart
  renderMonthlyConsumptionChart(monthlyCur);

  // 3. Monthly BDT comparison
  new Chart($('#cmpBdtChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { 
          label: 'This Year', 
          data: monthlyCur.map(m => m.consumedTaka), 
          backgroundColor: 'rgba(0, 123, 255, 0.6)',
          borderRadius: 6,
          datalabels: {
            color: '#007bff',
            font: { weight: 'bold' },
            align: 'end',
            anchor: 'end',
            formatter: (val) => `${val.toFixed(2)} BDT`
          }
        },
        { 
          label: 'Prev Year', 
          data: monthlyPrev.map(m => m.consumedTaka), 
          backgroundColor: 'rgba(108, 117, 125, 0.6)',
          borderRadius: 6,
          datalabels: {
            color: '#6c757d',
            font: { weight: 'bold' },
            align: 'end',
            anchor: 'end',
            formatter: (val) => `${val.toFixed(2)} BDT`
          }
        }
      ]
    },
    options: {
      responsive: true
    },
    plugins: [ChartDataLabels]
  });

  // 4. Monthly kWh comparison
  new Chart($('#cmpUnitChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { 
          label: 'This Year', 
          data: monthlyCur.map(m => m.consumedUnit), 
          backgroundColor: 'rgba(40, 167, 69, 0.6)',
          borderRadius: 6,
          datalabels: {
            color: '#28a745',
            font: { weight: 'bold' },
            align: 'end',
            anchor: 'end',
            formatter: (val) => `${val.toFixed(2)} kWh`
          }
        },
        { 
          label: 'Prev Year', 
          data: monthlyPrev.map(m => m.consumedUnit), 
          backgroundColor: 'rgba(108, 117, 125, 0.5)',
          borderRadius: 6,
          datalabels: {
            color: '#6c757d',
            font: { weight: 'bold' },
            align: 'end',
            anchor: 'end',
            formatter: (val) => `${val.toFixed(2)} kWh`
          }
        }
      ]
    },
    options: {
      responsive: true
    },
    plugins: [ChartDataLabels]
  });

  // 5. Recharge vs Consumption
  new Chart($('#rvcChart'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { 
          label: 'Recharged', 
          data: rechargePerMonth, 
          backgroundColor: 'rgba(255, 193, 7, 0.6)', // soft yellow
          borderRadius: 6,
          datalabels: {
            color: '#ffc107', // yellowish
            font: { weight: 'bold' },
            align: 'end',
            anchor: 'end',
            formatter: (val) => `${val.toFixed(2)} BDT`
          }
        },
        { 
          label: 'Consumed BDT', 
          data: monthlyCur.map(m => m.consumedTaka), 
          backgroundColor: 'rgba(220, 53, 69, 0.6)', // soft red
          borderRadius: 6,
          datalabels: {
            color: '#dc3545', // reddish
            font: { weight: 'bold' },
            align: 'end',
            anchor: 'end',
            formatter: (val) => `${val.toFixed(2)} BDT`
          }
        }
      ]
    },
    options: {
      responsive: true
    },
    plugins: [ChartDataLabels]
  });


  // 6. Max Demand
  new Chart($('#maxDemandChart'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Max Demand (kW)',
        data: monthlyCur.map(m => m.maximumDemand),
        borderColor: 'rgba(23, 162, 184, 0.8)',       // soft teal line
        backgroundColor: 'rgba(23, 162, 184, 0.2)',    // light teal area fill
        fill: true,
        tension: 0.3, // smooth curves
        pointBackgroundColor: 'rgba(23, 162, 184, 1)', // stronger point color
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        datalabels: {
          color: '#17a2b8', // teal color for numbers
          font: { weight: 'bold' },
          align: 'top',
          anchor: 'end',
          formatter: (val) => `${val.toFixed(2)} kW`
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'kW'
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

}

// — Chart helper functions for daily/monthly consumption

function renderDailyConsumptionChart(daily) {
  const ctxD = document.getElementById('dailyChart').getContext('2d');

  new Chart(ctxD, {
    type: 'line',
    data: {
      labels: daily.map(d => d.date),
      datasets: [
        {
          label: 'BDT',
          data: daily.map(d => d.consumedTaka),
          borderColor: '#007bff',
          backgroundColor: '#007bff',
          yAxisID: 'y1',
          datalabels: {
            align: 'end',
            anchor: 'end',
            formatter: (value) => `${value.toFixed(2)} BDT`,
            backgroundColor: 'white',
            borderColor: '#007bff',
            borderRadius: 4,
            borderWidth: 1,
            padding: 4,
            color: '#007bff',
            font: { weight: 'bold' }
          }
        },
        {
          label: 'kWh',
          data: daily.map(d => d.dailyUnit),
          borderColor: '#28a745',
          backgroundColor: '#28a745',
          yAxisID: 'y2',
          datalabels: {
            align: 'start',
            anchor: 'start',
            formatter: (value) => `${value.toFixed(0)} kWh`,
            backgroundColor: 'white',
            borderColor: '#28a745',
            borderRadius: 4,
            borderWidth: 1,
            padding: 4,
            color: '#28a745',
            font: { weight: 'bold' }
          }
        }
      ]
    },
    options: {
      responsive: true,
      animation: {
        duration: 1200,             
        easing: 'easeOutQuart'      
      },
      plugins: {
        datalabels: {
          display: true,
          clip: false
        }
      },
      scales: {
        y1: {
          position: 'left',
          title: { display: true, text: 'BDT' }
        },
        y2: {
          position: 'right',
          title: { display: true, text: 'kWh' },
          grid: { drawOnChartArea: false }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}


function renderMonthlyConsumptionChart(monthly) {
  const ctx = document.getElementById('monthlyChart').getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthly.map(m => m.month),
      datasets: [
        { 
          label: 'BDT', 
          data: monthly.map(m => m.consumedTaka), 
          backgroundColor: 'rgba(0, 123, 255, 0.6)', // softer blue 
          borderRadius: 6,
          datalabels: {
            color: '#004085',
            font: { weight: 'bold' },
            anchor: 'end',
            align: 'end',
            formatter: (val) => `${val.toFixed(0)} BDT`
          }
        },
        { 
          label: 'kWh', 
          data: monthly.map(m => m.consumedUnit), 
          backgroundColor: 'rgba(40, 167, 69, 0.6)', // softer green 
          borderRadius: 6,
          datalabels: {
            color: '#155724',
            font: { weight: 'bold' },
            anchor: 'end',
            align: 'end',
            formatter: (val) => `${val.toFixed(0)} kWh`
          }
        }
      ]
    },
    options: {
      responsive: true,
      animation: {
        duration: 1200,        // animation for 1.2 seconds
        easing: 'easeOutQuart' // smooth ending
      },
      plugins: {
        datalabels: {
          clip: false,
          display: true
        },
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const datasetLabel = context.dataset.label;
              const value = context.parsed.y;
              return datasetLabel === 'BDT' 
                ? `${value.toFixed(2)} BDT`
                : `${value.toFixed(2)} kWh`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}


function renderInfoSection(balance, rechargeData, monthlyCur, monthlyPrev, daily) {
  // 1️⃣ Warning banner (unstyled)
  const warningHtml = `
    <div class="alert alert-warning">
      Latest recharge may not be included in remaining balance.
    </div>
  `;

  // 2️⃣ Last Recharge: full timestamp
  const sortedRecharge = [...rechargeData].sort(
    (a,b)=> new Date(b.rechargeDate) - new Date(a.rechargeDate)
  );
  const last = sortedRecharge[0] || {};
  const lastRechargeHtml = `
    <div class="col-md-4 mb-3">
      <div class="card card-custom p-3">
        <h6>Last Recharge</h6>
        <p>${ last.totalAmount?.toFixed(2) ?? 'N/A' } BDT</p>
        <small>Recharge time: ${ last.rechargeDate ?? 'N/A' }</small>
      </div>
    </div>
  `;

  // 3️⃣ Remaining Balance: full timestamp
  const remainingHtml = `
    <div class="col-md-4 mb-3">
      <div class="card card-custom p-3">
        <h6>Remaining Balance</h6>
        <p>${ balance.balance?.toFixed(2) ?? 'N/A' } BDT</p>
        <small>Reading time: ${ balance.readingTime ?? 'N/A' }</small>
      </div>
    </div>
  `;

  // 4️⃣ Max Load last month/year
  const lastMonthLoad = monthlyCur.slice(-1)[0]?.maximumDemand ?? 0;
  const lastYearLoad  = monthlyPrev.slice(-1)[0]?.maximumDemand ?? 0;
  const maxLoadHtml = `
    <div class="col-md-4 mb-3">
      <div class="card card-custom p-3">
        <h6>Max Load</h6>
        <p>Last month: ${ lastMonthLoad.toFixed(2) } kW</p>
        <p>Last year: ${ lastYearLoad.toFixed(2) } kW</p>
      </div>
    </div>
  `;

  // 5️⃣ Used This Month (from daily array)
  const now = new Date();
  const thisMonthKey = now.toISOString().slice(0,7); // "YYYY-MM"
  const usedThisMonthUnit = daily
    .filter(d => d.date.startsWith(thisMonthKey))
    .reduce((sum, d) => sum + d.dailyUnit, 0);
  const usedThisMonthTaka = daily
    .filter(d => d.date.startsWith(thisMonthKey))
    .reduce((sum, d) => sum + d.consumedTaka, 0);
  const usedHtml = `
    <div class="col-md-6 mb-3">
      <div class="card card-custom p-3">
        <h6>Used This Month</h6>
        <p>${ usedThisMonthUnit.toFixed(2) } kWh</p>
        <small>In BDT: ${ usedThisMonthTaka.toFixed(2) } BDT</small>
      </div>
    </div>
  `;

  // 6️⃣ Recharged This Month & Year
  const monthStart = thisMonthKey + '-01';           // e.g. "2025-04-01"
  const yearKey    = String(now.getFullYear());       // "2025"
  const rechargedThisMonth = rechargeData
    .filter(r => r.rechargeDate >= monthStart)
    .reduce((sum, r) => sum + (r.totalAmount||0), 0);
  const rechargedThisYear = rechargeData
    .filter(r => r.rechargeDate.startsWith(yearKey))
    .reduce((sum, r) => sum + (r.totalAmount||0), 0);
  const rechargeMonthHtml = `
    <div class="col-md-6 mb-3">
      <div class="card card-custom p-3">
        <h6>Recharged This Month</h6>
        <p>${ rechargedThisMonth.toFixed(2) } BDT</p>
        <small>Recharged This Year: ${ rechargedThisYear.toFixed(2) } BDT</small>
      </div>
    </div>
  `;

  // 7️⃣ Inject at top of dashboardContent
  $('#dashboardContent').prepend(warningHtml);
  $('#dashboardContent').prepend(`
    <div class="row">
      ${lastRechargeHtml}${remainingHtml}${maxLoadHtml}
    </div>
    <div class="row">
      ${usedHtml}${rechargeMonthHtml}
    </div>
  `);
}

// ———————————————
// Export Chart to PDF
// ———————————————
function exportChartToPdf(canvasId, title) {
  const { jsPDF } = window.jspdf;
  const canvas = document.getElementById(canvasId);

  html2canvas(canvas).then((canvas) => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape');
    pdf.text(title, 15, 15);
    pdf.addImage(imgData, 'PNG', 10, 30, 270, 150);
    pdf.save(`${title}.pdf`);
  });
}

// ———————————————
// Export Table to Excel
// ———————————————
function exportTableToExcel(tableId, fileName) {
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.table_to_book(table, {sheet:"Sheet 1"});
  XLSX.writeFile(wb, fileName + '.xlsx');
}
