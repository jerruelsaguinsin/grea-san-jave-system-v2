/* ============================================================
MODULE JAVASCRIPT FILE
PROCEDURAL JAVASCRIPT
No CSS is included here.

DEPENDENCIES:
This module expects the main system's shared bootstrap/helpers and
account system to already be loaded (GSJ, gsEscapeHtml, gsFormatPeso,
gsToast, etc.). Do NOT create a common.js file.

Load this file after the module HTML and after the main shared helpers.
============================================================ */

/* ========================================================================
   MODULE 7 — PAYMENTS & RECEIPTS
   PROCEDURAL JAVASCRIPT VERSION

   CSS NOTE:
   Put anika.css in the <head> of the HTML page. This module contains NO CSS.

   ACCOUNT INTEGRATION NOTE:
   Your login/account module should set window.GSJ.currentUser before
   pmInit(...) runs. Do NOT put the demo account switcher in this module.
   ======================================================================== */
(function(){
'use strict';

var pmOrders = [];
var pmPending = [];
var pmPayments = [];
var pmReceipts = [];
var pmArchivedPayments = [];
var pmArchivedReceipts = [];
var pmNextPaymentId = 1;
var pmNextQueueId = 1;
var pmNextReceiptId = 1;
var pmBound = false;

function pmCurrentUser(){
    if (window.GSJ && window.GSJ.currentUser) return window.GSJ.currentUser;
    return null;
}

function pmFindOrder(orderId){
    var i;
    for(i=0;i<pmOrders.length;i++){
        if(Number(pmOrders[i].orderId)===Number(orderId)) return pmOrders[i];
    }
    return null;
}

function pmConfirmedTotal(orderId){
    var total=0,i;
    for(i=0;i<pmPayments.length;i++){
        if(Number(pmPayments[i].orderId)===Number(orderId)) total += Number(pmPayments[i].amount||0);
    }
    return total;
}

function pmPendingTotal(orderId){
    var total=0,i;
    for(i=0;i<pmPending.length;i++){
        if(Number(pmPending[i].orderId)===Number(orderId)) total += Number(pmPending[i].amount||0);
    }
    return total;
}

function pmRemaining(orderId){
    var order=pmFindOrder(orderId);
    if(!order) return 0;
    return Number(order.totalPrice||0)-pmConfirmedTotal(orderId)-pmPendingTotal(orderId);
}

/* Module 6 is the source of orders and payment-entry input.
   Module 7 keeps the public recordPayment(...) function so Module 6 can call it. */
function pmSetOrders(orders){
    pmOrders=orders||[];
    pmRenderAll();
}

/* Kept as a compatibility function for the existing bootstrap.
   There is intentionally no payment-entry form inside Module 7. */
function pmPopulateOrders(){
    return pmOrders;
}

function pmRecordPayment(data){
    var order=pmFindOrder(data.orderId);
    var amount=Number(data.amount);
    var method=data.paymentMethod;
    var proof=data.proofOfPaymentFile||'';
    var user=pmCurrentUser();
    if(!order) return gsFail('Please select a valid unpaid order.');
    if(!isFinite(amount) || amount<=0) return gsFail('Payment amount must be greater than zero.');
    if(method!=='Cash' && method!=='GCash' && method!=='Bank Transfer') return gsFail('Invalid payment method.');
    if((method==='GCash' || method==='Bank Transfer') && !proof) return gsFail('Proof of payment is required for GCash or Bank Transfer.');
    var remaining=pmRemaining(order.orderId);
    if(remaining<=0.009) return gsFail('This order is already fully paid.');
    if(amount>remaining+0.009) return gsFail('Payment cannot exceed the remaining balance of '+gsFormatPeso(remaining)+'.');
    if(data.isDownPayment && amount>=Number(order.totalPrice||0)) return gsFail('A down payment must be less than the order total.');

    var payment={
        queueId:'Q'+pmNextQueueId+'_'+Date.now(),
        orderId:Number(order.orderId),
        customerName:order.customerName||'Customer',
        amount:amount,
        paymentMethod:method,
        isDownPayment:!!data.isDownPayment,
        isRush:!!order.isRush,
        proofOfPaymentFile:proof,
        submittedBy:user ? user.userId : null,
        submittedByName:user ? user.fullName : 'Unknown',
        dateSubmitted:new Date().toISOString()
    };
    pmNextQueueId++;
    pmPending[pmPending.length]=payment;
    pmRenderAll();
    return {ok:true,pending:payment};
}

function pmCreateReceipt(order,payment,remaining){
    var receipt={
        receiptId:pmNextReceiptId++,
        paymentId:payment.paymentId,
        orderId:order.orderId,
        customerName:order.customerName||'Customer',
        fileName:order.fileName||'',
        serviceType:order.serviceType||'',
        pages:order.pages||0,
        copies:order.copies||0,
        colorTier:order.colorTier||'',
        orderType:order.isRush?'Rush':'Regular',
        totalPrice:Number(order.totalPrice||0),
        amount:payment.amount,
        remainingBalance:remaining<0?0:remaining,
        paymentMethod:payment.paymentMethod,
        isDownPayment:payment.isDownPayment,
        status:remaining<=0.009?'PAID IN FULL':'PARTIAL PAYMENT',
        recordedByName:payment.submittedByName,
        confirmedByName:payment.confirmedByName,
        dateIssued:payment.dateReceived
    };
    pmReceipts[pmReceipts.length]=receipt;
    return receipt;
}

function pmConfirmPayment(queueId){
    var position=-1,i;
    for(i=0;i<pmPending.length;i++){
        if(String(pmPending[i].queueId)===String(queueId)){position=i;break;}
    }
    if(position<0) return gsFail('Payment is no longer in the queue.');

    var q=pmPending[position];
    var order=pmFindOrder(q.orderId);
    if(!order) return gsFail('The linked order no longer exists.');
    if(order.status==='cancelled') return gsFail('This order is cancelled and the payment cannot be confirmed.');
    var currentPaid=pmConfirmedTotal(order.orderId);
    var orderTotal=Number(order.totalPrice||0);
    if(currentPaid+Number(q.amount||0)>orderTotal+0.009) return gsFail('The queued payment is now greater than the remaining balance.');
    var user=pmCurrentUser();
    var payment={
        paymentId:pmNextPaymentId++,
        orderId:q.orderId,
        customerName:q.customerName,
        amount:q.amount,
        paymentMethod:q.paymentMethod,
        isDownPayment:q.isDownPayment,
        isRush:!!order.isRush,
        proofOfPaymentFile:q.proofOfPaymentFile||null,
        submittedBy:q.submittedBy,
        submittedByName:q.submittedByName,
        confirmedBy:user ? user.userId : null,
        confirmedByName:user ? user.fullName : 'Unknown',
        dateReceived:new Date().toISOString()
    };

    var newPending=[];
    for(i=0;i<pmPending.length;i++) if(i!==position) newPending[newPending.length]=pmPending[i];
    pmPending=newPending;
    pmPayments[pmPayments.length]=payment;

    var paid=pmConfirmedTotal(order.orderId);
    var total=Number(order.totalPrice||0);
    order.paymentStatus=paid>=total-0.009?'fullyPaid':'downPaymentPaid';
    order.downPaymentAmount=paid;
    pmCreateReceipt(order,payment,total-paid);
    pmRenderAll();
    pmPopulateOrders();
    if(window.SalesModule && window.SalesModule.refresh) window.SalesModule.refresh();
    if(window.gsNotifyOrdersChanged) window.gsNotifyOrdersChanged();
    gsToast('Payment confirmed. '+(paid>=total-0.009?'Order is fully paid.':'Remaining balance: '+gsFormatPeso(total-paid)+'.'),'success');
    return {ok:true,payment:payment};
}

function pmConfirmNext(){
    if(pmPending.length===0) return gsFail('No payments are waiting for confirmation.');
    return pmConfirmPayment(pmPending[0].queueId);
}

function pmArchiveDay(){
    var user=pmCurrentUser();
    if(!user || user.role!=='coOwner') return gsFail('Owner permission required.');
    var now=new Date().toISOString();
    var i,p,r;
    for(i=0;i<pmPayments.length;i++){
        p=pmPayments[i];p.archivedAt=now;p.archivedBy=user.userId;p.archivedByName=user.fullName;
        pmArchivedPayments[pmArchivedPayments.length]=p;
    }
    for(i=0;i<pmReceipts.length;i++){
        r=pmReceipts[i];r.archivedAt=now;r.archivedBy=user.userId;r.archivedByName=user.fullName;
        pmArchivedReceipts[pmArchivedReceipts.length]=r;
    }
    pmPayments=[];pmReceipts=[];
    pmRenderAll();
    if(window.SalesModule && window.SalesModule.refresh) window.SalesModule.refresh();
    gsToast('Confirmed payments and receipts were archived. Nothing was deleted.','success');
    return {ok:true};
}

function pmReceiptBreakdown(receipt){
    var total=Number(receipt.totalPrice||0);
    var vat=total*12/112;
    var beforeVat=total-vat;
    var text='<div class="receipt-paper">';
    text+='<img class="receipt-logo" src="grea_logo.jpg" alt="Grea San Jave">';
    text+='<h2>Grea San Jave</h2><h3>Payment Receipt</h3>';
    text+='<div class="receipt-meta">Receipt #: '+receipt.receiptId+'<br>Order #: '+receipt.orderId+'<br>Customer: '+gsEscapeHtml(receipt.customerName)+'<br>Date: '+gsDateTime(receipt.dateIssued)+'</div>';
    text+='<hr><strong>Order details</strong>';
    text+='<p>Service: '+gsEscapeHtml(receipt.serviceType||'—')+'<br>File: '+gsEscapeHtml(receipt.fileName||'—')+'<br>Pages: '+receipt.pages+'<br>Copies: '+receipt.copies+'<br>Color: '+gsEscapeHtml(receipt.colorTier||'—')+'<br>Order type: '+gsEscapeHtml(receipt.orderType)+'</p>';
    text+='<hr><strong>Price breakdown</strong>';
    text+='<div class="receipt-line"><span>Price before VAT</span><span>'+gsFormatPeso(beforeVat)+'</span></div>';
    text+='<div class="receipt-line"><span>VAT included (12%)</span><span>'+gsFormatPeso(vat)+'</span></div>';
    text+='<div class="receipt-total"><span>Order total</span><span>'+gsFormatPeso(total)+'</span></div>';
    text+='<hr><strong>Payment</strong>';
    text+='<div class="receipt-line"><span>Payment received</span><span>'+gsFormatPeso(receipt.amount)+'</span></div>';
    text+='<div class="receipt-line"><span>Method</span><span>'+gsEscapeHtml(receipt.paymentMethod)+'</span></div>';
    text+='<div class="receipt-line"><span>Remaining balance</span><span>'+gsFormatPeso(receipt.remainingBalance)+'</span></div>';
    text+='<div class="receipt-status">'+gsEscapeHtml(receipt.status)+'</div>';
    text+='<p class="audit-note">Recorded by: '+gsEscapeHtml(receipt.recordedByName||'Unknown')+'<br>Confirmed by: '+gsEscapeHtml(receipt.confirmedByName||'Unknown')+'</p>';
    text+='</div>';
    return text;
}

function pmShowReceipt(receiptId){
    var i,r=null;
    for(i=0;i<pmReceipts.length;i++) if(Number(pmReceipts[i].receiptId)===Number(receiptId)) r=pmReceipts[i];
    if(!r) for(i=0;i<pmArchivedReceipts.length;i++) if(Number(pmArchivedReceipts[i].receiptId)===Number(receiptId)) r=pmArchivedReceipts[i];
    if(!r){gsToast('Receipt not found.','error');return;}
    var body=document.getElementById('receiptModalBody');
    var modal=document.getElementById('receiptModal');
    if(body) body.innerHTML=pmReceiptBreakdown(r);
    if(modal){modal.classList.add('open');modal.setAttribute('aria-hidden','false');}
}

function pmCloseReceipt(){
    var modal=document.getElementById('receiptModal');
    if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
}

function pmRenderPending(){
    var body=document.getElementById('pmPendingBody');if(!body)return;
    if(pmPending.length===0){body.innerHTML=gsEmptyRow(8,'No payments waiting for confirmation.');return;}
    var html='',i,p;
    for(i=0;i<pmPending.length;i++){
        p=pmPending[i];
        html+='<tr><td>'+(i+1)+'</td><td>#'+p.orderId+'</td><td>'+gsEscapeHtml(p.customerName)+'</td><td>'+gsFormatPeso(p.amount)+'</td><td>'+gsEscapeHtml(p.paymentMethod)+'</td><td>'+(p.isRush?'Rush':'Regular')+(p.isDownPayment?' / Down payment':' / Full')+'</td><td><button type="button" class="btn btn-success btn-small" data-confirm-payment="'+gsEscapeHtml(p.queueId)+'">Confirm</button></td></tr>';
    }
    body.innerHTML=html;
}

function pmRenderPayments(){
    var body=document.getElementById('pmPaymentsBody');if(!body)return;
    if(pmPayments.length===0){body.innerHTML=gsEmptyRow(9,'No active confirmed payments.');return;}
    var html='',i,p,r;
    for(i=0;i<pmPayments.length;i++){
        p=pmPayments[i];r=null;
        var j;for(j=0;j<pmReceipts.length;j++)if(Number(pmReceipts[j].paymentId)===Number(p.paymentId)){r=pmReceipts[j];break;}
        html+='<tr><td>'+p.paymentId+'</td><td>#'+p.orderId+'</td><td>'+gsEscapeHtml(p.customerName||'—')+'</td><td>'+gsFormatPeso(p.amount)+'</td><td>'+gsEscapeHtml(p.paymentMethod)+'</td><td>'+(p.isRush?'Rush':'Regular')+(p.isDownPayment?' / Down payment':' / Full')+'</td><td>'+(r?gsEscapeHtml(r.status):'Confirmed')+'</td><td>'+gsDateTime(p.dateReceived)+'</td><td>'+(r?'<button type="button" class="btn btn-secondary btn-small" data-view-receipt="'+r.receiptId+'">Print receipt</button>':'—')+'</td></tr>';
    }
    body.innerHTML=html;
}

function pmRenderReceipts(){
    var body=document.getElementById('pmReceiptsBody');if(!body)return;
    if(pmReceipts.length===0){body.innerHTML=gsEmptyRow(8,'No active receipts. A receipt is created for every confirmed payment, including down payments.');return;}
    var html='',i,r;
    for(i=0;i<pmReceipts.length;i++){
        r=pmReceipts[i];
        html+='<tr><td>#'+r.receiptId+'</td><td>#'+r.orderId+'</td><td>'+gsEscapeHtml(r.customerName)+'</td><td>'+gsFormatPeso(r.amount)+'</td><td>'+gsFormatPeso(r.remainingBalance)+'</td><td>'+gsEscapeHtml(r.orderType)+'</td><td>'+gsEscapeHtml(r.status)+'</td><td><button type="button" class="btn btn-secondary btn-small" data-view-receipt="'+r.receiptId+'">View / Print</button></td></tr>';
    }
    body.innerHTML=html;
}

function pmRenderArchive(){
    var body=document.getElementById('pmArchiveBody');if(!body)return;
    if(pmArchivedPayments.length===0 && pmArchivedReceipts.length===0){body.innerHTML=gsEmptyRow(6,'No archived payment or receipt records yet.');return;}
    var html='',i,p,r;
    for(i=0;i<pmArchivedPayments.length;i++){p=pmArchivedPayments[i];html+='<tr><td>Payment</td><td>'+p.paymentId+'</td><td>#'+p.orderId+'</td><td>'+gsFormatPeso(p.amount)+'</td><td>'+gsEscapeHtml(p.archivedByName||'Unknown')+'</td><td>'+gsDateTime(p.archivedAt)+'</td></tr>';}
    for(i=0;i<pmArchivedReceipts.length;i++){r=pmArchivedReceipts[i];html+='<tr><td>Receipt</td><td>'+r.receiptId+'</td><td>#'+r.orderId+'</td><td>'+gsFormatPeso(r.amount)+'</td><td>'+gsEscapeHtml(r.archivedByName||'Unknown')+'</td><td>'+gsDateTime(r.archivedAt)+'</td></tr>';}
    body.innerHTML=html;
}

function pmRenderAll(){pmRenderPending();pmRenderPayments();pmRenderArchive();}

function pmBind(){
    if(pmBound)return;
    pmBound=true;
    var archive=document.getElementById('btnArchivePaymentDay');
    if(archive)archive.addEventListener('click',pmArchiveDay);
    var print=document.getElementById('btnPrintReceipt');
    if(print)print.addEventListener('click',function(){
        var main=document.querySelector('main');
        var header=document.querySelector('.app-header');
        var demo=document.getElementById('demoToolsBottom');
        if(main)main.style.display='none';
        if(header)header.style.display='none';
        if(demo)demo.style.display='none';
        var modal=document.getElementById('receiptModal');
        if(modal){modal.classList.add('open');modal.style.display='flex';modal.style.position='static';modal.style.background='#fff';modal.style.padding='0';}
        window.print();
    });
    window.addEventListener('afterprint',function(){
        var main=document.querySelector('main');
        var header=document.querySelector('.app-header');
        var demo=document.getElementById('demoToolsBottom');
        if(main)main.style.display='';
        if(header)header.style.display='';
        if(demo)demo.style.display='';
    });
    var close=document.getElementById('btnCloseReceipt');
    if(close)close.addEventListener('click',pmCloseReceipt);
    document.addEventListener('click',function(e){
        var target=e.target;
        if(target && target.getAttribute('data-confirm-payment')) pmConfirmPayment(target.getAttribute('data-confirm-payment'));
        if(target && target.getAttribute('data-view-receipt')) pmShowReceipt(target.getAttribute('data-view-receipt'));
    });
}

function pmInit(orders){
    pmOrders=orders||[];pmPending=[];pmPayments=[];pmReceipts=[];pmArchivedPayments=[];pmArchivedReceipts=[];pmNextPaymentId=1;pmNextQueueId=1;pmNextReceiptId=1;
    pmBind();pmRenderAll();
}

function pmSeedConfirmedPayment(orderId,amount,method,isDown,proof){
    var result=pmRecordPayment({orderId:orderId,amount:amount,paymentMethod:method,isDownPayment:isDown,proofOfPaymentFile:proof||''});
    if(result.ok) pmConfirmNext();
    return result;
}

/* DEMO TOOL HOOKS — actual demo data belongs in the separate bootstrap file. */
window.pmDemoConfirmNext=function(){return pmConfirmNext();};
window.pmDemoArchiveDay=function(){return pmArchiveDay();};
window.pmDemoArchiveOne=function(orderId){
    var u=pmCurrentUser();if(!u||u.role!=='coOwner')return gsFail('Owner permission required.');
    var now=new Date().toISOString(),next=[],i,p,r;
    for(i=0;i<pmPayments.length;i++){
        p=pmPayments[i];
        if(Number(p.orderId)===Number(orderId)){p.archivedAt=now;p.archivedBy=u.userId;p.archivedByName=u.fullName;pmArchivedPayments[pmArchivedPayments.length]=p;}
        else next[next.length]=p;
    }
    pmPayments=next;
    next=[];
    for(i=0;i<pmReceipts.length;i++){
        r=pmReceipts[i];
        if(Number(r.orderId)===Number(orderId)){r.archivedAt=now;r.archivedBy=u.userId;r.archivedByName=u.fullName;pmArchivedReceipts[pmArchivedReceipts.length]=r;}
        else next[next.length]=r;
    }
    pmReceipts=next;pmRenderAll();return {ok:true};
};

window.PaymentsModule={
    init:pmInit,
    recordPayment:pmRecordPayment,
    confirmPayment:pmConfirmPayment,
    confirmNextPayment:pmConfirmNext,
    seedConfirmedPayment:pmSeedConfirmedPayment,
    renderAll:pmRenderAll,
    setOrders:pmSetOrders,
    populateOrders:pmPopulateOrders,
    getConfirmedTotal:pmConfirmedTotal,
    getPendingTotal:pmPendingTotal,
    getRemaining:pmRemaining,
    getPayments:function(){return pmPayments;},
    getArchivedPayments:function(){return pmArchivedPayments;},
    getReceipts:function(){return pmReceipts;},
    getArchivedReceipts:function(){return pmArchivedReceipts;},
    archiveDay:pmArchiveDay
};
})();