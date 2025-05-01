// File: js/sections/comparison.js
function renderComparison({ monthlyCur, monthlyPrev, chartOptions = {} }) {
    const isMobile = window.innerWidth <= 768;
    const container = document.getElementById('comparison');
    container.innerHTML = `
      <div class="row mb-4">
        <div class="col-lg-6 col-12 mb-3">
          <div class="card card-custom ${isMobile ? '' : 'p-3'}">
            <div class="text-end mb-2">
                <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('cmpBdtCanvas', 'Comparison BDT')">
                    <i class="bi bi-download"></i>
                </button>
            </div>
            <div class="chart-wrapper"><canvas id="cmpBdtCanvas"></canvas></div>
          </div>
        </div>
        <div class="col-lg-6 col-12 mb-3">
          <div class="card card-custom ${isMobile ? '' : 'p-3'}">
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
  
    const labels = monthlyCur.map((m, i) => {
        const curDate = new Date(m.month + '-01'); // "2024-05" → Date
        const prevDate = monthlyPrev[i]?.month ? new Date(monthlyPrev[i].month + '-01') : null;
      
        const curMonth = curDate.toLocaleString('en-US', { month: 'short' });
        const curYear = curDate.getFullYear().toString().slice(-2);
      
        const prevMonth = prevDate?.toLocaleString('en-US', { month: 'short' }) || '';
        const prevYear = prevDate?.getFullYear().toString().slice(-2) || '';
      
        return `${curMonth} '${curYear} / ${prevMonth} '${prevYear}`;
      });
      
    const maxBdt = Math.max(...monthlyCur.map(m => m.consumedTaka), ...monthlyPrev.map(m => m.consumedTaka));
    const maxKwh = Math.max(...monthlyCur.map(m => m.consumedUnit), ...monthlyPrev.map(m => m.consumedUnit));
    const yMaxBdt = maxBdt * 1.2;
    const yMaxKwh = maxKwh * 1.2;
  
    const datalabelStyle = (color, unit) => {
      return isMobile
        ? {
            anchor: 'end',
            align: 'end',
            formatter: val => `${val.toFixed(0)} ${unit}`,
            font: { size: 10 },
            color
          }
        : {
            anchor: 'end',
            align: 'end',
            formatter: val => `${val.toFixed(0)} ${unit}`,
            font: { weight: 'bold' },
            color
          };
    };
  
    const bdtCanvas = document.getElementById('cmpBdtCanvas');
    const kwhCanvas = document.getElementById('cmpKwhCanvas');
  
    if (isMobile) {
      bdtCanvas.style.height = `${window.innerHeight * 0.4}px`;
      bdtCanvas.style.width = '100%';
      kwhCanvas.style.height = `${window.innerHeight * 0.4}px`;
      kwhCanvas.style.width = '100%';
    }
  
    new Chart(bdtCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'This Year',
            data: monthlyCur.map(m => m.consumedTaka),
            backgroundColor: 'rgba(0,123,255,0.6)',
            datalabels: datalabelStyle('#007bff', 'BDT')
          },
          {
            label: 'Prev Year',
            data: monthlyPrev.map(m => m.consumedTaka),
            backgroundColor: 'rgba(108,117,125,0.6)',
            datalabels: datalabelStyle('#6c757d', 'BDT')
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animations: {
            y: {
              from: 0,
              type: 'number',
              easing: 'easeOutBounce',
              duration: 800,
              delay: (ctx) => ctx.dataIndex * 100 // stagger
            },
            x: {
              type: 'number',
              easing: 'easeOutElastic',
              duration: 500
            }
        },
        scales: {
            x: {
                ticks: {
                  maxRotation: isMobile ? 45 : 0,
                  minRotation: isMobile ? 30 : 0,
                  autoSkip: false
                }
              },
          y: { beginAtZero: true, suggestedMax: yMaxBdt }
        },
        plugins: {
          title: {
            display: true,
            text: 'Monthly Comparison (BDT)',
            align: 'center',
            font: { size: 16, weight: 'bold' },
            padding: { top: 10, bottom: 10 }
          },
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                const i = tooltipItems[0].dataIndex;
                return `${monthlyCur[i]?.month || ''} ${monthlyCur[i]?.year || ''} vs ${monthlyPrev[i]?.month || ''} ${monthlyPrev[i]?.year || ''}`;
              }
            }
          },          
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
  
    new Chart(kwhCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'This Year',
            data: monthlyCur.map(m => m.consumedUnit),
            backgroundColor: 'rgba(40,167,69,0.6)',
            datalabels: datalabelStyle('#28a745', 'kWh')
          },
          {
            label: 'Prev Year',
            data: monthlyPrev.map(m => m.consumedUnit),
            backgroundColor: 'rgba(108,117,125,0.6)',
            datalabels: datalabelStyle('#6c757d', 'kWh')
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animations: {
            y: {
              from: 0,
              type: 'number',
              easing: 'easeOutBounce',
              duration: 800,
              delay: (ctx) => ctx.dataIndex * 100 // stagger
            },
            x: {
              type: 'number',
              easing: 'easeOutElastic',
              duration: 500
            }
        },
        scales: {
            x: {
                ticks: {
                  maxRotation: isMobile ? 45 : 0,
                  minRotation: isMobile ? 30 : 0,
                  autoSkip: false
                }
              },
              y: { beginAtZero: true, suggestedMax: yMaxKwh }
        },
        plugins: {
          title: {
            display: true,
            text: 'Monthly Comparison (kWh)',
            align: 'center',
            font: { size: 16, weight: 'bold' },
            padding: { top: 10, bottom: 10 }
          },
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                const i = tooltipItems[0].dataIndex;
                return `${monthlyCur[i]?.month || ''} ${monthlyCur[i]?.year || ''} vs ${monthlyPrev[i]?.month || ''} ${monthlyPrev[i]?.year || ''}`;
              }
            }
          },
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
  