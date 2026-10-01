/*
GREA SAN JAVE — MODULE 8 — SALES REPORTING
*/
(function(){
'use strict';
window.GSJ=window.GSJ||{};
var srOrders=[];
var srRows=[];
var srBound=false;

function srPad(n){return n<10?'0'+n:String(n);}
function srToday(){var d=new Date();return d.getFullYear()+'-'+srPad(d.getMonth()+1)+'-'+srPad(d.getDate());}
function srOffset(days){var d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+Number(days||0));return d.getFullYear()+'-'+srPad(d.getMonth()+1)+'-'+srPad(d.getDate());}
function srMoney(v){var n=Number(v||0);if(!isFinite(n))n=0;return Math.round(n*100)/100;}
function srPeso(v){var n=srMoney(v),neg=n<0;if(neg)n=-n;var whole=Math.floor(n),cent=Math.round((n-whole)*100),raw=String(whole),out='',i;if(cent===100){whole++;cent=0;raw=String(whole);}for(i=raw.length-1;i>=0;i--){out=raw[i]+out;if((raw.length-i)%3===0&&i!==0)out=','+out;}return neg?'₱-'+out+'.'+srPad(cent):'₱'+out+'.'+srPad(cent);}
function srEscape(v){var s=String(v==null?'':v),o='',i,c;for(i=0;i<s.length;i++){c=s[i];if(c==='&')o+='&amp;';else if(c==='<')o+='&lt;';else if(c==='>')o+='&gt;';else if(c==='"')o+='&quot;';else if(c==="'")o+='&#39;';else o+=c;}return o;}
function srDatePart(v){var s=String(v||'');var out='';var i;for(i=0;i<s.length&&i<10;i++)out+=s[i];return out;}
function srDateFromKey(key){return new Date(key+'T00:00:00');}
function srDateKey(d){return d.getFullYear()+'-'+srPad(d.getMonth()+1)+'-'+srPad(d.getDate());}
function srAddDays(key,n){var d=srDateFromKey(key);d.setDate(d.getDate()+n);return srDateKey(d);}
function srWeekStart(key){var d=srDateFromKey(key),day=d.getDay(),move=day===0?-6:1-day;d.setDate(d.getDate()+move);return srDateKey(d);}
function srGroupKey(date,period){if(period==='weekly')return srWeekStart(date);if(period==='monthly'){return date[0]+date[1]+date[2]+date[3]+'-'+date[5]+date[6];}return date;}
function srGroupLabel(key,period){if(period==='monthly')return key;if(period==='weekly')return key+' to '+srAddDays(key,6);return key;}
function srGetOrders(){if(window.GSJ&&window.GSJ.orders)return window.GSJ.orders;if(window.gsOrders)return window.gsOrders;return [];}
function srGetPayments(){
    var all=[],i,list;
    if(window.PaymentsModule&&window.PaymentsModule.getPayments){list=window.PaymentsModule.getPayments();for(i=0;i<list.length;i++)all[all.length]=list[i];}
    if(window.PaymentsModule&&window.PaymentsModule.getArchivedPayments){list=window.PaymentsModule.getArchivedPayments();for(i=0;i<list.length;i++)all[all.length]=list[i];}
    return all;
}
function srGetExpenses(){
    if(window.ExpensesModule&&window.ExpensesModule.getAllExpenses)return window.ExpensesModule.getAllExpenses();
    if(window.gsExpenses)return window.gsExpenses;
    return [];
}
function srMakeRow(key,period){return {key:key,label:srGroupLabel(key,period),orders:0,rush:0,gross:0,cash:0,expenses:0,net:0};}
function srFindRow(key){var i;for(i=0;i<srRows.length;i++)if(srRows[i].key===key)return i;return -1;}

function srBuild(from,to,period){
    var rows=[],count=0,cursor,key,i,o,date,pos,payments,expenses,p;
    if(period==='daily'){
        cursor=from;while(cursor<=to){rows[count]=srMakeRow(cursor,period);count++;cursor=srAddDays(cursor,1);}
    }else if(period==='weekly'){
        cursor=srWeekStart(from);var last=srWeekStart(to);while(cursor<=last){rows[count]=srMakeRow(cursor,period);count++;cursor=srAddDays(cursor,7);}
    }else{
        cursor=from[0]+from[1]+from[2]+from[3]+'-'+from[5]+from[6];var lastMonth=to[0]+to[1]+to[2]+to[3]+'-'+to[5]+to[6];
        while(cursor<=lastMonth){rows[count]=srMakeRow(cursor,period);count++;var md=srDateFromKey(cursor+'-01');md.setMonth(md.getMonth()+1);cursor=md.getFullYear()+'-'+srPad(md.getMonth()+1);}
    }
    srRows=rows;
    srOrders=srGetOrders();
    for(i=0;i<srOrders.length;i++){
        o=srOrders[i];if(!o)continue;if(String(o.status||'').toLowerCase()!=='done')continue;
        date=srDatePart(o.dateCompleted||o.dateAdded);if(date<from||date>to)continue;key=srGroupKey(date,period);pos=srFindRow(key);if(pos<0)continue;
        srRows[pos].orders++;srRows[pos].gross+=Number(o.totalPrice||0);if(o.isRush)srRows[pos].rush++;
    }
    payments=srGetPayments();
    for(i=0;i<payments.length;i++){p=payments[i];if(!p||String(p.status||'confirmed')!=='confirmed')continue;date=srDatePart(p.dateReceived||p.dateRecorded);if(date<from||date>to)continue;key=srGroupKey(date,period);pos=srFindRow(key);if(pos>=0)srRows[pos].cash+=Number(p.amount||0);}
    expenses=srGetExpenses();
    for(i=0;i<expenses.length;i++){p=expenses[i];if(!p)continue;date=srDatePart(p.dateIncurred);if(date<from||date>to)continue;key=srGroupKey(date,period);pos=srFindRow(key);if(pos>=0)srRows[pos].expenses+=Number(p.amount||0);}
    for(i=0;i<srRows.length;i++)srRows[i].net=srMoney(srRows[i].cash-srRows[i].expenses);
    return srRows;
}

function srSummary(){var o=0,r=0,g=0,c=0,e=0,i;for(i=0;i<srRows.length;i++){o+=srRows[i].orders;r+=srRows[i].rush;g+=srRows[i].gross;c+=srRows[i].cash;e+=srRows[i].expenses;}return {orders:o,rush:r,gross:srMoney(g),cash:srMoney(c),expenses:srMoney(e),net:srMoney(c-e)};}
function srText(id,value){var e=document.getElementById(id);if(e)e.textContent=value;}
function srInput(id){var e=document.getElementById(id);return e?e.value:'';}

function srRenderSummary(){var s=srSummary();srText('srCompleted',s.orders);srText('srRush',s.rush);srText('srGross',srPeso(s.gross));srText('srCash',srPeso(s.cash));srText('srExpenses',srPeso(s.expenses));srText('srNet',srPeso(s.net));}
function srRenderTable(){
    var body=document.getElementById('srTableBody');if(!body)return;var html='',i,r,has=0;
    for(i=0;i<srRows.length;i++){r=srRows[i];if(r.orders===0&&r.rush===0&&r.gross===0&&r.cash===0&&r.expenses===0)continue;has++;html+='<tr><td>'+srEscape(r.label)+'</td><td>'+r.orders+'</td><td>'+r.rush+'</td><td>'+srPeso(r.gross)+'</td><td>'+srPeso(r.cash)+'</td><td>'+srPeso(r.expenses)+'</td><td>'+srPeso(r.net)+'</td></tr>';}
    if(!has)html='<tr><td colspan="7">No sales, payments, or expenses were found for the selected date range.</td></tr>';
    body.innerHTML=html;
}
function srBarColor(kind){return kind==='expense'?'#E23B3B':'#6C4EE3';}
function srCreateChart(containerId,firstName,secondName,firstKey,secondKey,moneyMode){
    var box=document.getElementById(containerId);if(!box)return;box.innerHTML='';
    var scroll=document.createElement('div');scroll.className='chart-scroll';scroll.style.width='100%';scroll.style.overflowX='auto';scroll.style.overflowY='hidden';scroll.style.boxSizing='border-box';scroll.style.height='360px';
    var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');var width=srRows.length*120+100;if(width<900)width=900;var height=330;svg.setAttribute('width',String(width));svg.setAttribute('height',String(height));svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.style.display='block';
    var max=0,i,j,val,row;for(i=0;i<srRows.length;i++){val=Math.max(Number(srRows[i][firstKey]||0),Number(srRows[i][secondKey]||0));if(val>max)max=val;}if(max<=0)max=1;
    for(j=0;j<=4;j++){var gy=260-j*55;var line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1','50');line.setAttribute('x2',String(width-20));line.setAttribute('y1',String(gy));line.setAttribute('y2',String(gy));line.setAttribute('stroke','#dddddd');svg.appendChild(line);var lab=document.createElementNS('http://www.w3.org/2000/svg','text');lab.setAttribute('x','6');lab.setAttribute('y',String(gy+4));lab.setAttribute('font-size','11');lab.textContent=moneyMode?srPeso(max*j/4):String(Math.round(max*j/4));svg.appendChild(lab);}
    for(i=0;i<srRows.length;i++){
        row=srRows[i];var x=65+i*120,v1=Number(row[firstKey]||0),v2=Number(row[secondKey]||0),h1=v1/max*220,h2=v2/max*220;
        var b1=document.createElementNS('http://www.w3.org/2000/svg','rect');b1.setAttribute('x',String(x));b1.setAttribute('y',String(260-h1));b1.setAttribute('width','28');b1.setAttribute('height',String(h1));b1.setAttribute('fill',srBarColor(moneyMode?'sales':'count'));svg.appendChild(b1);
        var b2=document.createElementNS('http://www.w3.org/2000/svg','rect');b2.setAttribute('x',String(x+34));b2.setAttribute('y',String(260-h2));b2.setAttribute('width','28');b2.setAttribute('height',String(h2));b2.setAttribute('fill',srBarColor(moneyMode?'expense':'expense'));svg.appendChild(b2);
        var t1=document.createElementNS('http://www.w3.org/2000/svg','text');t1.setAttribute('x',String(x+14));t1.setAttribute('y',String(Math.max(14,255-h1)));t1.setAttribute('text-anchor','middle');t1.setAttribute('font-size','10');t1.textContent=moneyMode?srPeso(v1):String(v1);svg.appendChild(t1);
        var t2=document.createElementNS('http://www.w3.org/2000/svg','text');t2.setAttribute('x',String(x+48));t2.setAttribute('y',String(Math.max(14,255-h2)));t2.setAttribute('text-anchor','middle');t2.setAttribute('font-size','10');t2.textContent=moneyMode?srPeso(v2):String(v2);svg.appendChild(t2);
        var dl=document.createElementNS('http://www.w3.org/2000/svg','text');dl.setAttribute('x',String(x+31));dl.setAttribute('y','285');dl.setAttribute('text-anchor','middle');dl.setAttribute('font-size','10');dl.textContent=row.label;svg.appendChild(dl);
    }
    scroll.appendChild(svg);box.appendChild(scroll);
    scroll.addEventListener('wheel',function(e){if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){scroll.scrollLeft+=e.deltaY;e.preventDefault();}else if(e.deltaX!==0){scroll.scrollLeft+=e.deltaX;e.preventDefault();}} ,{passive:false});
}
function srRenderCharts(){srCreateChart('srRevenueChart','Gross sales','Expenses','gross','expenses',true);srCreateChart('srOrdersChart','Completed','Rush','orders','rush',false);}
function srGenerate(){
    var from=srInput('srFrom')||srOffset(-14),to=srInput('srTo')||srToday(),period=srInput('srPeriod')||'daily';if(from>to){var x=from;from=to;to=x;}
    srBuild(from,to,period);srRenderSummary();srRenderTable();srRenderCharts();srRenderPrint(from,to);return srRows;
}
function srRenderPrint(from,to){var s=srSummary();srText('srPrintRange','Report period: '+from+' to '+to);srText('srPrintOrders',s.orders);srText('srPrintRush',s.rush);srText('srPrintGross',srPeso(s.gross));srText('srPrintCash',srPeso(s.cash));srText('srPrintExpenses',srPeso(s.expenses));srText('srPrintNet',srPeso(s.net));}
function srPrint(){var area=document.getElementById('salesReportPrintArea');if(!area)return;var w=window.open('','_blank');if(!w)return;w.document.open();w.document.write('<!doctype html><html><head><title>Grea San Jave Sales Report</title><link rel="stylesheet" href="anika.css"></head><body>'+area.outerHTML+'</body></html>');w.document.close();setTimeout(function(){w.print();},400);}
function srRefresh(){srGenerate();}
function srInit(){
    srOrders=srGetOrders();
    if(!srBound){var b=document.getElementById('btnSrGenerate');if(b)b.addEventListener('click',function(){srGenerate();});var p=document.getElementById('btnSrPrint');if(p)p.addEventListener('click',srPrint);srBound=true;}
    if(!srInput('srFrom')){var f=document.getElementById('srFrom');if(f)f.value=srOffset(-14);}if(!srInput('srTo')){var t=document.getElementById('srTo');if(t)t.value=srToday();}
    srGenerate();
}
window.SalesModule={init:srInit,refresh:srRefresh,generateReport:srGenerate,setOrderProvider:function(){},getRows:function(){return srRows;}};
window.srDemoRefresh=srRefresh;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',srInit);else srInit();
})();
