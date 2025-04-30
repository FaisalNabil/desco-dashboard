// File: js/sections/demand.js
function renderDemand({ monthlyCur, chartOptions = {} }) {
    document.getElementById('demand').innerHTML = `
      <div class="card card-custom mb-4 p-3">
        <h5>Monthly Max Demand (kW)</h5>
        <div class="text-end mb-2">
            <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('demandChartCanvas', 'Monthly Max Demand')">
                <i class="bi bi-download"></i>
            </button>
        </div>
        <div class="chart-wrapper"><canvas id="demandChartCanvas"></canvas></div>
      </div>
    `;
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

    new Chart(document.getElementById('demandChartCanvas'), {
      type: 'line',
      data: {
        labels: monthlyCur.map(m => m.month),
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
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            enabled: true
          },
          datalabels: {
            display: true,
            clip: false,
            anchor: 'end',
            align: 'top',
            formatter: (val) => `${val.toFixed(2)} kW`,
            font: { weight: 'bold' },
            color: '#17a2b8'
          },
          ...(chartOptions.plugins || {})
        },
        ...chartOptions
      },
      plugins: [ChartDataLabels]
    });
  }
  