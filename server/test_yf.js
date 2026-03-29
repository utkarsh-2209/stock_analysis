import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const summary = await yahooFinance.quoteSummary('RELIANCE.NS', { 
      modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail', 'price'] 
    });
    
    const fd = summary.financialData || {};
    const dks = summary.defaultKeyStatistics || {};
    const sd = summary.summaryDetail || {};

    console.log({
      roe: fd.returnOnEquity,
      debtToEquity: fd.debtToEquity,
      revenueGrowth: fd.revenueGrowth,
      profitMargin: fd.profitMargins,
      operatingMargin: fd.operatingMargins,
      currentRatio: fd.currentRatio,
      freeCashflow: fd.freeCashflow,
      operatingCashflow: fd.operatingCashflow,
      totalRevenue: fd.totalRevenue,
      bookValue: dks.bookValue,
      priceToBook: dks.priceToBook,
      fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: sd.fiftyTwoWeekLow
    });
  } catch(e) {
    console.error(e);
  }
}
test();
