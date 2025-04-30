// File: js/sections/comparison.js
function renderComparison({ monthlyCur, monthlyPrev, chartOptions = {} }) {
    const container = document.getElementById('comparison');
    container.innerHTML = `
      <div class="row mb-4">
        <div class="col-lg-6 mb-3">
          <div class="card card-custom p-3">
            <h5>Monthly Comparison (BDT)</h5>
            
            <div class="text-end mb-2">
                <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('cmpBdtCanvas', 'Comparison BDT')">
                    <i class="bi bi-download"></i>
                </button>
            </div>
            <div class="chart-wrapper"><canvas id="cmpBdtCanvas"></canvas></div>
          </div>
        </div>
        <div class="col-lg-6 mb-3">
          <div class="card card-custom p-3">
            <h5>Monthly Comparison (kWh)</h5>
            
            <div class="text-end mb-2">
                <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('cmpKwhCanvas', 'Comparison kWh')">
                    <i class="bi bi-download"></i>
                </button>
            </div>
            <div class="chart-wrapper"><canvas id="cmpKwhCanvas"></canvas></div>
          </div>
        </div>
      </div>
    `;
  
    const labels = monthlyCur.map((m, i) => `${m.month} / ${monthlyPrev[i]?.month || ''}`);
  
    new Chart(document.getElementById('cmpBdtCanvas'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'This Year',
            data: monthlyCur.map(m => m.consumedTaka),
            backgroundColor: 'rgba(0,123,255,0.6)',
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => `${val.toFixed(0)} BDT`,
              font: { weight: 'bold' },
              color: '#007bff'
            }
          },
          {
            label: 'Prev Year',
            data: monthlyPrev.map(m => m.consumedTaka),
            backgroundColor: 'rgba(108,117,125,0.6)',
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => `${val.toFixed(0)} BDT`,
              font: { weight: 'bold' },
              color: '#6c757d'
            }
          }
        ]
      },
      options: {
        responsive: true,
        animations: {
          y: {
            duration: 1000,
            easing: 'easeOutQuart'
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
  
    new Chart(document.getElementById('cmpKwhCanvas'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'This Year',
            data: monthlyCur.map(m => m.consumedUnit),
            backgroundColor: 'rgba(40,167,69,0.6)',
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => `${val.toFixed(0)} kWh`,
              font: { weight: 'bold' },
              color: '#28a745'
            }
          },
          {
            label: 'Prev Year',
            data: monthlyPrev.map(m => m.consumedUnit),
            backgroundColor: 'rgba(108,117,125,0.6)',
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => `${val.toFixed(0)} kWh`,
              font: { weight: 'bold' },
              color: '#6c757d'
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
            duration: 1000,
            easing: 'easeOutCirc'
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
  