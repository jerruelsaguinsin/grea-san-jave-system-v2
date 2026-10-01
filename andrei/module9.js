/*
GREA SAN JAVE — MODULE 9 — EXPENSE MANAGEMENT
*/
(function(){
'use strict';
window.GSJ=window.GSJ||{};
var exActive=[];
var exArchived=[];
var exNextId=1;
var exBound=false;

function exPad(n){return n<10?'0'+n:String(n);}
function exToday(){var d=new Date();return d.getFullYear()+'-'+exPad(d.getMonth()+1)+'-'+exPad(d.getDate());}
function exMoney(v){var n=Number(v||0);if(!isFinite(n))n=0;return Math.round(n*100)/100;}
function exPeso(v){var n=exMoney(v),neg=n<0;if(neg)n=-n;var whole=Math.floor(n),cent=Math.round((n-whole)*100),raw=String(whole),out='',i;if(cent===100){whole++;cent=0;raw=String(whole);}for(i=raw.length-1;i>=0;i--){out=raw[i]+out;if((raw.length-i)%3===0&&i!==0)out=','+out;}return neg?'₱-'+out+'.'+exPad(cent):'₱'+out+'.'+exPad(cent);}
function exEscape(v){var s=String(v==null?'':v),o='',i,c;for(i=0;i<s.length;i++){c=s[i];if(c==='&')o+='&amp;';else if(c==='<')o+='&lt;';else if(c==='>')o+='&gt;';else if(c==='"')o+='&quot;';else if(c==="'")o+='&#39;';else o+=c;}return o;}
function exUser(){return window.GSJ&&window.GSJ.currentUser?window.GSJ.currentUser:null;}
function exOwner(){var u=exUser();return !!u&&(u.role==='owner'||u.role==='coOwner'||u.role==='ownerAdmin');}
function exVat(v){return exMoney(Number(v||0)*12/112);}
function exBeforeVat(v){return exMoney(Number(v||0)-exVat(v));}
function exMessage(text,type){var e=document.getElementById('exMessage');if(e){e.textContent=text||'';e.className='field-message '+(type==='error'?'error':'success');}}
function exRenderUser(){var e=document.getElementById('exRecordedByName');var u=exUser();if(e)e.textContent=u?u.fullName:'Not signed in';}
function exRender(){
    var body=document.getElementById('exTableBody');if(!body)return;var html='',i,e;
    for(i=0;i<exActive.length;i++){e=exActive[i];html+='<tr><td>#'+e.expenseId+'</td><td>'+exEscape(e.dateIncurred)+'</td><td>'+exEscape(e.category)+'</td><td>'+exEscape(e.description)+'</td><td>'+exPeso(e.amount)+'</td><td>'+exEscape(e.recordedByName)+'</td><td><button type="button" class="btn btn-secondary btn-small" onclick="ExpensesModule.archive('+e.expenseId+')">Archive</button></td></tr>';}
    if(html==='')html='<tr><td colspan="7">No active expense records.</td></tr>';body.innerHTML=html;
    var total=0;for(i=0;i<exActive.length;i++)total+=Number(exActive[i].amount||0);var grand=document.getElementById('exGrandTotal');if(grand)grand.textContent=exPeso(total);var count=document.getElementById('exActiveCount');if(count)count.textContent=exActive.length;
}
function exRecord(){
    var u=exUser();if(!u){exMessage('Please sign in before recording an expense.','error');return;}
    var category=document.getElementById('exCategory'),amount=document.getElementById('exAmount'),date=document.getElementById('exDate'),description=document.getElementById('exDescription');
    var value=Number(amount?amount.value:0);if(value<=0){exMessage('Expense amount must be greater than zero.','error');return;}if(!date||!date.value){exMessage('Please enter the expense date.','error');return;}if(!description||description.value===''){exMessage('Please enter a description.','error');return;}
    var e={expenseId:exNextId++,category:category?category.value:'Other',amount:exMoney(value),dateIncurred:date.value,description:description.value,recordedBy:u.userId,recordedByName:u.fullName,vatIncluded:true,vatAmount:exVat(value),beforeVat:exBeforeVat(value)};
    exActive[exActive.length]=e;exRender();exMessage('Expense recorded successfully.','success');if(amount)amount.value='';if(description)description.value='';if(window.SalesModule&&window.SalesModule.refresh)window.SalesModule.refresh();
}
function exArchive(id){
    if(!exOwner()){exMessage('Only an owner/co-owner can archive an expense. Records are never deleted.','error');return;}
    var u=exUser(),next=[],moved=null,i,e;for(i=0;i<exActive.length;i++){e=exActive[i];if(Number(e.expenseId)===Number(id)){moved=e;}else next[next.length]=e;}if(!moved)return;exActive=next;moved.archivedAt=new Date().toISOString();moved.archivedBy=u.userId;moved.archivedByName=u.fullName;exArchived[exArchived.length]=moved;exRender();exMessage('Expense archived. The record remains available for reporting/history.','success');if(window.SalesModule&&window.SalesModule.refresh)window.SalesModule.refresh();
}
function exArchiveAll(){
    if(!exOwner()){exMessage('Only an owner/co-owner can archive the active expenses.','error');return;}
    var u=exUser(),i,e;for(i=0;i<exActive.length;i++){e=exActive[i];e.archivedAt=new Date().toISOString();e.archivedBy=u.userId;e.archivedByName=u.fullName;exArchived[exArchived.length]=e;}exActive=[];exRender();exMessage('Active expenses archived. Nothing was deleted.','success');if(window.SalesModule&&window.SalesModule.refresh)window.SalesModule.refresh();
}
function exLoadDemo(){
    window.GSJ.DEMO_MODE=true;if(!window.GSJ.currentUser)window.GSJ.currentUser={userId:3,fullName:'Carlo Santos',username:'carlo',role:'staff'};if(exActive.length>0)return;
    exActive[0]={expenseId:1,category:'Rent',amount:3000,dateIncurred:exToday(),description:'Monthly stall rent',recordedBy:1,recordedByName:'Margie (Co-owner)',vatIncluded:true,vatAmount:exVat(3000),beforeVat:exBeforeVat(3000)};
    exActive[1]={expenseId:2,category:'Utilities',amount:850,dateIncurred:exToday(),description:'Electricity',recordedBy:1,recordedByName:'Margie (Co-owner)',vatIncluded:true,vatAmount:exVat(850),beforeVat:exBeforeVat(850)};
    exActive[2]={expenseId:3,category:'Supplies',amount:1200,dateIncurred:exToday(),description:'Bond paper',recordedBy:2,recordedByName:'Grea (Co-owner)',vatIncluded:true,vatAmount:exVat(1200),beforeVat:exBeforeVat(1200)};
    exNextId=4;exRender();exMessage('Demo expenses loaded.','success');if(window.SalesModule&&window.SalesModule.refresh)window.SalesModule.refresh();
}
function exInit(){
    exRenderUser();
    if(!exBound){var form=document.getElementById('exForm');if(form)form.addEventListener('submit',function(e){e.preventDefault();exRecord();});var date=document.getElementById('exDate');if(date&&!date.value)date.value=exToday();exBound=true;}
    exRender();
}
window.ExpensesModule={init:exInit,record:exRecord,archive:exArchive,archiveAll:exArchiveAll,demoLoad:exLoadDemo,getAllExpenses:function(){var all=[],i;for(i=0;i<exActive.length;i++)all[all.length]=exActive[i];for(i=0;i<exArchived.length;i++)all[all.length]=exArchived[i];return all;},getActiveExpenses:function(){return exActive;},getArchivedExpenses:function(){return exArchived;}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',exInit);else exInit();
})();
