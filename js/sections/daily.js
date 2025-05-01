function renderDaily({ daily, chartOptions = {} }) {
    const isMobile = window.innerWidth <= 768;
  
    document.getElementById('daily').innerHTML = `
      <div class="card card-custom mb-4 ${isMobile ? '' : 'p-3'}">
        <div class="text-end mb-2">
            <button class="btn btn-sm btn-outline-primary mb-2" onclick="exportChartToPdf('dailyChartCanvas', 'Daily Consumption')">
            <i class="bi bi-download"></i>
            </button>
        </div>
        <div class="chart-wrapper"><canvas id="dailyChartCanvas"></canvas></div>
      </div>
    `;
  
    const canvas = document.getElementById('dailyChartCanvas');
    const ctx = canvas.getContext('2d');
  
    const totalDuration = 10000;
    const delayBetweenPoints = totalDuration / daily.length;
    const maxBDT = Math.max(...daily.map(d => d.consumedTaka));
    const maxKwh = Math.max(...daily.map(d => d.dailyUnit));
  
    const datalabelStyle = (color, unit) => {
      return isMobile
        ? {
            align: 'top',
            anchor: 'center',
            formatter: (value, ctx) =>
              ctx.chart.data.datasets.length === 1 ? value : '',
            color,
            font: { weight: 'normal', size: 10 },
            padding: 2
          }
        : {
            align: 'end',
            anchor: 'end',
            formatter: (value) => `${value.toFixed(2)} ${unit}`,
            backgroundColor: 'white',
            borderColor: color,
            borderRadius: 4,
            borderWidth: 1,
            padding: 4,
            color,
            font: { weight: 'bold' }
          };
    };
  
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
        from: (context) => {
          const chart = context.chart;
          const meta = chart.getDatasetMeta(context.datasetIndex);
          const previous = meta.data[context.index - 1];
          return previous
            ? previous.y
            : chart.scales[meta.yAxisID || 'y'].getPixelForValue(100);
        },
        delay(context) {
          if (context.type !== 'data' || context.yStarted) return 0;
          context.yStarted = true;
          return context.index * delayBetweenPoints;
        }
      }
    };
  
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: daily.map(d =>
          new Date(d.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
          })
        ),
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
            datalabels: datalabelStyle('#007bff', 'BDT')
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
            datalabels: datalabelStyle('#28a745', 'kWh')
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        layout: {
          padding: isMobile ? 0 : 20
        },
        interaction: {
          intersect: false,
          mode: 'nearest',
          axis: 'x'
        },
        plugins: {
            title: {
                display: true,
                text: 'Daily Consumption',
                align: 'center',
                font: {
                    size: 16,
                    weight: 'bold'
                },
                color: '#343a40', // optional styling
                padding: {
                    top: 10,
                    bottom: 10
                }
                },
                tooltip: { enabled: true },
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
            title: { display: true, text: 'BDT' },
            suggestedMax: maxBDT * 1.2
          },
          y2: {
            position: 'right',
            title: { display: true, text: 'kWh' },
            grid: { drawOnChartArea: false },
            suggestedMax: maxKwh * 1.2
          }
        },
        ...chartOptions
      },
      plugins: [ChartDataLabels]
    });
  }
  