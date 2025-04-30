// File: js/sections/rvc.js
function renderRvc({ rechargeData, monthlyCur }) {
    const months = monthlyCur.map(m => m.month);
    const rechargePerMonth = months.map(m => {
      return rechargeData.filter(r => r.rechargeDate.startsWith(m)).reduce((s, r) => s + (r.totalAmount || 0), 0);
    });
  
    document.getElementById('rvc').innerHTML = `
      <div class="card card-custom mb-4 p-3">
        <h5>Recharge vs Consumption (BDT)</h5>
        
        <div class="text-end mb-2">
            <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('rvcChartCanvas', 'Recharge vs Consumption')">
                <i class="bi bi-download"></i>
            </button>
        </div>
        <div class="chart-wrapper"><canvas id="rvcChartCanvas"></canvas></div>
      </div>
    `;
  
    new Chart(document.getElementById('rvcChartCanvas'), {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Recharge',
            data: rechargePerMonth,
            backgroundColor: 'rgba(255,193,7,0.6)',
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => `${val.toFixed(0)} BDT`,
              font: { weight: 'bold' },
              color: '#ffc107'
            }
          },
          {
            label: 'Consumed BDT',
            data: monthlyCur.map(m => m.consumedTaka),
            backgroundColor: 'rgba(220,53,69,0.6)',
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => `${val.toFixed(0)} BDT`,
              font: { weight: 'bold' },
              color: '#dc3545'
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
            easing: 'easeOutCubic'
          }
        },
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            enabled: true
          },
          datalabels: {
            display: true,
            clip: false
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }