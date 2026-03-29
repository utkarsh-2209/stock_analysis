import YahooFinance from 'yahoo-finance2';
import fs from 'fs';
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const summary = await yahooFinance.quoteSummary('RELIANCE.NS', { 
      modules: ['balanceSheetHistory', 'cashflowStatementHistory', 'financialData'] 
    });
    
    const bs = summary.balanceSheetHistory?.balanceSheetStatements?.[0] || {};
    const cf = summary.cashflowStatementHistory?.cashflowStatements?.[0] || {};
    const fd = summary.financialData || {};
    
    fs.writeFileSync('output.json', JSON.stringify({
      currentAssets: bs.totalCurrentAssets,
      currentLiabilities: bs.totalCurrentLiabilities,
      operatingCashflowKey: 'operatingCashflow' in cf,
      operatingCashflow: cf.totalCashFromOperatingActivities,
      capitalExpenditures: cf.capitalExpenditures,
      freeCashflow: cf.totalCashFromOperatingActivities + (cf.capitalExpenditures || 0)
    }, null, 2));
  } catch(e) { console.error(e) }
}
test();
