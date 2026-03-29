import YahooFinance from 'yahoo-finance2';
import fs from 'fs';
const yahooFinance = new YahooFinance();

async function test() {
  const summary = await yahooFinance.quoteSummary('RELIANCE.NS', { 
    modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'] 
  });
  
  const dks = summary.defaultKeyStatistics || {};
  const sd = summary.summaryDetail || {};
  
  fs.writeFileSync('output.json', JSON.stringify({
    dksKeys: Object.keys(dks),
    sdKeys: Object.keys(sd)
  }, null, 2));
}
test();
