import { AvivRatioChart } from './components/AvivRatioChart';
import './App.css';

function App() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-container">
            <div className="logo-icon">BTC_OSC</div>
            <h1 className="logo-text">QUANT.VALUATION.SYSTEM</h1>
          </div>
          <nav className="header-nav">
            <a href="#" className="nav-link active">SYS.DASHBOARD</a>
            <a href="#" className="nav-link">DAT.METRICS</a>
            <a href="#" className="nav-link">MDL.MODELS</a>
          </nav>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <section className="chart-section">
            <AvivRatioChart />
          </section>
          
          <section className="info-section">
            <div className="info-card">
              <h3>SYSTEM.INFO // AVIV_RATIO</h3>
              <p>
                ACTIVE_VALUE_TO_INVESTOR_VALUE (AVIV) RATIO is a robust on-chain metric based on cointime economics. 
                Computes Active Capital relative to total Investor Capital. Z-Score normalization bounds cycle extremes.
                Use the playground above to recalibrate [-2, +2] threshold matrices.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
