import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewInvoice from './pages/NewInvoice';
import EditInvoice from './pages/EditInvoice';

const Nav = () => {
  const { pathname } = useLocation();
  const link = (to, label) => (
    <Link
      to={to}
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
          MKS Alliance <span className="text-blue-300 font-normal text-base">Invoices</span>
        </Link>
        <nav className="flex gap-1">
          {link('/', 'Dashboard')}
          {link('/new', '+ New Invoice')}
        </nav>
      </div>
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
        </Routes>
      </main>
    </div>
  </BrowserRouter>
);

export default App;
