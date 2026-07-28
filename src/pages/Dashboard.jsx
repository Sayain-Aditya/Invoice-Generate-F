import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice, saveInvoice } from '../api/invoiceApi';

const statusColor = (s) => ({
  draft: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
}[s] ?? 'bg-gray-100 text-gray-700');

const Dashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    setLoading(true);
    try { setInvoices(await getInvoices()); }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    await deleteInvoice(id);
    refresh();
  };

  const handleDuplicate = async (invoice) => {
    const dup = { ...invoice, invoiceNumber: `${invoice.invoiceNumber}-COPY`, status: 'draft' };
    delete dup._id; delete dup.createdAt; delete dup.updatedAt;
    await saveInvoice(dup);
    refresh();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
        <Link to="/new" className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors">
          + New Invoice
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading invoices…</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm mb-4">No invoices yet.</p>
          <Link to="/new" className="bg-blue-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800">
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Invoice #</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800">#{inv.invoiceNumber}</td>
                  <td className="px-5 py-3.5 text-gray-700">{inv.customerName}</td>
                  <td className="px-5 py-3.5 text-gray-500">{inv.date?.slice(0, 10)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <Link to={`/edit/${inv._id}`} className="text-blue-700 hover:underline font-medium">Edit</Link>
                    <button onClick={() => handleDuplicate(inv)} className="text-gray-500 hover:text-gray-800 font-medium">Duplicate</button>
                    <button onClick={() => handleDelete(inv._id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
