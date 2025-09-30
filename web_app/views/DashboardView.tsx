import React from 'react';

export const DashboardView: React.FC = () => {
  return (
    <div className="bg-card p-8 rounded-lg shadow-lg h-full border border-border">
      <h1 className="text-3xl font-bold text-card-foreground mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to the Docker Control Center. This area is under construction. 
        Please select 'Docker API' from the menu to interact with the API.
      </p>
    </div>
  );
};
