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
   MODULE 8 — SALES REPORTING
   PROCEDURAL JAVASCRIPT VERSION

   CSS NOTE:
   Put anika.css in the <head> of the HTML page. This module contains NO CSS.

   ACCOUNT INTEGRATION NOTE:
   The report does not switch accounts. Your login/account module controls
   window.GSJ.currentUser.
   ======================================================================== */
(function(){
'use strict';

var srOrders=[];
var srExpenseProvider=function(){return [];};
var srPaymentProvider=function(){return [];};
var srRows=[];
var srBound=false;
var srBoundChartWheel=false;

function srSetText(id,value){var e=document.getElementById(id);if(e)e.textContent=value;}
function srMakeRow(key){return {reportDate:key,totalOrders:0,totalRushOrders:0,totalSales:0,totalRevenue:0,totalExpenses:0,netCash:0};}
function srHasGroup(groups,count,key){var i;for(i=0;i<count;i++)if(groups[i].reportDate===key)return i;return -1;}
function srDateFromKey(key){return new Date(key+'T00:00:00');}
function srDateKey(date){var y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate();return y+'-'+(m<10?'0':'')+m+'-'+(d<10?'0':'')+d;}
function srWeekStart(key){var d=srDateFromKey(key),day=d.getDay();var move=day===0?-6:1-day;d.setDate(d.getDate()+move);return srDateKey(d);}
function srGroupKey(dateKey,period){if(period==='monthly')return dateKey.substring(0,7);if(period==='weekly')return srWeekStart(dateKey);return dateKey;}
function srAddDays(key,amount){var d=srDateFromKey(key);d.setDate(d.getDate()+amount);return srDateKey(d);}
function srPeriodEnd(start,period){if(period==='daily')return start;if(period==='weekly')return srAddDays(start,6);var d=srDateFromKey(start+'-01');d.setMonth(d.getMonth()+1);d.setDate(0);return srDateKey(d);}
function srDateInRange(date,from,to){return date>=from && date<=to;}

function srBuildRows(from,to,period){
    var groups=[],groupCount=0,i,o,date,key,pos,payments,expenses,p;
    /* Create every period in the requested range first. This keeps the graph aligned. */
    if(period==='daily'){
        var cursor=from;
        while(cursor<=to){groups[groupCount]=srMakeRow(cursor);groupCount++;cursor=srAddDays(cursor,1);}
    }else if(period==='weekly'){
        var first=srWeekStart(from),last=srWeekStart(to),wcursor=first;
        while(wcursor<=last){groups[groupCount]=srMakeRow(wcursor);groupCount++;wcursor=srAddDays(wcursor,7);}
    }else{
        var monthCursor=from.substring(0,7),monthLast=to.substring(0,7);
        while(monthCursor<=monthLast){groups[groupCount]=srMakeRow(monthCursor);groupCount++;var md=srDateFromKey(monthCursor+'-01');md.setMonth(md.getMonth()+1);monthCursor=md.getFullYear()+'-'+((md.getMonth()+1)<10?'0':'')+(md.getMonth()+1);}
    }

    for(i=0;i<srOrders.length;i++){
        o=srOrders[i];if(!o || o.status!=='done')continue;
        date=String(o.dateCompleted||o.dateAdded||'').substring(0,10);if(!srDateInRange(date,from,to))continue;
        key=srGroupKey(date,period);pos=srHasGroup(groups,groupCount,key);if(pos<0)continue;
        groups[pos].totalOrders++;
        if(o.isRush)groups[pos].totalRushOrders++;
        groups[pos].totalSales+=Number(o.totalPrice||0);
    }

    payments=srPaymentProvider()||[];
    for(i=0;i<payments.length;i++){
        p=payments[i];date=String(p.dateReceived||'').substring(0,10);if(!srDateInRange(date,from,to))continue;
        key=srGroupKey(date,period);pos=srHasGroup(groups,groupCount,key);if(pos>=0)groups[pos].totalRevenue+=Number(p.amount||0);
    }

    expenses=srExpenseProvider()||[];
    for(i=0;i<expenses.length;i++){
        var ex=expenses[i];date=String(ex.dateIncurred||'').substring(0,10);if(!srDateInRange(date,from,to))continue;
        key=srGroupKey(date,period);pos=srHasGroup(groups,groupCount,key);if(pos>=0)groups[pos].totalExpenses+=Number(ex.amount||0);
    }
    for(i=0;i<groupCount;i++)groups[i].netCash=groups[i].totalRevenue-groups[i].totalExpenses;
    return groups;
}

function srGenerate(){
    srOrders=window.gsOrders||srOrders;
    var from=gsValue('srFrom')||gsOffsetKey(-14),to=gsValue('srTo')||gsTodayKey(),period=gsValue('srPeriod')||'daily';
    if(from>to){var swap=from;from=to;to=swap;}
    srRows=srBuildRows(from,to,period);
    srRenderTable();srRenderCharts();srRenderPrint(from,to);
    return srRows;
}

function srRowsHaveData(){
    var i,r;
    for(i=0;i<srRows.length;i++){
        r=srRows[i];
        if(r.totalOrders>0 || r.totalRushOrders>0 || r.totalSales>0 || r.totalRevenue>0 || r.totalExpenses>0) return true;
    }
    return false;
}

function srRenderTable(){
    var body=document.getElementById('srTableBody');if(!body)return;
    if(!srRowsHaveData()){
        body.innerHTML=gsEmptyRow(7,'No dates or records were found for the selected date range.');
        return;
    }
    var html='',i,r;
    for(i=0;i<srRows.length;i++){
        r=srRows[i];
        if(r.totalOrders===0 && r.totalRushOrders===0 && r.totalSales===0 && r.totalRevenue===0 && r.totalExpenses===0) continue;
        html+='<tr><td>'+gsEscapeHtml(r.reportDate)+'</td><td>'+r.totalOrders+'</td><td>'+r.totalRushOrders+'</td><td>'+gsFormatPeso(r.totalSales)+'</td><td>'+gsFormatPeso(r.totalRevenue)+'</td><td>'+gsFormatPeso(r.totalExpenses)+'</td><td>'+gsFormatPeso(r.netCash)+'</td></tr>';
    }
    body.innerHTML=html||gsEmptyRow(7,'No dates or records were found for the selected date range.');
}

function srSummary(){
    var orders=0,rush=0,sales=0,revenue=0,expenses=0,i,o,from=gsValue('srFrom'),to=gsValue('srTo');
    for(i=0;i<srRows.length;i++){orders+=srRows[i].totalOrders;rush+=srRows[i].totalRushOrders;revenue+=srRows[i].totalRevenue;expenses+=srRows[i].totalExpenses;}
    for(i=0;i<srOrders.length;i++){o=srOrders[i];if(!o||o.status!=='done')continue;var d=String(o.dateCompleted||o.dateAdded||'').substring(0,10);if(d>=from&&d<=to)sales+=Number(o.totalPrice||0);}
    return {orders:orders,rush:rush,sales:sales,revenue:revenue,expenses:expenses,net:revenue-expenses};
}

function srRenderPrint(from,to){
    var s=srSummary();
    srSetText('srPrintRange','Report period: '+from+' to '+to);
    var summary=document.getElementById('srPrintSummary');
    if(summary)summary.innerHTML='<div class="summary-cell"><small>Completed orders</small><strong>'+s.orders+'</strong></div><div class="summary-cell"><small>Rush orders</small><strong>'+s.rush+'</strong></div><div class="summary-cell"><small>Gross sales</small><strong>'+gsFormatPeso(s.sales)+'</strong></div><div class="summary-cell"><small>Cash revenue</small><strong>'+gsFormatPeso(s.revenue)+'</strong></div><div class="summary-cell"><small>Expenses</small><strong>'+gsFormatPeso(s.expenses)+'</strong></div><div class="summary-cell"><small>Net cash</small><strong>'+gsFormatPeso(s.net)+'</strong></div>';
}

function srGraphLabel(value,period){
    if(period==='monthly') return value;
    return value.substring(5);
}

function srMakeSvgStart(title,maxValue,unit,rowCount){
    var w=900;
    if(rowCount>8) w=100+rowCount*88;
    var h=330,left=62,right=30,top=28,bottom=70,innerH=h-top-bottom;
    var svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+title+'">';
    var y,i,value;
    for(i=0;i<=4;i++){
        value=maxValue*(i/4);y=top+innerH-(innerH*(i/4));
        svg+='<line x1="'+left+'" y1="'+y+'" x2="'+(w-right)+'" y2="'+y+'" stroke="#ddd" stroke-width="1"></line>';
        svg+='<text x="'+(left-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="#555">'+(unit==='peso'?gsFormatPeso(value):Math.round(value))+'</text>';
    }
    return {svg:svg,w:w,h:h,left:left,right:right,top:top,bottom:bottom,innerH:innerH};
}

function srRenderRevenueChart(){
    var el=document.getElementById('srRevenueChart');if(!el)return;
    if(!srRowsHaveData()){el.innerHTML='<div class="empty-row" style="padding:3rem;text-align:center">No sales, payment, or expense records were found for these dates.</div>';return;}
    var max=1,i,r;
    for(i=0;i<srRows.length;i++){r=srRows[i];if(r.totalSales>max)max=r.totalSales;if(r.totalExpenses>max)max=r.totalExpenses;}
    if(max<100)max=100;else max=Math.ceil(max/100)*100;
    var chart=srMakeSvgStart('Gross Sales vs Expenses',max,'peso',srRows.length);
    var step=(chart.w-chart.left-chart.right)/srRows.length;
    var barW=step/4;if(barW>26)barW=26;
    var base=chart.top+chart.innerH,svg=chart.svg,period=gsValue('srPeriod')||'daily';
    for(i=0;i<srRows.length;i++){
        r=srRows[i];var center=chart.left+step*i+step/2,x1=center-barW-3,x2=center+3;
        var h1=r.totalSales/max*chart.innerH,h2=r.totalExpenses/max*chart.innerH;
        var y1=base-h1,y2=base-h2;
        svg+='<rect x="'+x1+'" y="'+y1+'" width="'+barW+'" height="'+(h1>1?h1:1)+'" rx="3" fill="#6C4EE3"></rect>';
        svg+='<rect x="'+x2+'" y="'+y2+'" width="'+barW+'" height="'+(h2>1?h2:1)+'" rx="3" fill="#E23B3B"></rect>';
        svg+='<text x="'+(x1+barW/2)+'" y="'+(y1>22?y1-7:15)+'" text-anchor="middle" font-size="10" font-weight="700" fill="#333">'+gsShortMoney(r.totalSales)+'</text>';
        svg+='<text x="'+(x2+barW/2)+'" y="'+(y2>22?y2-7:15)+'" text-anchor="middle" font-size="10" font-weight="700" fill="#333">'+gsShortMoney(r.totalExpenses)+'</text>';
        svg+='<text x="'+center+'" y="'+(chart.h-42)+'" text-anchor="middle" font-size="10" fill="#555">'+gsEscapeHtml(srGraphLabel(r.reportDate,period))+'</text>';
    }
    svg+='</svg>';el.innerHTML=svg;
    var rendered=el.querySelector('svg');
    if(rendered){rendered.style.width=chart.w+'px';rendered.style.minWidth=chart.w+'px';}
    srCreateChartScrollBar(el,chart.w);
}

function srRenderOrdersChart(){
    var el=document.getElementById('srOrdersChart');if(!el)return;
    if(!srRowsHaveData()){el.innerHTML='<div class="empty-row" style="padding:3rem;text-align:center">No order records were found for these dates.</div>';return;}
    var max=1,i,r;
    for(i=0;i<srRows.length;i++){r=srRows[i];if(r.totalOrders>max)max=r.totalOrders;}
    var chart=srMakeSvgStart('Completed vs Rush Orders',max,'count',srRows.length);
    var step=(chart.w-chart.left-chart.right)/srRows.length,barW=step/4;
    if(barW>26)barW=26;
    var base=chart.top+chart.innerH,svg=chart.svg,period=gsValue('srPeriod')||'daily';
    for(i=0;i<srRows.length;i++){
        r=srRows[i];var center=chart.left+step*i+step/2,x1=center-barW-3,x2=center+3;
        var h1=r.totalOrders/max*chart.innerH,h2=r.totalRushOrders/max*chart.innerH,y1=base-h1,y2=base-h2;
        svg+='<rect x="'+x1+'" y="'+y1+'" width="'+barW+'" height="'+(h1>1?h1:1)+'" rx="3" fill="#6C4EE3"></rect>';
        svg+='<rect x="'+x2+'" y="'+y2+'" width="'+barW+'" height="'+(h2>1?h2:1)+'" rx="3" fill="#E23B3B"></rect>';
        svg+='<text x="'+(x1+barW/2)+'" y="'+(y1>22?y1-7:15)+'" text-anchor="middle" font-size="10" font-weight="700" fill="#333">'+r.totalOrders+'</text>';
        svg+='<text x="'+(x2+barW/2)+'" y="'+(y2>22?y2-7:15)+'" text-anchor="middle" font-size="10" font-weight="700" fill="#333">'+r.totalRushOrders+'</text>';
        svg+='<text x="'+center+'" y="'+(chart.h-42)+'" text-anchor="middle" font-size="10" fill="#555">'+gsEscapeHtml(srGraphLabel(r.reportDate,period))+'</text>';
    }
    svg+='</svg>';el.innerHTML=svg;
    var rendered=el.querySelector('svg');
    if(rendered){rendered.style.width=chart.w+'px';rendered.style.minWidth=chart.w+'px';}
    srCreateChartScrollBar(el,chart.w);
}

function srRenderCharts(){srRenderRevenueChart();srRenderOrdersChart();}

function srCreateChartScrollBar(chartElement,contentWidth){
    if(!chartElement)return;
    var old=document.getElementById(chartElement.id+'Scroll');
    if(old && old.parentNode)old.parentNode.removeChild(old);

    var track=document.createElement('div');
    track.id=chartElement.id+'Scroll';
    track.className='chart-scroll-track';
    track.setAttribute('aria-label','Horizontal chart scrollbar. Drag left or right to view more dates.');

    var spacer=document.createElement('div');
    spacer.className='chart-scroll-spacer';
    spacer.style.width=contentWidth+'px';
    track.appendChild(spacer);

    if(chartElement.parentNode){
        chartElement.parentNode.insertBefore(track,chartElement.nextSibling);
    }

    track.addEventListener('scroll',function(){
        var svg=chartElement.querySelector('svg');
        if(svg)svg.style.transform='translateX(-'+track.scrollLeft+'px)';
    });

    track.addEventListener('wheel',function(event){
        var max=track.scrollWidth-track.clientWidth;
        var delta=event.deltaX;
        if(delta===0)delta=event.deltaY;
        if(max<=0 || delta===0)return;
        var next=track.scrollLeft+delta;
        if(next<0)next=0;
        if(next>max)next=max;
        track.scrollLeft=next;
        if(event.cancelable)event.preventDefault();
    },{passive:false});
}

function srBindChartWheel(){
    /*
      MODULE 8 CHART SCROLLING
      The visible scrollbar below each graph is the primary control.
      The mouse wheel also moves that scrollbar left/right.
      The chart stays inside its card instead of overflowing the design.
    */
    var chartIds=['srRevenueChart','srOrdersChart'];
    var i,wrap;
    for(i=0;i<chartIds.length;i++){
        wrap=document.getElementById(chartIds[i]);
        if(!wrap)continue;
        wrap.setAttribute('aria-label','Sales graph. Use the horizontal scrollbar below the graph or the mouse wheel to move left and right.');
        wrap.addEventListener('wheel',function(event){
            var track=null;
            if(this.nextElementSibling && this.nextElementSibling.className==='chart-scroll-track'){track=this.nextElementSibling;}
            if(!track)return;
            var max=track.scrollWidth-track.clientWidth;
            if(max<=0)return;
            var delta=event.deltaX;
            if(delta===0)delta=event.deltaY;
            if(delta===0)return;
            var next=track.scrollLeft+delta;
            if(next<0)next=0;
            if(next>max)next=max;
            track.scrollLeft=next;
            if(event.cancelable)event.preventDefault();
        },{passive:false});
    }
}

function srPrint(){window.print();}
function srRefresh(){srOrders=window.gsOrders||srOrders;return srGenerate();}
function srSetOrders(orders){srOrders=orders||[];srGenerate();}
function srSetExpenseProvider(fn){srExpenseProvider=typeof fn==='function'?fn:function(){return [];};}
function srSetPaymentProvider(fn){srPaymentProvider=typeof fn==='function'?fn:function(){return [];};}
function srBind(){
    if(srBound)return;srBound=true;
    var b=document.getElementById('btnSrGenerate');if(b)b.addEventListener('click',srGenerate);
    var p=document.getElementById('btnSrPrint');if(p)p.addEventListener('click',srPrint);
    srBindChartWheel();
}
function srInit(orders){srOrders=orders||[];srBind();var f=document.getElementById('srFrom'),t=document.getElementById('srTo');if(f&&!f.value)f.value=gsOffsetKey(-14);if(t&&!t.value)t.value=gsTodayKey();srGenerate();}

/* DEMO TOOL HOOKS — data/reset stays in the separate demo bootstrap. */
window.srDemoRefresh=function(){return srRefresh();};

window.SalesModule={init:srInit,setOrders:srSetOrders,setExpenseProvider:srSetExpenseProvider,setPaymentProvider:srSetPaymentProvider,refresh:srRefresh,generateReport:srGenerate};
})();