import * as yfn from 'yahoo-finance2';
const yahooFinance = yfn.default || yfn;

async function test() {
  try {
    const summary = await yahooFinance.quoteSummary('RELIANCE.NS', { 
      modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'] 
    });
    console.log(JSON.stringify(summary, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
