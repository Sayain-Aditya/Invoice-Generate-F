const Toolbar = ({ onSave, onPrint, saving }) => (
  <div className="flex gap-3 mb-6">
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="bg-blue-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
    >
      {saving ? 'Saving…' : 'Save Invoice'}
    </button>
    <button
      type="button"
      onClick={onPrint}
      className="border border-gray-300 bg-white text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
    >
      Print / PDF
    </button>
  </div>
);

export default Toolbar;
