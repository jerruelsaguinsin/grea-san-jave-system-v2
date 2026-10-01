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
   MODULE 9 — EXPENSE MANAGEMENT
   PROCEDURAL JAVASCRIPT VERSION

   CSS NOTE:
   Put anika.css in the <head> of the HTML page. This module contains NO CSS.

   ACCOUNT INTEGRATION NOTE:
   Your login/account module should set window.GSJ.currentUser before
   exInit(...) runs. Do NOT put the demo account switcher in this module.
   ======================================================================== */
(function(){
'use strict';

var exExpenses=[];
var exArchived=[];
var exUsers=[];
var exNextId=1;
var exBound=false;

function exCurrentUser(){if(window.GSJ&&window.GSJ.currentUser)return window.GSJ.currentUser;return null;}
function exIsOwner(){var u=exCurrentUser();return !!u && u.role==='coOwner';}
function exCategoryValid(category){return category==='Rent'||category==='Utilities'||category==='Supplies'||category==='Equipment Repair'||category==='Other';}
function exFind(id){var i;for(i=0;i<exExpenses.length;i++)if(Number(exExpenses[i].expenseId)===Number(id))return exExpenses[i];return null;}

function exSetDate(){var e=document.getElementById('exDate');if(e&&!e.value)e.value=gsTodayKey();}
function exRenderUser(){var u=exCurrentUser(),a=document.getElementById('exRecordedByName'),b=document.getElementById('pmRecordedBy');if(a)a.textContent=u?u.fullName:'—';if(b)b.textContent=u?u.fullName:'—';}

function exAddExpense(data){
    var u=exCurrentUser();
    if(!exCategoryValid(data.category))return gsFail('Please select a valid expense category.');
    if(!isFinite(data.amount)||data.amount<=0)return gsFail('Expense amount must be greater than zero.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data.dateIncurred||''))return gsFail('Please enter a valid expense date.');
    if(!u)return gsFail('No signed-in account is available to record this expense.');
    if(!data.description)return gsFail('Please enter a description for the expense.');
    var e={expenseId:exNextId++,category:data.category,amount:Number(data.amount),dateIncurred:data.dateIncurred,recordedBy:u.userId,recordedByName:u.fullName,description:data.description,createdAt:new Date().toISOString()};
    exExpenses[exExpenses.length]=e;return {ok:true,expense:e};
}

function exSubmit(){
    gsSetError('exFormError','');
    var result=exAddExpense({category:gsValue('exCategory'),amount:Number(gsValue('exAmount')),dateIncurred:gsValue('exDate'),description:gsValue('exDescription')});
    if(!result.ok){gsSetError('exFormError',result.error);gsToast(result.error,'error');return;}
    exRenderAll();var form=document.getElementById('exForm');if(form)form.reset();exSetDate();exRenderUser();if(window.SalesModule)window.SalesModule.refresh();gsToast('Expense recorded and added to the audit trail.','success');
}

function exArchive(id){
    if(!exIsOwner())return gsFail('Only an owner/co-owner can archive expense records.');
    var index=-1,i;for(i=0;i<exExpenses.length;i++)if(Number(exExpenses[i].expenseId)===Number(id)){index=i;break;}
    if(index<0)return gsFail('Expense not found.');
    var item=exExpenses[index],next=[];
    for(i=0;i<exExpenses.length;i++)if(i!==index)next[next.length]=exExpenses[i];
    exExpenses=next;
    var u=exCurrentUser();item.archivedAt=new Date().toISOString();item.archivedBy=u?u.userId:null;item.archivedByName=u?u.fullName:'Unknown';exArchived[exArchived.length]=item;
    exRenderAll();if(window.SalesModule)window.SalesModule.refresh();gsToast('Expense archived. The original record remains in history.','success');return {ok:true};
}

function exAllExpenses(){
    var all=[],i;for(i=0;i<exExpenses.length;i++)all[all.length]=exExpenses[i];for(i=0;i<exArchived.length;i++)all[all.length]=exArchived[i];return all;
}
function exTotal(){var all=exAllExpenses(),total=0,i;for(i=0;i<all.length;i++)total+=Number(all[i].amount||0);return total;}
function exVat(total){return Number(total||0)*12/112;}

function exRenderTotals(){
    var body=document.getElementById('exTotalsBody');if(!body)return;
    var names=['Rent','Utilities','Supplies','Equipment Repair','Other'],totals=[0,0,0,0,0],all=exAllExpenses(),i,j;
    for(i=0;i<all.length;i++){
        for(j=0;j<names.length;j++)if(all[i].category===names[j])totals[j]+=Number(all[i].amount||0);
    }
    var html='';for(i=0;i<names.length;i++)html+='<tr><td>'+gsEscapeHtml(names[i])+'</td><td style="text-align:right">'+gsFormatPeso(totals[i])+'</td><td style="text-align:right">'+gsFormatPeso(exVat(totals[i]))+'</td></tr>';
    body.innerHTML=html;
}

function exRenderGrand(){var total=exTotal(),a=document.getElementById('exGrandTotal'),b=document.getElementById('exGrandTax');if(a)a.textContent=gsFormatPeso(total);if(b)b.textContent=gsFormatPeso(exVat(total));}
function exRenderActive(){
    var body=document.getElementById('exTableBody');if(!body)return;if(exExpenses.length===0){body.innerHTML=gsEmptyRow(7,'No active expense records.');return;}
    var html='',i,e;for(i=exExpenses.length-1;i>=0;i--){e=exExpenses[i];html+='<tr><td>'+e.expenseId+'</td><td>'+gsEscapeHtml(e.dateIncurred)+'</td><td>'+gsEscapeHtml(e.category)+'</td><td>'+gsEscapeHtml(e.description)+'</td><td>'+gsFormatPeso(e.amount)+'</td><td>'+gsEscapeHtml(e.recordedByName||'Unknown')+'</td><td><button type="button" class="btn btn-secondary btn-small" data-archive-expense="'+e.expenseId+'">Archive</button></td></tr>';}
    body.innerHTML=html;
}
function exRenderArchive(){
    var body=document.getElementById('exArchiveBody');if(!body)return;if(exArchived.length===0){body.innerHTML=gsEmptyRow(8,'No archived expense records yet.');return;}
    var html='',i,e;for(i=exArchived.length-1;i>=0;i--){e=exArchived[i];html+='<tr><td>'+e.expenseId+'</td><td>'+gsEscapeHtml(e.dateIncurred)+'</td><td>'+gsEscapeHtml(e.category)+'</td><td>'+gsEscapeHtml(e.description)+'</td><td>'+gsFormatPeso(e.amount)+'</td><td>'+gsEscapeHtml(e.recordedByName||'Unknown')+'</td><td>'+gsEscapeHtml(e.archivedByName||'Unknown')+'</td><td>'+gsDateTime(e.archivedAt)+'</td></tr>';}
    body.innerHTML=html;
}
function exRenderAll(){exRenderTotals();exRenderGrand();exRenderActive();exRenderArchive();exRenderUser();}

function exBind(){
    if(exBound)return;exBound=true;
    var form=document.getElementById('exForm');if(form)form.addEventListener('submit',function(e){e.preventDefault();exSubmit();});
    document.addEventListener('click',function(e){var target=e.target;if(target&&target.getAttribute('data-archive-expense')){var result=exArchive(target.getAttribute('data-archive-expense'));if(!result.ok)gsToast(result.error,'error');}});
}
function exInit(seed){
    exExpenses=[];exArchived=[];exNextId=1;var i,e,copy;
    seed=seed||[];
    for(i=0;i<seed.length;i++){e=seed[i];copy={};for(var key in e)copy[key]=e[key];exExpenses[exExpenses.length]=copy;if(Number(copy.expenseId)>=exNextId)exNextId=Number(copy.expenseId)+1;}
    exBind();exSetDate();exRenderAll();
}
function exSetUsers(users){exUsers=users||[];exRenderUser();}
function exDemoArchive(id){return exArchive(id);}
window.exDemoArchive=function(id){return exDemoArchive(id);};
window.ExpensesModule={init:exInit,setUsers:exSetUsers,addExpense:exAddExpense,archive:exArchive,getAllExpenses:exAllExpenses,getTotal:exTotal,getVat:exVat,renderAll:exRenderAll,renderUser:exRenderUser,getActiveExpenses:function(){return exExpenses;},getArchivedExpenses:function(){return exArchived;}};
})();