// File: js/sections/demand.js
function renderDemand({ monthlyCur, chartOptions = {} }) {
    const isMobile = window.innerWidth <= 768;
  
    const labels = monthlyCur.map(m => {
      const date = new Date(m.month + '-01');
      const mon = date.toLocaleString('en-US', { month: 'short' });
      const yr = date.getFullYear().toString().slice(-2);
      return `${mon} '${yr}`;
    });
  
    document.getElementById('demand').innerHTML = `
      <div class="card card-custom mb-4 ${isMobile ? '' : 'p-3'}">
        <div class="text-end mb-2">
            <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('demandChartCanvas', 'Monthly Max Demand')">
                <i class="bi bi-download"></i>
            </button>
        </div>
        <div class="chart-wrapper"><canvas id="demandChartCanvas"></canvas></div>
      </div>
    `;
  
    const canvas = document.getElementById('demandChartCanvas');
    if (isMobile) {
      canvas.style.height = `${window.innerHeight * 0.5}px`;
      canvas.style.width = '100%';
    }
  
    const totalDuration = 10000;
    const delayBetweenPoints = totalDuration / monthlyCur.length;
  
    const progressiveAnimation = {
      x: {
        type: 'number',
        easing: 'linear',
        duration: delayBetweenPoints,
        from: NaN,
        delay(context) {
          if (context.type !== 'data' || context.xStarted) return 0;
          context.xStarted = true;
          return context.index * delayBetweenPoints;
        }
      },
      y: {
        type: 'number',
        easing: 'linear',
        duration: delayBetweenPoints,
        from: context => {
          const chart = context.chart;
          const meta = chart.getDatasetMeta(context.datasetIndex);
          const previous = meta.data[context.index - 1];
          return previous ? previous.y : chart.scales[meta.yAxisID || 'y'].getPixelForValue(100);
        },
        delay(context) {
          if (context.type !== 'data' || context.yStarted) return 0;
          context.yStarted = true;
          return context.index * delayBetweenPoints;
        }
      }
    };
  
    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Max Demand (kW)',
            data: monthlyCur.map(m => m.maximumDemand),
            borderColor: 'rgba(23,162,184,0.8)',
            backgroundColor: 'rgba(23,162,184,0.2)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animations: {
          ...progressiveAnimation,
          tension: {
            duration: 1000,
            easing: 'linear',
            from: 1,
            to: 0,
            loop: true
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: isMobile ? 40 : 0,
              minRotation: isMobile ? 20 : 0,
              font: { size: isMobile ? 10 : 12 }
            }
          },
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Monthly Max Demand (kW)',
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
            clip: false,
            anchor: isMobile ? 'center' : 'end',
            align: isMobile ? 'top' : 'top',
            formatter: (val) => `${val.toFixed(2)} kW`,
            font: { weight: isMobile ? 'normal' : 'bold', size: isMobile ? 10 : 12 },
            color: '#17a2b8',
            padding: 2
          },
          ...(chartOptions.plugins || {})
        },
        ...chartOptions
      },
      plugins: [ChartDataLabels]
    });
  }
    