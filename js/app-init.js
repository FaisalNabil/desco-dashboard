// File: js/app-init.js

$(document).ready(function () {
    const accountNo = localStorage.getItem('accountNo');
  
    $('#loginForm').submit(function (e) {
      e.preventDefault();
      const input = $('#accountNo').val().trim();
      if (input) {
        localStorage.setItem('accountNo', input);
        window.location.href = 'dashboard.html';
      } else {
        alert('Please enter your Account No or Meter No');
      }
    });
  
    $('#logoutBtn').click(function () {
      localStorage.removeItem('accountNo');
      window.location.href = 'index.html';
    });
  
    if (window.location.pathname.includes('dashboard.html')) {
      if (!accountNo) {
        window.location.href = 'index.html';
      } else {
        loadInitialData(accountNo);
      }
    }
  });
  
  function loadInitialData(accountNo) {
    // Show loader
    $('#loadingIndicator').show();
    $('#dashboardContent').hide();
  
    $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerInfo?accountNo=${accountNo}`)
      .done(res => {
        if (res.code !== 200) {
          $('#loadingIndicator').hide();
          return $('#dashboardContent').html(`<p class="text-danger text-center">Account not found.</p>`).show();
        }
  
        const customer = res.data;
        const meterNo = customer.meterNo;
  
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 2);
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
          $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getBalance?accountNo=${accountNo}&meterNo=${meterNo}`),
          $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getRechargeHistory?accountNo=${accountNo}&meterNo=${meterNo}&dateFrom=${rechargeFrom}&dateTo=${rechargeTo}`),
          $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerMonthlyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&monthFrom=${monthFrom}&monthTo=${monthTo}`),
          $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerMonthlyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&monthFrom=${prevMonthFrom}&monthTo=${prevMonthTo}`),
          $.get(`https://prepaid.desco.org.bd/api/tkdes/customer/getCustomerDailyConsumption?accountNo=${accountNo}&meterNo=${meterNo}&dateFrom=${dailyFrom}&dateTo=${dailyTo}`)
        ]).then(results => {
          const extract = (r, isArray = true) => (r.status === 'fulfilled' && r.value?.code === 200) ? r.value.data : (isArray ? [] : {});
  
          const locationData = extract(results[0], false);
          const balanceData = extract(results[1], false);
          const rechargeData = extract(results[2]);
          const monthlyCur = extract(results[3]);
          const monthlyPrev = extract(results[4]);
          const dailyRaw = extract(results[5]);
  
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
  
          // Render sections
          const overviewContainer = $('#overview');
          overviewContainer.hide();
          renderOverview({ customer, locationData, balanceData, rechargeData, monthlyCur, monthlyPrev, daily, usedKwhThisMonth });
          overviewContainer.fadeIn(600);
  
          renderDaily({
            daily
          });
          
  
          renderRecharge({ rechargeData, customer });
  
          renderMonthly({
            monthlyCur
          });
  
          renderComparison({
            monthlyCur,
            monthlyPrev
          });
  
          renderRvc({ rechargeData, monthlyCur });
  
          renderDemand({
            monthlyCur
          });
  
          $('#loadingIndicator').hide();
          $('#dashboardContent').show();
        });
      })
      .fail(() => {
        $('#loadingIndicator').hide();
        $('#dashboardContent').html(`<p class="text-danger text-center">Failed to connect to DESCO API.</p>`).show();
      });
  }
  