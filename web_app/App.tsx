
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { DockerControlView } from './views/DockerControlView';
import { DockerUiView } from './views/DockerUiView';
import { View } from './types';
import { MENU_ITEMS } from './constants';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [activeSubView, setActiveSubView] = useState<string>('containers');

  const renderContent = () => {
    switch (activeView) {
      case View.DASHBOARD:
        return <DashboardView />;
      case View.DOCKER_UI:
        return <DockerUiView initialSubViewId={activeSubView} />;
      case View.DOCKER_CONTROL:
        return <DockerControlView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-background text-foreground font-sans">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        menuItems={MENU_ITEMS}
        activeSubView={activeSubView}
        setActiveSubView={setActiveSubView}
      />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
