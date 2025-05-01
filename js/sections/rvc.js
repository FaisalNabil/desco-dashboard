// File: js/sections/rvc.js
function renderRvc({ rechargeData, monthlyCur }) {
    const isMobile = window.innerWidth <= 768;
  
    // Format labels like "May '24"
    const months = monthlyCur.map(m => {
      const date = new Date(m.month + '-01');
      const shortMonth = date.toLocaleString('en-US', { month: 'short' });
      const shortYear = date.getFullYear().toString().slice(-2);
      return `${shortMonth} '${shortYear}`;
    });
  
    // Group recharge by month
    const rechargePerMonth = monthlyCur.map(m => {
      return rechargeData
        .filter(r => r.rechargeDate?.startsWith(m.month))
        .reduce((s, r) => s + (r.totalAmount || 0), 0);
    });
    const maxRecharge = Math.max(...rechargePerMonth);
    const maxConsumed = Math.max(...monthlyCur.map(m => m.consumedTaka));
    const yMax = Math.max(maxRecharge, maxConsumed) * 1.2;
    
    document.getElementById('rvc').innerHTML = `
      <div class="card card-custom mb-4 ${isMobile ? '' : 'p-3'}">
        <div class="text-end mb-2">
            <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('rvcChartCanvas', 'Recharge vs Consumption')">
                <i class="bi bi-download"></i>
            </button>
        </div>
        <div class="chart-wrapper"><canvas id="rvcChartCanvas"></canvas></div>
      </div>
    `;
  
    const canvas = document.getElementById('rvcChartCanvas');
    if (isMobile) {
      canvas.style.height = `${window.innerHeight * 0.5}px`;
      canvas.style.width = '100%';
    }
  
    const datalabelStyle = (color) => {
      return isMobile
        ? {
            anchor: 'end',
            align: 'end',
            formatter: val => `${val.toFixed(0)} BDT`,
            font: { size: 10 },
            color
          }
        : {
            anchor: 'end',
            align: 'end',
            formatter: val => `${val.toFixed(0)} BDT`,
            font: { weight: 'bold' },
            color
          };
    };
  
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Recharge',
            data: rechargePerMonth,
            backgroundColor: 'rgba(255,193,7,0.6)',
            datalabels: datalabelStyle('#ffc107')
          },
          {
            label: 'Consumed BDT',
            data: monthlyCur.map(m => m.consumedTaka),
            backgroundColor: 'rgba(220,53,69,0.6)',
            datalabels: datalabelStyle('#dc3545')
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
            delay: ctx => ctx.dataIndex * 100
          },
          x: {
            type: 'number',
            easing: 'easeOutElastic',
            duration: 400
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: isMobile ? 40 : 0,
              minRotation: isMobile ? 20 : 0,
              font: { size: isMobile ? 10 : 12 }
            }
          },
          y: {
            beginAtZero: true,
            suggestedMax: yMax
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Recharge vs Consumption (BDT)',
            align: 'center',
            font: { size: 16, weight: 'bold' },
            padding: { top: 10, bottom: 10 }
          },
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
  