// File: js/sections/recharge.js
function renderRecharge({ rechargeData, customer }) {
    const tableRows = rechargeData.map((r, i) => {
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${r.meterNo}</td>
          <td>${r.rechargeDate}</td>
          <td>${r.totalAmount.toFixed(2)}</td>
          <td>${r.energyAmount.toFixed(2)}</td>
          <td>${r.orderStatus}</td>
          <td>
            <button 
              class="btn btn-sm btn-outline-primary detail-btn" 
              data-index="${i}"
              data-customer-name="${customer.customerName}">
              Details
            </button>
          </td>
        </tr>`;
    }).join('');
  
    $('#recharge').html(`
      <div class="card card-custom mb-4 p-3">
        <h5>Recharge History (Last 1 year)</h5>
        <div class="text-end mb-2">
          <button class="btn btn-sm btn-outline-primary" onclick="exportTableToExcel('rechargeTable', 'Recharge History')">
            <i class="bi bi-download"></i> Export Excel
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-bordered" id="rechargeTable">
            <thead class="table-light">
              <tr>
                <th>SL</th>
                <th>Meter No</th>
                <th>Date</th>
                <th>Total</th>
                <th>Energy</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    `);
  
    // Activate modal on button click
    $('.detail-btn').on('click', function () {
      const idx = $(this).data('index');
      const name = $(this).data('customer-name');
      const r = rechargeData[idx];
  
      $('#mod-date').text(r.rechargeDate);
      $('#mod-order').text(r.orderID || '--');
      $('#mod-name').text(name);
      $('#mod-meter').text(r.meterNo);
      $('#mod-account').text(r.accountNo);
      $('#mod-status').text(r.orderStatus);
      $('#mod-energy').text(r.energyAmount.toFixed(2));
      $('#mod-demand').text((r.chargeItems?.find(x => x.chargeItemName === 'Demand Charge-All')?.chargeAmount || 0).toFixed(2));
      $('#mod-rent').text((r.chargeItems?.find(x => x.chargeItemName === 'Meter Rent-1P')?.chargeAmount || 0).toFixed(2));
      $('#mod-vat').text((r.VAT || 0).toFixed(2));
      $('#mod-rebate').text((r.rebate || 0).toFixed(2));
      $('#mod-gross').text(r.totalAmount.toFixed(2));
      $('#mod-token').text(r.token || '--');
  
      new bootstrap.Modal(document.getElementById('rechargeModal')).show();
    });
  }
  