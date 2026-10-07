import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Icon } from './Icon'

const registrationPortalUrl = import.meta.env.VITE_REGISTRATION_PORTAL_URL
  || (import.meta.env.DEV ? 'http://localhost:5174/' : 'https://register.nacosoutheast.org.ng/')

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/chapters', label: 'Chapters' },
  { to: '/leadership', label: 'Zonal Executives' },
  { to: '/history', label: 'History & Media' },
]

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="NACOS South East home">
      <span className="brand-seal" aria-hidden="true">NACOS</span>
      <span className="brand-copy">
        <strong>NACOS</strong>
        <span>SOUTH EAST</span>
        <small>Networking the world</small>
      </span>
    </Link>
  )
}

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <nav className={`main-nav${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeMenu}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {item.label}
              </NavLink>
            ))}
            <a className="nav-cta" href={registrationPortalUrl} onClick={closeMenu}>Register a Chapter</a>
          </nav>
        </div>
      </header>

      <main className="page-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Brand />
            <p>
              Connecting NACOS chapters and celebrating student leadership across Abia,
              Anambra, Ebonyi, Enugu and Imo States.
            </p>
          </div>
          <div className="footer-column">
            <h3>Explore</h3>
            <div className="footer-links">
              <Link to="/chapters">Chapters directory</Link>
              <a href={registrationPortalUrl}>Register a chapter</a>
              <Link to="/leadership">Leadership archive</Link>
              <Link to="/history">History &amp; media</Link>
            </div>
          </div>
          <div className="footer-column">
            <h3>South East Zone</h3>
            <div className="footer-links">
              <a href="https://www.nacosoutheast.org.ng/">NACOS South East website</a>
              <a href="mailto:hello@nacosoutheast.org.ng">Contact the zonal team</a>
              <span>Abia · Anambra · Ebonyi · Enugu · Imo</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 NACOS South East. All rights reserved.</p>
          <p>Networking the world</p>
        </div>
      </footer>
    </div>
  )
}
