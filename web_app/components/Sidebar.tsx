import React, { useState, useEffect } from 'react';
import { View, MenuItem, SubMenuItem } from '../types';
import { useWindowSize } from '../hooks/useWindowSize';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  menuItems: MenuItem[];
  activeSubView: string;
  setActiveSubView: (subViewId: string) => void;
}

const ChevronDownIcon = ({ className }: { className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-transform duration-200 ${className}`}><path d="m6 9 6 6 6-6"/></svg>
);

const ChevronsLeftIcon = ({ className }: { className?: string }) => (
    // FIX: Corrected the viewBox attribute from '0 0 24" 24"' to '0 0 24 24'.
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>
    </svg>
);

const ChevronsRightIcon = ({ className }: { className?: string }) => (
    // FIX: Corrected the viewBox attribute from '0 0 24" 24"' to '0 0 24 24'.
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>
    </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, menuItems, activeSubView, setActiveSubView }) => {
  const { width } = useWindowSize();
  const isMobile = width !== undefined && width < 640;
  const isTablet = width !== undefined && width >= 640 && width < 1024;

  const [expandedMenu, setExpandedMenu] = useState<string | null>(activeView === View.DOCKER_UI ? 'MANAGE' : null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isEffectivelyCollapsed = isCollapsed || isTablet;

  useEffect(() => {
    // When entering tablet view, collapse any open submenus
    if (isTablet && expandedMenu) {
      setExpandedMenu(null);
    }
  }, [isTablet, expandedMenu]);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
        setExpandedMenu(null);
    }
  }

  const handleParentClick = (item: MenuItem) => {
    // On desktop, if sidebar is collapsed, expand it. But not on tablet.
    if (isCollapsed && !isTablet) {
        setIsCollapsed(false);
    }
    if (item.view) {
        setActiveView(item.view);
    }
    // Only toggle submenu if sidebar is not collapsed
    if (!isEffectivelyCollapsed) {
        setExpandedMenu(expandedMenu === item.id ? null : item.id as string);
    }
  };
  
  const handleChildClick = (parentItem: MenuItem, childItem: SubMenuItem) => {
    if (parentItem.view) {
      setActiveView(parentItem.view);
    }
    setActiveSubView(childItem.id);
  }

  if (isMobile) {
    const handleMobileChange = (value: string) => {
        const selected = menuItems.find(i => i.id === value);
        if (selected?.view) {
            setActiveView(selected.view);
        }
    };
    
    const selectedValue = menuItems.find(item => item.view === activeView)?.id;


    return (
      <div className="w-full p-2 bg-background border-b border-border sm:hidden flex items-center gap-2">
        <div className="relative w-full">
            <select
              value={selectedValue}
              onChange={(e) => handleMobileChange(e.target.value)}
              className="appearance-none w-full bg-input border border-border rounded-md p-2 pl-10 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Select a view"
            >
              {menuItems.map(item => (
                  <option key={item.id} value={item.id}>{item.text}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                {menuItems.find(i => i.view === activeView)?.icon || menuItems[0].icon}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                <ChevronDownIcon className="h-4 w-4" />
            </div>
        </div>
        <ThemeSwitcher />
      </div>
    );
  }

  return (
    <nav className={`hidden sm:flex sm:flex-col bg-card p-2 transition-all duration-300 border-r border-border ${isEffectivelyCollapsed ? 'w-20' : 'w-64'}`}>
      <ul className="flex flex-col space-y-2 flex-grow pt-4">
        {menuItems.map((item) => {
            const isParentActive = item.view === activeView;
            if (item.children) {
                const isExpanded = expandedMenu === item.id;
                return (
                    <li key={item.id}>
                        <button
                          onClick={() => handleParentClick(item)}
                          className={`flex items-center w-full p-3 rounded-md transition-colors duration-200 ${
                            isParentActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          } ${isEffectivelyCollapsed ? 'justify-center' : 'justify-between'}`}
                        >
                          <div className="flex items-center">
                            {item.icon}
                            <span className={`${isEffectivelyCollapsed ? 'hidden' : 'inline'} ml-4 font-medium`}>{item.text}</span>
                          </div>
                           <ChevronDownIcon className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isEffectivelyCollapsed ? 'hidden' : 'inline'}`} />
                        </button>
                        {!isEffectivelyCollapsed && isExpanded && (
                            <ul className="pl-10 mt-2 space-y-1">
                                {item.children.map(child => {
                                    const isChildActive = isParentActive && child.id === activeSubView;
                                    return (
                                        <li key={child.id}>
                                            <button 
                                                onClick={() => handleChildClick(item, child)}
                                                className={`w-full text-left p-2 rounded-md text-sm transition-colors ${isChildActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-accent-foreground'}`}
                                            >
                                                <span>{child.text}</span>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </li>
                )
            }
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                      if (item.view) setActiveView(item.view);
                      setExpandedMenu(null);
                  }}
                  className={`flex items-center w-full p-3 rounded-md transition-colors duration-200 ${
                    activeView === item.view
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  } ${isEffectivelyCollapsed ? 'justify-center' : ''}`}
                >
                  {item.icon}
                  <span className={`${isEffectivelyCollapsed ? 'hidden' : 'inline'} ml-4 font-medium`}>{item.text}</span>
                </button>
              </li>
            )
        })}
      </ul>
      <div className={`flex items-center p-2 mt-auto border-t border-border ${isEffectivelyCollapsed ? 'flex-col-reverse gap-2' : 'justify-between'}`}>
        <ThemeSwitcher />
        {!isTablet && (
            <button
              onClick={handleToggleCollapse}
              className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronsRightIcon className="h-5 w-5" /> : <ChevronsLeftIcon className="h-5 w-5" />}
            </button>
        )}
      </div>
    </nav>
  );
};