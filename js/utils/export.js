// ———————————————
// Export Chart to PDF
// ———————————————
function exportChartToPdf(canvasId, title) {
    const { jsPDF } = window.jspdf;
    const canvas = document.getElementById(canvasId);
  
    html2canvas(canvas).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape');
      pdf.text(title, 15, 15);
      pdf.addImage(imgData, 'PNG', 10, 30, 270, 150);
      pdf.save(`${title}.pdf`);
    });
  }
  
  // ———————————————
  // Export Table to Excel
  // ———————————————
  function exportTableToExcel(tableId, fileName) {
    const table = document.getElementById(tableId);
    const wb = XLSX.utils.table_to_book(table, {sheet:"Sheet 1"});
    XLSX.writeFile(wb, fileName + '.xlsx');
  }
  