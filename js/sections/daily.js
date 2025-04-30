// File: js/sections/daily.js
function renderDaily({ daily, chartOptions = {} }) {
    document.getElementById('daily').innerHTML = `
      <div class="card card-custom mb-4 p-3">
        <div class="text-end mb-2">
            <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('dailyChartCanvas', 'Daily Consumption')">
            <i class="bi bi-download"></i>
            </button>
        </div>
        <h5>Daily Consumption</h5>
        <div class="chart-wrapper"><canvas id="dailyChartCanvas"></canvas></div>
      </div>
    `;
  
    const canvas = document.getElementById('dailyChartCanvas');
    const ctx = canvas.getContext('2d');
  
    const totalDuration = 10000;
    const delayBetweenPoints = totalDuration / daily.length;
    const progressiveAnimation = {
      x: {
        type: 'number',
        easing: 'linear',
        duration: delayBetweenPoints,
        from: NaN,
        delay(context) {
          if (context.type !== 'data' || context.xStarted) {
            return 0;
          }
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
          if (context.type !== 'data' || context.yStarted) {
            return 0;
          }
          context.yStarted = true;
          return context.index * delayBetweenPoints;
        }
      }
    };
  
    new Chart(ctx, {
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
            tension: 0.3,
            borderWidth: 1,
            radius: 0,
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
            tension: 0.3,
            borderWidth: 1,
            radius: 0,
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
        interaction: {
          intersect: false,
          mode: 'nearest',
          axis: 'x'
        },
        plugins: {
          tooltip: {
            enabled: true
          },
          datalabels: {
            display: true,
            clip: false
          },
          legend: {
            display: true
          },
          ...(chartOptions.plugins || {})
        },
        animation: {
          ...progressiveAnimation,
          ...(chartOptions.animation || {})
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
        },
        ...chartOptions
      },
      plugins: [ChartDataLabels]
    });
  }
  