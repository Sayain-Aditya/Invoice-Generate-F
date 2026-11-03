import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice, saveInvoice } from '../api/invoiceApi';
import { getProformas, deleteProforma, getProforma } from '../api/proformaInvoiceApi';
import { ProformaPreviewContent } from '../components/proforma/InvoiceSplitView';

const statusColor = (s) => ({
  draft: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
}[s] ?? 'bg-gray-100 text-gray-700');

const inr2 = (n) => (isNaN(n) ? 0 : n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ProformaViewModal = ({ id, onClose }) => {
  const [raw, setRaw] = useState(null);

  useEffect(() => {
    getProforma(id).then(setRaw).catch(console.error);
  }, [id]);

  const calc = useMemo(() => {
    if (!raw?.totals) return { rows: [], igst: 0, cgst: 0, sgst: 0, tcs: 0, total: 0, rounded: 0 };
    return raw.totals;
  }, [raw]);

  if (!raw) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 text-gray-500 text-sm">Loading…</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto z-10">
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
          <span className="font-bold text-gray-800">Preview — {raw.refNo || 'Proforma'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          <ProformaPreviewContent
            data={raw}
            calc={calc}
            amountInWords={raw.amountInWords}
            logo={raw.logo}
          />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [tab, setTab] = useState('proforma');
  const [invoices, setInvoices] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState(null);

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const [inv, pro] = await Promise.all([getInvoices(), getProformas()]);
      setInvoices(inv);
      setProformas(pro);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    await deleteInvoice(id);
    refresh();
  };

  const handleDeleteProforma = async (id) => {
    if (!window.confirm('Delete this proforma?')) return;
    await deleteProforma(id);
    refresh();
  };

  const handleDuplicate = async (invoice) => {
    const dup = { ...invoice, invoiceNumber: `${invoice.invoiceNumber}-COPY`, status: 'draft' };
    delete dup._id; delete dup.createdAt; delete dup.updatedAt;
    await saveInvoice(dup);
    refresh();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {viewId && <ProformaViewModal id={viewId} onClose={() => setViewId(null)} />}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/new" className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors">
            + New Invoice
          </Link>
          <Link to="/proforma" className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors">
            + New Proforma
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {['proforma', 'invoice'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize rounded-t-lg transition-colors ${
              tab === t ? 'bg-white border border-b-white border-gray-200 text-blue-900 -mb-px' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'proforma' ? 'Proforma Invoices' : 'Invoices'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
      ) : tab === 'proforma' ? (
        proformas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-4">No proforma invoices yet.</p>
            <Link to="/proforma" className="bg-blue-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800">
              Create your first proforma
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ref No</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proformas.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.refNo || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{p.to?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.date || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      {p.totals?.rounded != null ? `₹${Number(p.totals.rounded).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setViewId(p._id)} className="text-green-700 hover:underline font-medium">View</button>
                        <Link to={`/proforma/${p._id}`} className="text-blue-700 hover:underline font-medium">Edit</Link>
                        <button onClick={() => handleDeleteProforma(p._id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        invoices.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-4">No invoices yet.</p>
            <Link to="/new" className="bg-blue-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800">
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Invoice #</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">#{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.customerName}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <Link to={`/edit/${inv._id}`} className="text-blue-700 hover:underline font-medium">Edit</Link>
                        <button onClick={() => handleDuplicate(inv)} className="text-gray-500 hover:text-gray-800 font-medium hidden sm:inline">Duplicate</button>
                        <button onClick={() => handleDelete(inv._id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default Dashboard;
