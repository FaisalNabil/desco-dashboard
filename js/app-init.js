// File: js/app-init.js

let apiPrefix = 'tkdes';

$(document).ready(function () {
  const accountNo = localStorage.getItem('accountNo');

  $('#loginForm').submit(function (e) {
    e.preventDefault();
    const input = $('#accountNo').val().trim();
    if (!input) return alert('Please enter your Account No or Meter No');

    // Try tkdes first
    $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerInfo?accountNo=${input}`)
      .done(res => {
        console.log('res:');console.log(res);
        if (res.code === 200 && res.data) {
            console.log('Here');
          apiPrefix = 'tkdes';
          finishLogin(res.data);
        } else if (res.code === 16006) {
          // fallback to unified
          $.get(`https://prepaid.desco.org.bd/api/unified/customer/getCustomerInfo?accountNo=${input}`)
            .done(res2 => {
                console.log('res2:');
                console.log(res2);
              if (res2.code === 200 && res2.data) {
                console.log('Here uni');
                apiPrefix = 'unified';
                finishLogin(res2.data);
              } else {
                alert('Account not found.');
              }
            })
            .fail(() => alert('API error. Please try again.'));
        } else {
          alert('Account not found.');
        }
      })
      .fail(() => alert('API error. Please try again.'));
  });

  $('#logoutBtn').click(function () {
    localStorage.removeItem('accountNo');
    localStorage.removeItem('apiPrefix');
    window.location.href = 'index.html';
  });

  if (window.location.pathname.includes('dashboard.html')) {
    if (!accountNo) {
      window.location.href = 'index.html';
    } else {
      apiPrefix = localStorage.getItem('apiPrefix') || 'tkdes';
      loadInitialData(accountNo);
    }
  }

  if (window.location.pathname.includes('index.html')) {
    renderRecentAccounts();
  }
});

function finishLogin(data) {
  saveRecentAccount(data.accountNo, data.customerName);
  localStorage.setItem('accountNo', data.accountNo);
  localStorage.setItem('apiPrefix', apiPrefix);
  window.location.href = 'dashboard.html';
}

function saveRecentAccount(accountNo, customerName) {
  const key = 'recentAccounts';
  let list = JSON.parse(localStorage.getItem(key)) || [];
  list = list.filter(a => a.accountNo !== accountNo);
  list.unshift({ accountNo, customerName });
  localStorage.setItem(key, JSON.stringify(list.slice(0, 5)));
}

function renderRecentAccounts() {
  const list = JSON.parse(localStorage.getItem('recentAccounts')) || [];
  if (list.length === 0) return;

  const container = $('#recentAccounts');
  container.html('<label class="form-label fw-semibold">Recent Logins</label><div class="d-grid gap-2"></div>');
  const grid = container.find('.d-grid');
  list.forEach(acc => {
    grid.append(`
      <button type="button" class="btn btn-outline-secondary btn-sm text-start recent-btn" data-account="${acc.accountNo}">
        <strong>${acc.customerName}</strong><br><small>${acc.accountNo}</small>
      </button>
    `);
  });

  container.on('click', '.recent-btn', function () {
    const acc = $(this).data('account');
    $('#accountNo').val(acc).focus();
  });
}

