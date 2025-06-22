import React from 'react'; // You might have this, or it might be `import React from 'react'`
import { useState } from 'react';
import RealmStatusDisplay from './components/RealmStatusDisplay.jsx';
import 'bulma/css/bulma.min.css';
import './App.css'

const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;
const API_CONFIGS = {
  US: {
    baseUrl: 'https://us.api.blizzard.com',
    namespace: 'dynamic-us',
    locale: 'en_US'
  },
  EU: {
    baseUrl: 'https://eu.api.blizzard.com',
    namespace: 'dynamic-eu',
    locale: 'en_GB'
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('EU');

  return (
    <>
      <header className="hero is-primary is-large">
        <div className="hero-body has-text-centered has-text-white">
          <p className="title is-1">Azeroth Codex</p>
          <p className="subtitle is-4">Unlocking the secrets of Azeroth's data.</p>
        </div>
      </header>

      <main className="section">
        <div className="container">
          <section className="section has-text-centered">
            <h2 className="title is-2">Realm Status</h2>
            <p className="subtitle is-5">Check the live status of World of Warcraft realms in different regions.</p>
          </section>

          <div className="box">
            <div className="tabs is-centered">
              <ul>
                <li className={activeTab === 'EU' ? 'is-active' : ''}>
                  <a onClick={() => setActiveTab('EU')}>
                    <span>EU Realms</span>
                  </a>
                </li>
                <li className={activeTab === 'US' ? 'is-active' : ''}>
                  <a onClick={() => setActiveTab('US')}>
                    <span>US Realms</span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              {activeTab === 'US' && (
                <RealmStatusDisplay
                  region="US"
                  config={API_CONFIGS.US}
                  ACCESS_TOKEN={ACCESS_TOKEN}
                />
              )}

              {activeTab === 'EU' && (
                <RealmStatusDisplay
                  region="EU"
                  config={API_CONFIGS.EU}
                  ACCESS_TOKEN={ACCESS_TOKEN}
                />
              )}

              {!activeTab && <p className="has-text-grey">Select a tab above to view realm status.</p>}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer has-text-centered">
        <p>
          &copy; 2025 Jack Stiles. Data provided by <a href="https://blizzard.com" target="_blank" rel="noopener noreferrer">Blizzard Entertainment</a>.
        </p>
      </footer>
    </>
  );
}

export default App;