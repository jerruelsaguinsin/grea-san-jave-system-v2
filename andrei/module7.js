/*
GREA SAN JAVE — MODULE 7 — PAYMENTS & RECEIPTS
FINAL PROCEDURAL JAVASCRIPT

IMPORTANT ARCHITECTURE
- Module 6 / Order Placement owns the order records.
- Module 7 does NOT create orders.
- Module 7 reads window.GSJ.orders supplied by Module 6.
- The Order ID connects an order to its payments and receipts.
- Rush/Regular status is read from the order. It is not entered as a payment field.
- A valid new payment automatically enters the confirmation queue.
- Any authorized pending payment may be confirmed. There is NO FIFO rule.
- Every confirmed payment creates a receipt, including down payments.
- Records are archived, not deleted.

ACCOUNT INTEGRATION
The login system should set:
window.GSJ.currentUser = { userId, fullName, role };
Roles expected: owner or coOwner for owner-level actions, staff for normal staff actions.

CSS
Load anika.css from the HTML <head>. This JS contains no CSS.

PROCEDURAL RULE
This file intentionally avoids array convenience methods such as push, pop, shift,
unshift, splice, indexOf, find, findIndex, filter, reduce, map, forEach, sort,
trim, concat, and similar methods. Loops and direct array assignment are used.
*/
(function(){
'use strict';

window.GSJ = window.GSJ || {};

var pmOrders = [];
var pmQueue = [];
var pmPayments = [];
var pmReceipts = [];
var pmArchivedPayments = [];
var pmArchivedReceipts = [];
var pmNextPaymentId = 1;
var pmNextQueueId = 1;
var pmNextReceiptId = 1;
var pmBound = false;

function pmEscape(value){
    var s=String(value==null?'':value),out='',i,c;
    for(i=0;i<s.length;i++){c=s[i];if(c==='&')out+='&amp;';else if(c==='<')out+='&lt;';else if(c==='>')out+='&gt;';else if(c==='"')out+='&quot;';else if(c==="'")out+='&#39;';else out+=c;}
    return out;
}
function pmPad(n){return n<10?'0'+n:String(n);}
function pmToday(){var d=new Date();return d.getFullYear()+'-'+pmPad(d.getMonth()+1)+'-'+pmPad(d.getDate());}
function pmNow(){return new Date().toISOString();}
function pmMoney(value){var n=Number(value||0);if(!isFinite(n))n=0;return Math.round(n*100)/100;}
function pmPeso(value){
    var n=pmMoney(value),neg=n<0;if(neg)n=-n;
    var whole=Math.floor(n),cent=Math.round((n-whole)*100),raw=String(whole),out='',i;
    if(cent===100){whole++;cent=0;raw=String(whole);}
    for(i=raw.length-1;i>=0;i--){out=raw[i]+out;if((raw.length-i)%3===0&&i!==0)out=','+out;}
    return neg?'₱-'+out+'.'+pmPad(cent):'₱'+out+'.'+pmPad(cent);
}
function pmUser(){return window.GSJ && window.GSJ.currentUser ? window.GSJ.currentUser : null;}
function pmIsOwner(){var u=pmUser();return !!u && (u.role==='owner'||u.role==='coOwner'||u.role==='ownerAdmin');}
function pmOrdersSource(){
    if(window.GSJ && window.GSJ.orders) return window.GSJ.orders;
    if(window.gsOrders) return window.gsOrders;
    return [];
}
function pmFindOrder(id){var i;for(i=0;i<pmOrders.length;i++)if(Number(pmOrders[i].orderId)===Number(id))return pmOrders[i];return null;}
function pmConfirmedTotal(id){var total=0,i;for(i=0;i<pmPayments.length;i++)if(Number(pmPayments[i].orderId)===Number(id))total+=Number(pmPayments[i].amount||0);return pmMoney(total);}
function pmQueuedTotal(id){var total=0,i;for(i=0;i<pmQueue.length;i++)if(Number(pmQueue[i].orderId)===Number(id))total+=Number(pmQueue[i].amount||0);return pmMoney(total);}
function pmBalance(id){var o=pmFindOrder(id);if(!o)return 0;return pmMoney(Number(o.totalPrice||0)-pmConfirmedTotal(id)-pmQueuedTotal(id));}
function pmDisplayName(o){return o.customerName||o.customer||'—';}
function pmOrderType(o){return o.isRush?'Rush':'Regular';}
function pmUserName(){var u=pmUser();return u?u.fullName:'Not signed in';}
function pmSetText(id,value){var e=document.getElementById(id);if(e)e.textContent=value;}
function pmMessage(text,type){var e=document.getElementById('pmMessage');if(e){e.textContent=text||'';e.className='field-message '+(type==='error'?'error':'success');}}

function pmRefreshOrders(){
    var source=pmOrdersSource(),next=[],i;
    for(i=0;i<source.length;i++)next[i]=source[i];
    pmOrders=next;
    pmRenderOrderCards();
    pmRenderQueue();
    pmRenderConfirmed();
    pmUpdateCounters();
}

function pmOrderIsPayable(o){
    if(!o)return false;
    var status=String(o.status||'').toLowerCase();
    if(status==='cancelled'||status==='canceled')return false;
    return Number(o.totalPrice||0)>pmConfirmedTotal(o.orderId)+pmQueuedTotal(o.orderId);
}

function pmRenderOrderCards(){
    var body=document.getElementById('pmOrdersBody');if(!body)return;
    var html='',i,o,balance;
    for(i=0;i<pmOrders.length;i++){
        o=pmOrders[i];
        if(!pmOrderIsPayable(o))continue;
        balance=pmBalance(o.orderId);
        html+='<tr><td>#'+pmEscape(o.orderId)+'</td><td>'+pmEscape(pmDisplayName(o))+'</td><td>'+pmPeso(o.totalPrice)+'</td><td>'+pmPeso(pmConfirmedTotal(o.orderId))+'</td><td>'+pmPeso(balance)+'</td><td>'+pmOrderType(o)+'</td><td><button type="button" class="btn btn-primary btn-small" onclick="PaymentsModule.openPayment('+Number(o.orderId)+')">Receive payment</button></td></tr>';
    }
    if(html==='')html='<tr><td colspan="7">No orders with an outstanding balance were found.</td></tr>';
    body.innerHTML=html;
}

function pmOpenPayment(orderId){
    var o=pmFindOrder(orderId);if(!o)return;
    var panel=document.getElementById('pmPaymentPanel');
    if(panel)panel.hidden=false;
    pmSetText('pmSelectedOrder','#'+o.orderId+' — '+pmDisplayName(o));
    pmSetText('pmSelectedTotal',pmPeso(o.totalPrice));
    pmSetText('pmSelectedPaid',pmPeso(pmConfirmedTotal(o.orderId)));
    pmSetText('pmSelectedBalance',pmPeso(pmBalance(o.orderId)));
    pmSetText('pmSelectedType',pmOrderType(o)+' order');
    var id=document.getElementById('pmSelectedOrderId');if(id)id.value=o.orderId;
    var amount=document.getElementById('pmPaymentAmount');if(amount){amount.value='';amount.max=String(pmBalance(o.orderId));}
    var down=document.getElementById('pmIsDown');if(down)down.checked=false;
    var method=document.getElementById('pmPaymentMethod');if(method)method.value='Cash';
    pmUpdateProof();
}
function pmClosePayment(){var p=document.getElementById('pmPaymentPanel');if(p)p.hidden=true;pmMessage('','');}

function pmUpdateProof(){
    var method=document.getElementById('pmPaymentMethod'),wrap=document.getElementById('pmProofWrap'),proof=document.getElementById('pmProof');
    var need=method && (method.value==='GCash'||method.value==='Bank Transfer');
    if(wrap)wrap.hidden=!need;
    if(proof)proof.required=!!need;
}

function pmRecordPaymentFromForm(){
    var id=document.getElementById('pmSelectedOrderId');
    var amount=document.getElementById('pmPaymentAmount');
    var method=document.getElementById('pmPaymentMethod');
    var down=document.getElementById('pmIsDown');
    var proof=document.getElementById('pmProof');
    if(!id||!amount||!method)return;
    var order=pmFindOrder(id.value);
    if(!order){pmMessage('The selected order no longer exists.','error');return;}
    var value=Number(amount.value||0),balance=pmBalance(order.orderId);
    if(value<=0){pmMessage('Payment amount must be greater than zero.','error');return;}
    if(value>balance){pmMessage('Payment cannot exceed the remaining balance of '+pmPeso(balance)+'.','error');return;}
    if(value<balance && !down.checked){pmMessage('A payment below the full balance must be marked as a down payment.','error');return;}
    if(value>=balance && down.checked){pmMessage('A full-balance payment cannot be marked as a down payment.','error');return;}
    if(method.value==='GCash'||method.value==='Bank Transfer'){
        if(!proof || !proof.files || proof.files.length===0){pmMessage('Proof of payment is required for '+method.value+'.','error');return;}
    }
    var u=pmUser();
    if(!u){pmMessage('Please sign in before recording a payment.','error');return;}
    var payment={
        queueId:pmNextQueueId++,paymentId:pmNextPaymentId++,orderId:Number(order.orderId),customerName:pmDisplayName(order),amount:pmMoney(value),paymentMethod:method.value,
        isDownPayment:!!down.checked,isRush:!!order.isRush,recordedBy:u.userId,recordedByName:u.fullName,dateRecorded:pmNow(),proofOfPaymentFile:proof&&proof.files&&proof.files.length>0?proof.files[0].name:'',status:'pending'
    };
    pmQueue[pmQueue.length]=payment;
    pmRenderQueue();pmUpdateCounters();pmMessage('Payment added to the confirmation queue.','success');
    if(window.SalesModule&&window.SalesModule.refresh)window.SalesModule.refresh();
}

function pmConfirmPayment(queueId){
    var pos=-1,i,p;
    for(i=0;i<pmQueue.length;i++)if(Number(pmQueue[i].queueId)===Number(queueId)){pos=i;break;}
    if(pos<0)return;
    p=pmQueue[pos];
    var u=pmUser();
    if(!u){pmMessage('Please sign in before confirming a payment.','error');return;}
    if(!pmIsOwner() && Number(u.userId)!==Number(p.recordedBy)){
        pmMessage('Only the recording staff member or an owner/co-owner can confirm this payment.','error');return;
    }
    var next=[],j;for(j=0;j<pmQueue.length;j++)if(j!==pos)next[next.length]=pmQueue[j];pmQueue=next;
    p.status='confirmed';p.confirmedBy=u.userId;p.confirmedByName=u.fullName;p.dateReceived=pmNow();
    pmPayments[pmPayments.length]=p;
    var order=pmFindOrder(p.orderId);
    if(order){
        var paid=pmConfirmedTotal(p.orderId),total=Number(order.totalPrice||0);
        order.amountPaid=paid;order.remainingBalance=pmMoney(total-paid);
        order.paymentStatus=paid>=total?'paid':'partial';
    }
    pmCreateReceipt(p,order);
    pmRenderAll();
    if(window.SalesModule&&window.SalesModule.refresh)window.SalesModule.refresh();
    pmMessage('Payment confirmed and receipt created.','success');
}

function pmCreateReceipt(payment,order){
    var receipt={receiptId:pmNextReceiptId++,paymentId:payment.paymentId,orderId:payment.orderId,customerName:payment.customerName,amount:payment.amount,paymentMethod:payment.paymentMethod,isDownPayment:payment.isDownPayment,isRush:order?!!order.isRush:!!payment.isRush,orderTotal:order?Number(order.totalPrice||0):0,remainingBalance:order?pmMoney(Number(order.totalPrice||0)-pmConfirmedTotal(order.orderId)):0,serviceType:order?(order.serviceType||'Printing service'):'Printing service',pages:order?order.pages:'',copies:order?order.copies:'',colorTier:order?order.colorTier:'',fileName:order?order.fileName:'',dateReceived:payment.dateReceived,recordedByName:payment.recordedByName,confirmedByName:payment.confirmedByName};
    pmReceipts[pmReceipts.length]=receipt;
}

function pmRenderQueue(){
    var body=document.getElementById('pmQueueBody');if(!body)return;
    var html='',i,p;
    for(i=0;i<pmQueue.length;i++){
        p=pmQueue[i];
        html+='<tr><td>#'+p.queueId+'</td><td>#'+p.orderId+'</td><td>'+pmEscape(p.customerName)+'</td><td>'+pmPeso(p.amount)+'</td><td>'+pmEscape(p.paymentMethod)+'</td><td>'+(p.isDownPayment?'Down payment':'Payment')+'</td><td>'+pmEscape(p.isRush?'Rush':'Regular')+'</td><td><button type="button" class="btn btn-primary btn-small" onclick="PaymentsModule.confirmPayment('+p.queueId+')">Confirm</button></td></tr>';
    }
    if(html==='')html='<tr><td colspan="8">No payments are waiting for confirmation.</td></tr>';
    body.innerHTML=html;
}

function pmRenderConfirmed(){
    var body=document.getElementById('pmConfirmedBody');if(!body)return;
    var html='',i,p,r;
    for(i=0;i<pmPayments.length;i++){
        p=pmPayments[i];r=pmReceiptForPayment(p.paymentId);
        html+='<tr><td>#'+p.orderId+'</td><td>'+pmEscape(p.customerName)+'</td><td>'+pmPeso(p.amount)+'</td><td>'+pmEscape(p.paymentMethod)+'</td><td>'+pmEscape(p.isRush?'Rush':'Regular')+'</td><td>'+pmEscape(p.confirmedByName||p.recordedByName)+'</td><td><button type="button" class="btn btn-secondary btn-small" onclick="PaymentsModule.printReceipt('+p.paymentId+')">Print receipt</button></td></tr>';
    }
    if(html==='')html='<tr><td colspan="7">No confirmed payments for the active view.</td></tr>';
    body.innerHTML=html;
}
function pmReceiptForPayment(paymentId){var i;for(i=0;i<pmReceipts.length;i++)if(Number(pmReceipts[i].paymentId)===Number(paymentId))return pmReceipts[i];return null;}

function pmPrintReceipt(paymentId){
    var r=pmReceiptForPayment(paymentId);if(!r)return;
    var w=window.open('','_blank','width=480,height=720');if(!w)return;
    var vat=pmMoney(r.orderTotal*12/112),before=pmMoney(r.orderTotal-vat);
    var html='<!doctype html><html><head><title>Receipt #'+r.receiptId+'</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:white;color:#111}.receipt{width:360px;margin:auto}.center{text-align:center}.line{border-top:1px dashed #777;margin:12px 0}.row{display:flex;justify-content:space-between;gap:20px;margin:6px 0}.total{font-size:20px;font-weight:bold}.small{font-size:12px;color:#555}</style></head><body><div class="receipt"><div class="center"><h2>Grea San Jave</h2><div>Printing Services</div><div>Payment Receipt #'+r.receiptId+'</div></div><div class="line"></div><div>Order: #'+r.orderId+'</div><div>Customer: '+pmEscape(r.customerName)+'</div><div>Service: '+pmEscape(r.serviceType)+'</div><div>File: '+pmEscape(r.fileName||'—')+'</div><div>Order type: '+pmEscape(r.isRush?'Rush':'Regular')+'</div><div class="line"></div><div class="row"><span>Order total</span><span>'+pmPeso(r.orderTotal)+'</span></div><div class="row"><span>VAT included (12%)</span><span>'+pmPeso(vat)+'</span></div><div class="row"><span>Before VAT</span><span>'+pmPeso(before)+'</span></div><div class="row total"><span>Payment received</span><span>'+pmPeso(r.amount)+'</span></div><div class="row"><span>Remaining balance</span><span>'+pmPeso(r.remainingBalance)+'</span></div><div class="row"><span>Method</span><span>'+pmEscape(r.paymentMethod)+'</span></div><div class="row"><span>Payment type</span><span>'+pmEscape(r.isDownPayment?'Down payment':'Full/regular payment')+'</span></div><div class="line"></div><div class="small">Recorded by: '+pmEscape(r.recordedByName||'—')+'</div><div class="small">Confirmed by: '+pmEscape(r.confirmedByName||'—')+'</div><div class="small">Received: '+pmEscape(r.dateReceived||'—')+'</div><div class="center small" style="margin-top:20px">Thank you.</div></div><script>window.onload=function(){window.print();};<\/script></body></html>';
    w.document.open();w.document.write(html);w.document.close();
}

function pmArchiveDay(){
    var u=pmUser();if(!pmIsOwner()){pmMessage('Only an owner/co-owner can archive the active day.','error');return;}
    var now=pmNow(),next=[],i,p,r;
    for(i=0;i<pmPayments.length;i++){p=pmPayments[i];p.archivedAt=now;p.archivedBy=u.userId;p.archivedByName=u.fullName;pmArchivedPayments[pmArchivedPayments.length]=p;}
    pmPayments=next;
    for(i=0;i<pmReceipts.length;i++){r=pmReceipts[i];r.archivedAt=now;r.archivedBy=u.userId;r.archivedByName=u.fullName;pmArchivedReceipts[pmArchivedReceipts.length]=r;}
    pmReceipts=[];
    pmRenderAll();
    if(window.SalesModule&&window.SalesModule.refresh)window.SalesModule.refresh();
    pmMessage('Confirmed payments and receipts were archived. Nothing was deleted.','success');
}

function pmUpdateCounters(){
    pmSetText('pmQueueCount',pmQueue.length);
    pmSetText('pmConfirmedCount',pmPayments.length);
    pmSetText('pmArchivedCount',pmArchivedPayments.length);
}
function pmRenderAll(){pmRefreshOrders();}

function pmDemoLoad(){
    window.GSJ.DEMO_MODE=true;
    if(!window.GSJ.currentUser)window.GSJ.currentUser={userId:3,fullName:'Carlo Santos',username:'carlo',role:'staff'};
    if(!window.GSJ.orders || window.GSJ.orders.length===0){
        window.GSJ.orders=[
            {orderId:101,customerName:'Ana Cruz',fileName:'thesis.pdf',serviceType:'Document Printing',pages:20,copies:5,colorTier:'Minimal Color',isRush:false,totalPrice:300,status:'done',paymentStatus:'unpaid',dateAdded:pmToday(),dateCompleted:pmToday()},
            {orderId:102,customerName:'Ben Santos',fileName:'research.pdf',serviceType:'Document Printing',pages:50,copies:1,colorTier:'Black Text',isRush:false,totalPrice:500,status:'done',paymentStatus:'unpaid',dateAdded:pmToday(),dateCompleted:pmToday()},
            {orderId:103,customerName:'Clara Reyes',fileName:'portfolio.pdf',serviceType:'Document Printing',pages:32,copies:2,colorTier:'Full Color',isRush:true,totalPrice:640,status:'done',paymentStatus:'unpaid',dateAdded:pmToday(),dateCompleted:pmToday()},
            {orderId:108,customerName:'Hannah Lim',fileName:'flyers.pdf',serviceType:'Document Printing',pages:60,copies:3,colorTier:'Full Color',isRush:true,totalPrice:3100,status:'done',paymentStatus:'unpaid',dateAdded:pmToday(),dateCompleted:pmToday()}
        ];
    }
    pmRefreshOrders();
    pmMessage('Demo orders loaded. In the real system these records will come from Module 6.','success');
}

function pmInit(){
    pmOrders=pmOrdersSource();
    if(!pmBound){
        var method=document.getElementById('pmPaymentMethod');if(method)method.addEventListener('change',pmUpdateProof);
        var form=document.getElementById('pmPaymentForm');if(form)form.addEventListener('submit',function(e){e.preventDefault();pmRecordPaymentFromForm();});
        pmBound=true;
    }
    pmRefreshOrders();
}

window.PaymentsModule={
    init:pmInit,
    refresh:pmRefreshOrders,
    openPayment:pmOpenPayment,
    closePayment:pmClosePayment,
    recordPayment:pmRecordPaymentFromForm,
    confirmPayment:pmConfirmPayment,
    printReceipt:pmPrintReceipt,
    archiveDay:pmArchiveDay,
    demoLoad:pmDemoLoad,
    getPayments:function(){return pmPayments;},
    getArchivedPayments:function(){return pmArchivedPayments;},
    getReceipts:function(){return pmReceipts;},
    getArchivedReceipts:function(){return pmArchivedReceipts;}
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pmInit);else pmInit();
})();