function loadInitialData(accountNo) {
  $('#loadingIndicator').show();
  $('#dashboardContent').hide();

  $.get(`https://prepaid.desco.org.bd/api/${apiPrefix}/customer/getCustomerInfo?accountNo=${accountNo}`)
    .done(res => {
      if (res.code !== 200) {
        $('#loadingIndicator').hide();
        return $('#dashboardContent').html(`<p class="text-danger text-center">Account not found.</p>`).show();
      }

      const customer = res.data;
      const meterNo = customer.meterNo;

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const dailyTo = fmt(yesterday);
      const dailyFrom = fmt(new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 29));

      const rechargeFromDate = new Date(today);
      rechargeFromDate.setDate(today.getDate() - 364);
      const rechargeFrom = fmt(rechargeFromDate);
      const rechargeTo = fmt(today);

      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const monthFrom = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const monthTo = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}`;

      const prevMonthFrom = `${today.getFullYear() - 2}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const prevMonthTo = `${lastMonthEnd.getFullYear() - 1}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}`;

      Promise.allSettled([
        $.get(`https://prepaid.desco.org.bd/api/common/getCustomerLocation?accountNo=${accountNo}`),
        $.get(`https://prepaid.desco.org.bd/api/${apiPrefix}/customer/getBalance?accountNo=${accountNo}&meterNo=${meterNo}`),
        $.get(`https://prepaid.desco.org.bd/api/${apiPrefix}/customer/getRechargeHistory?accountNo=${accountNo}&meterNo=${meterNo}&dateFrom=${rechargeFrom}&dateTo=${rechargeTo}`),
        $.get(`https://prepaid.desco.org.bd/api/${apiPrefix}/customer/getCustomerMonthlyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&monthFrom=${monthFrom}&monthTo=${monthTo}`),
        $.get(`https://prepaid.desco.org.bd/api/${apiPrefix}/customer/getCustomerMonthlyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&monthFrom=${prevMonthFrom}&monthTo=${prevMonthTo}`),
        $.get(`https://prepaid.desco.org.bd/api/${apiPrefix}/customer/getCustomerDailyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&dateFrom=${dailyFrom}&dateTo=${dailyTo}`)
      ]).then(results => {
        const extract = (r, isArray = true) => (r.status === 'fulfilled' && r.value?.code === 200) ? r.value.data : (isArray ? [] : {});

        const locationData = extract(results[0], false);
        const balanceData = extract(results[1], false);
        const rechargeData = extract(results[2]);
        const monthlyCur = extract(results[3]);
        const monthlyPrev = extract(results[4]);
        const dailyRaw = extract(results[5]);

        rechargeData.sort((a, b) => new Date(a.rechargeDate) - new Date(b.rechargeDate));
        monthlyCur.sort((a, b) => a.month.localeCompare(b.month));
        monthlyPrev.sort((a, b) => a.month.localeCompare(b.month));
        dailyRaw.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (!Array.isArray(dailyRaw) || dailyRaw.length < 2) {
          $('#loadingIndicator').hide();
          return $('#dashboardContent').html(`<p class="text-warning text-center">Not enough daily data to display chart.</p>`).show();
        }

        const daily = dailyRaw.slice(1).map((d, i) => {
          const prev = dailyRaw[i];
          let takaDelta = d.consumedTaka - (prev?.consumedTaka || 0);
          let unitDelta = d.consumedUnit - (prev?.consumedUnit || 0);
          if (takaDelta < 0) takaDelta = -0.01;
          if (unitDelta < 0) unitDelta = -0.01;
          return { date: d.date, consumedTaka: takaDelta, dailyUnit: unitDelta };
        });

        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthDaily = daily.filter(d => d.date.startsWith(currentMonth));
        const usedKwhThisMonth = thisMonthDaily.reduce((sum, d) => sum + d.dailyUnit, 0).toFixed(2);

        const now = new Date();
        $('#lastUpdated').text(
          now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
          ' ' + now.toLocaleTimeString('en-GB')
        );

        const overviewContainer = $('#overview');
        overviewContainer.hide();
        renderOverview({ customer, locationData, balanceData, rechargeData, monthlyCur, monthlyPrev, daily, usedKwhThisMonth });
        overviewContainer.fadeIn(600);

        renderDaily({ daily });
        renderRecharge({ rechargeData, customer });
        renderMonthly({ monthlyCur });
        renderComparison({ monthlyCur, monthlyPrev });
        renderRvc({ rechargeData, monthlyCur });
        renderDemand({ monthlyCur });

        $('#loadingIndicator').hide();
        $('#dashboardContent').show();
      });
    })
    .fail(() => {
      $('#loadingIndicator').hide();
      $('#dashboardContent').html(`<p class="text-danger text-center">Failed to connect to DESCO API.</p>`).show();
    });
}
