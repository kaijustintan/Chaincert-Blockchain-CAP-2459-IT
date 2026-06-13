// AppShell.jsx
/*
  FILE: AppShell.jsx
  LAYMAN (Tropang Ex): Ang "frame" ng mga dashboard — kaliwa may patayong menu
  (Sidebar), kanan yung aktwal na content. Pinapalitan nito yung dating magugulong
  navigation (emoji card launcher ng issuer, centered tabs ng admin). Nakaupo ito sa
  ilalim ng global top navbar; ang sidebar ang humahawak ng in-dashboard sections.

  TECHNICAL: Layout shell (.cc-shell = flex[sidebar, main]). Sidebar is data-driven:
  items=[{ key, label, icon, badge }], controlled by activeKey + onSelect. Coexists
  with the global top <Navbar/> (which serves as the topbar). Collapses to a
  horizontal scroll nav under 900px (see ui.css).

  PARAMS:
  - Sidebar: items, activeKey, onSelect(key), title, subtitle, footer.
  - AppShell: sidebar (node), children (main content).

  RETURNS: dashboard layout scaffolding.
*/
import React from 'react';

export function Sidebar({ items = [], activeKey, onSelect, title, subtitle, footer }) {
  return (
    <aside className="cc-sidebar">
      {(title || subtitle) && (
        <div className="cc-sidebar-head">
          {title && <p className="cc-sidebar-title">{title}</p>}
          {subtitle && <p className="cc-sidebar-sub">{subtitle}</p>}
        </div>
      )}
      <nav className="cc-sidebar-nav">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              type="button"
              className={`cc-sidebar-item ${activeKey === it.key ? 'is-active' : ''}`}
              onClick={() => onSelect?.(it.key)}
              aria-current={activeKey === it.key ? 'page' : undefined}
            >
              {Icon && <Icon size={18} aria-hidden="true" />}
              <span className="cc-sidebar-item-label">{it.label}</span>
              {it.badge != null && <span className="cc-sidebar-badge">{it.badge}</span>}
            </button>
          );
        })}
      </nav>
      {footer && <div className="cc-sidebar-foot">{footer}</div>}
    </aside>
  );
}

export function AppShell({ sidebar, children, className = '' }) {
  return (
    <div className={`cc-shell ${className}`.trim()}>
      {sidebar}
      <main className="cc-shell-main">{children}</main>
    </div>
  );
}

export default AppShell;
