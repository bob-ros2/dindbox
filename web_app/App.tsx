
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DockerControlView } from './views/DockerControlView';
import { DockerUiView } from './views/DockerUiView';
import { View } from './types';
import { MENU_ITEMS } from './constants';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.DOCKER_UI);
  const [activeSubView, setActiveSubView] = useState<string>('containers');

  const renderContent = () => {
    switch (activeView) {
      case View.DOCKER_UI:
        return <DockerUiView initialSubViewId={activeSubView} setActiveView={setActiveView} />;
      case View.DOCKER_CONTROL:
        return <DockerControlView />;
      default:
        return <DockerUiView initialSubViewId={activeSubView} setActiveView={setActiveView} />;
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
