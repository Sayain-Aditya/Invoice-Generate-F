import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewInvoice from './pages/NewInvoice';
import EditInvoice from './pages/EditInvoice';
import InvoiceSplitView from './components/proforma/InvoiceSplitView';

const Nav = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const navLink = (to, label) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        pathname === to ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-700/60'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-blue-900 text-white shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">
          MKS Alliance LLP <span className="text-blue-300 font-normal text-base">Invoices</span>
        </Link>
        {/* Desktop nav */}
        <nav className="hidden sm:flex gap-1">
          {navLink('/', 'Dashboard')}
          {navLink('/new', '+ New Invoice')}
          {navLink('/proforma', '+ New Proforma')}
        </nav>
        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-transform ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-transform ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>
      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden flex flex-col gap-1 px-4 pb-3 border-t border-blue-800">
          {navLink('/', 'Dashboard')}
          {navLink('/new', '+ New Invoice')}
          {navLink('/proforma', '+ New Proforma')}
        </div>
      )}
    </header>
  );
};

const App = () => (
  <BrowserRouter>
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewInvoice />} />
          <Route path="/edit/:id" element={<EditInvoice />} />
          <Route path="/proforma" element={<InvoiceSplitView />} />
          <Route path="/proforma/:id" element={<InvoiceSplitView />} />
        </Routes>
      </main>
    </div>
  </BrowserRouter>
);

export default App;
