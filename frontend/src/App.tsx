import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import Scrape from './components/Scrape';
import Keys from './components/Keys';
import CRM from './components/CRM';
import Leads from './components/Leads';
import Email from './components/Email';
import Workflows from './components/Workflows';
import GitHubRepos from './components/GitHubRepos';
import Sandbox from './components/Sandbox';
import Settings from './components/Settings';
import Connectors from './components/Connectors';
import Payments from './components/Payments';
import SMS from './components/SMS';
import HubSpotPage from './components/HubSpot';
import type { Tab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard onTabChange={setActiveTab} />}
      {activeTab === 'chat' && <Chat />}
      {activeTab === 'scrape' && <Scrape />}
      {activeTab === 'keys' && <Keys />}
      {activeTab === 'crm' && <CRM />}
      {activeTab === 'leads' && <Leads />}
      {activeTab === 'email' && <Email />}
      {activeTab === 'workflows' && <Workflows />}
      {activeTab === 'repos' && <GitHubRepos />}
      {activeTab === 'sandbox' && <Sandbox />}
      {activeTab === 'settings' && <Settings />}
      {activeTab === 'connectors' && <Connectors />}
      {activeTab === 'payments' && <Payments />}
      {activeTab === 'sms' && <SMS />}
      {activeTab === 'hubspot' && <HubSpotPage />}
    </Layout>
  );
}
