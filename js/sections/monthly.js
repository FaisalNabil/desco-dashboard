// File: js/sections/monthly.js
function renderMonthly({ monthlyCur, chartOptions = {} }) {
    const container = document.getElementById('monthly');
    container.innerHTML = '';
  
    if (!Array.isArray(monthlyCur) || monthlyCur.length === 0) {
      container.innerHTML = `
        <div class="alert alert-warning text-center mt-3">
          Monthly consumption data is unavailable at this moment. Please try again later.
        </div>`;
      return;
    }
  
    container.innerHTML = `
      <div class="card card-custom mb-4 p-3">
        <h5>Monthly Consumption</h5>
        <div class="text-end mb-2">
          <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('monthlyChartCanvas', 'Monthly Consumption')">
            <i class="bi bi-download"></i>
          </button>
        </div>
        <div class="chart-wrapper"><canvas id="monthlyChartCanvas"></canvas></div>
      </div>
    `;
  
    const canvas = document.getElementById('monthlyChartCanvas');
    const ctx = canvas.getContext('2d');
  
    const safeValue = (val) => (typeof val === 'number' && !isNaN(val) ? val : 0);
  
    const maxBDT = Math.max(...monthlyCur.map(m => safeValue(m.consumedTaka)));
    const maxKwh = Math.max(...monthlyCur.map(m => safeValue(m.consumedUnit)));
    const yMax = Math.max(maxBDT, maxKwh) * 1.2;
  
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyCur.map(m => m.month),
        datasets: [
          {
            label: 'BDT',
            data: monthlyCur.map(m => safeValue(m.consumedTaka)),
            backgroundColor: 'rgba(0,123,255,0.6)',
            borderRadius: 6,
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => safeValue(val).toFixed(0) + ' BDT',
              font: { weight: 'bold' },
              color: '#007bff'
            }
          },
          {
            label: 'kWh',
            data: monthlyCur.map(m => safeValue(m.consumedUnit)),
            backgroundColor: 'rgba(40,167,69,0.6)',
            borderRadius: 6,
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => safeValue(val).toFixed(0) + ' kWh',
              font: { weight: 'bold' },
              color: '#28a745'
            }
          }
        ]
      },
      options: {
        responsive: true,
        animations: {
          tension: {
            duration: 1000,
            easing: 'easeOutBounce',
            from: 1,
            to: 0,
            loop: true,
          },
          y: {
            easing: 'easeInOutElastic',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: yMax
          }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: { enabled: true },
          datalabels: {
            display: true,
            clip: false
          },
          ...(chartOptions.plugins || {})
        },
        ...chartOptions
      },
      plugins: [ChartDataLabels]
    });
  }
  