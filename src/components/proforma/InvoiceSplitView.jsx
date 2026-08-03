import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { saveProforma, getProforma, updateProforma } from "../../api/proformaInvoiceApi";

// ---------- helpers ----------
const inr2 = (n) => (isNaN(n) ? 0 : n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Tolerant number parser: strips commas, currency symbols, and stray spaces before parsing,
// so values like "23,49,387.48" or "₹23,49,387.48" don't collapse to 0/NaN.
const num = (v) => {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  if (v == null) return 0;
  const cleaned = String(v).replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const onesWords = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
  "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const tensWords = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
function twoDigits(n) { if (n < 20) return onesWords[n]; return tensWords[Math.floor(n / 10)] + (n % 10 ? "-" + onesWords[n % 10] : ""); }
function numberToWordsLakh(num) {
  num = Math.round(num);
  if (num === 0) return "ZERO";
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = num;
  let parts = [];
  if (lakh) parts.push((lakh < 20 ? onesWords[lakh] : twoDigits(lakh)) + "-LAKH" + (lakh > 1 ? "S" : ""));
  if (thousand) parts.push((thousand < 20 ? onesWords[thousand] : twoDigits(thousand)) + " THOUSAND");
  if (hundred) parts.push((hundred < 100 ? twoDigits(hundred) : Math.floor(hundred / 100) + " HUNDRED " + twoDigits(hundred % 100)));
  return parts.join(" ").trim();
}

const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const highlightAccountNumber = (text) => {
  if (!text) return text;
  const token = "44106179887";
  const label = "BankAccountNo";
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedLabel}|${escapedToken})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const normalized = part.toLowerCase();
    const isToken = normalized === token.toLowerCase();
    const isLabel = normalized === label.toLowerCase();

    if (isToken || isLabel) {
      return (
        <b key={`${part}-${index}`} style={{ fontWeight: 700 }}>
          {part}
        </b>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

const initialData = {
  refNo: "",
  date: today,
  to: { name: "", address: "", mob: "", email: "", gst: "" },
  billingFrom: "",
  shipTo: { name: "", address: "" },
  hpn: "",
  items: [{ hsn: "", description: "", qty: 1, unitPrice: 0, finalPrice: "", discount: 0, priceSource: "unit" }],
  gstType: "split",
  cgstPercent: 9,
  sgstPercent: 9,
  igstPercent: 18,
  tcsPercent: 1,
  roundedTotal: "",
  otherTerms: "Prices quoted are on Works Varanasi basis and duties shall be as above, and also are inclusive of transportation, transit insurance, octroi, entry tax, registration, road tax and any other levies. All such levies will be extra to our account. Any change in the excise duty and other statutory levies, as applicable at the time of billing will be extra to customer's account.",
  delivery: "EX works Gorakhpur within 1-3 weeks from the date of firm and clear order.",
  freight: "Delivery at site",
  paymentTerms: "100% Payment should be made in advance against in the form of Financier DO (With mention of payment to MKS ALLIANCE LLP immediately against the submission of Invoice Copy) drawn in favor of MKS ALLIANCE LLP.\nBeneficiary Name: MKS ALLIANCE LLP.\nBankAccountNo:44106179887 IFSC Code: SBIN0017640 Bank Name: STATE BANK OF INDIA, RAMGARH GORAKHPUR PIN:273017",
  validity: "15days",
  insuranceRto: "Insurance & Registration is customer responsibility.",
  warranty: "Standard Warranty (1 yrs./1000 HMR) Terms shall be applicable.",
  footerCompany: "MKS ALLIANCE LLP",
  footerAddress: "TARA MANDAL ROAD SIDDHARTH ENCLAVE SUB POST OFFICE RAMGARH GORAKHPUR (U.P.)273017",
  footerGst: "GST NO.09ACCFM8309C1ZC",
  footerEmail: "mishrasarvesh727@gmail.com mksalliancellp05@gmail.com",
  footerMobile: "9194702095/7905180374",
};

// ---------- form field primitives (Tailwind versions) ----------
function Row({ label, children }) {
  return (
    <div className="mb-2">
      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">{label}</label>
      {children}
    </div>
  );
}
function Input(props) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full px-2 py-1.5 border border-gray-300 rounded-md text-[13px] font-inherit focus:outline focus:outline-2 focus:outline-blue-900/20 focus:border-blue-900 ${className}`}
    />
  );
}
function TextArea(props) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      rows={props.rows || 3}
      className={`w-full px-2 py-1.5 border border-gray-300 rounded-md text-[13px] font-inherit focus:outline focus:outline-2 focus:outline-blue-900/20 focus:border-blue-900 ${className}`}
    />
  );
}

export default function InvoiceSplitView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(initialData);
  const [docId, setDocId] = useState(id || null);
  const docIdRef = useRef(id || null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [logo, setLogo] = useState(null);
  const [mobileTab, setMobileTab] = useState("form");
  const autoSaveTimer = useRef(null);
  const isFirstRender = useRef(true);
  const skipNextAutosave = useRef(false);

  // Load existing proforma when editing
  useEffect(() => {
    if (!id) return;
    getProforma(id).then((p) => {
      const { _id, totals, amountInWords: _w, createdAt, updatedAt, __v, ...rest } = p;
      setData({ ...initialData, ...rest });
      setDocId(_id);
      docIdRef.current = _id;
      skipNextAutosave.current = true;
    }).catch(() => setSaveMsg("Failed to load invoice"));
  }, [id]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const updateTo = (k, v) => setData((d) => ({ ...d, to: { ...d.to, [k]: v } }));
  const updateShip = (k, v) => setData((d) => ({ ...d, shipTo: { ...d.shipTo, [k]: v } }));
  const updateItem = (idx, k, v) => setData((d) => { const items = [...d.items]; items[idx] = { ...items[idx], [k]: v }; return { ...d, items }; });
  // Setting either price field marks it as the "live" source for that row, so the other
  // field + GST + TDS/TCS recompute from it automatically — no separate mode toggle needed.
  const setPrice = (idx, field, value) => setData((d) => {
    const items = [...d.items];
    items[idx] = { ...items[idx], [field]: value, priceSource: field === "finalPrice" ? "final" : "unit" };
    return { ...d, items };
  });
  const addRow = () => setData((d) => ({ ...d, items: [...d.items, { hsn: "", description: "", qty: 1, unitPrice: 0, finalPrice: "", discount: 0, priceSource: "unit" }] }));
  const removeRow = (idx) => setData((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  const calc = useMemo(() => {
    const totalGstPercent = data.gstType === "split" ? num(data.cgstPercent) + num(data.sgstPercent) : num(data.igstPercent);
    const priceDivisor = (1 + totalGstPercent / 100) * (1 + num(data.tcsPercent) / 100);

    const rows = data.items.map((it) => {
      const qty = num(it.qty);
      const discount = num(it.discount);
      const priceSource = it.priceSource || "unit";
      const unitPrice = priceSource === "final"
        ? num(it.finalPrice) / priceDivisor
        : num(it.unitPrice);
      const gstAmount = unitPrice * (totalGstPercent / 100);
      const tcsAmount = (unitPrice + gstAmount) * (num(data.tcsPercent) / 100);
      const computedFinalPrice = unitPrice + gstAmount + tcsAmount;
      return { ...it, unitPrice, totalPrice: qty * unitPrice - discount, gstAmount, tcsAmount, computedFinalPrice, totalGstPercent, priceDivisor };
    });
    const subtotal = rows.reduce((s, r) => s + r.totalPrice, 0);
    const cgst = data.gstType === "split" ? (subtotal * num(data.cgstPercent)) / 100 : 0;
    const sgst = data.gstType === "split" ? (subtotal * num(data.sgstPercent)) / 100 : 0;
    const igst = data.gstType === "igst" ? (subtotal * num(data.igstPercent)) / 100 : 0;
    const gstTotal = cgst + sgst + igst;
    const preTcsTotal = subtotal + gstTotal;
    const tcs = (preTcsTotal * num(data.tcsPercent)) / 100;
    const total = preTcsTotal + tcs;
    const rounded = data.roundedTotal !== "" ? num(data.roundedTotal) : Math.round(total / 100) * 100;
    return { rows, subtotal, cgst, sgst, igst, gstTotal, tcs, total, rounded, totalGstPercent, priceDivisor };
  }, [data.items, data.gstType, data.cgstPercent, data.sgstPercent, data.igstPercent, data.tcsPercent, data.roundedTotal]);

  const amountInWords = "RUPEES - " + numberToWordsLakh(calc.rounded) + " ONLY.";

  // Autosave: debounce 2s after every data change
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (skipNextAutosave.current) { skipNextAutosave.current = false; return; }
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { doSave(); }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [data]);

  const doSave = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const payload = { ...data, totals: calc, amountInWords };
      if (docIdRef.current) {
        await updateProforma(docIdRef.current, payload);
      } else {
        const saved = await saveProforma(payload);
        setDocId(saved._id);
        docIdRef.current = saved._id;
      }
      setSaveMsg("Saved ✓");
    } catch { setSaveMsg("Save failed"); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 3000); }
  };

  const handlePrint = () => window.print();
  const handleSave = () => doSave();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans print:block print:h-auto print:bg-white">

      {/* MOBILE TAB BAR */}
      <div className="md:hidden flex border-b border-gray-300 bg-white print:hidden shrink-0">
        <button
          onClick={() => setMobileTab("form")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mobileTab === "form" ? "text-blue-900 border-b-2 border-blue-900" : "text-gray-500"
          }`}
        >
          Form
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mobileTab === "preview" ? "text-blue-900 border-b-2 border-blue-900" : "text-gray-500"
          }`}
        >
          Preview
        </button>
      </div>

      {/* LEFT: FORM */}
      <div className={`${
        mobileTab === "form" ? "flex" : "hidden"
      } md:flex flex-col w-full md:w-[400px] shrink-0 overflow-y-auto bg-white border-r border-gray-300 p-4 print:hidden`}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 text-lg leading-none">&larr;</button>
            <span className="font-bold text-base text-gray-800">{docId ? 'Edit Proforma' : 'New Proforma'}</span>
          </div>
          {saving && <span className="text-[11px] text-blue-600 font-medium">Saving…</span>}
          {!saving && saveMsg && <span className="text-[11px] text-green-600 font-medium">{saveMsg}</span>}
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Logo</div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Upload Company Logo</label>
          <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-[12px] text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          {logo && (
            <div className="mt-2 flex items-center gap-2">
              <img src={logo} alt="logo preview" className="h-10 object-contain border border-gray-200 rounded p-1" />
              <button onClick={() => setLogo(null)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Reference</div>
          <Row label="Reference No"><Input value={data.refNo} onChange={(e) => setData((d) => ({ ...d, refNo: e.target.value }))} /></Row>
          <Row label="Date"><Input value={data.date} onChange={(e) => setData((d) => ({ ...d, date: e.target.value }))} /></Row>
          <Row label="Billing From"><Input value={data.billingFrom} onChange={(e) => setData((d) => ({ ...d, billingFrom: e.target.value }))} /></Row>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Client (To)</div>
          <Row label="Name"><Input value={data.to.name} onChange={(e) => updateTo("name", e.target.value)} /></Row>
          <Row label="Address"><TextArea value={data.to.address} onChange={(e) => updateTo("address", e.target.value)} /></Row>
          <Row label="Mobile"><Input value={data.to.mob} onChange={(e) => updateTo("mob", e.target.value)} /></Row>
          <Row label="Email"><Input value={data.to.email} onChange={(e) => updateTo("email", e.target.value)} /></Row>
          <Row label="GST No"><Input value={data.to.gst} onChange={(e) => updateTo("gst", e.target.value)} /></Row>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Ship To</div>
          <Row label="Name"><Input value={data.shipTo.name} onChange={(e) => updateShip("name", e.target.value)} /></Row>
          <Row label="Address"><TextArea value={data.shipTo.address} onChange={(e) => updateShip("address", e.target.value)} /></Row>
          <Row label="HPN"><Input value={data.hpn} onChange={(e) => setData((d) => ({ ...d, hpn: e.target.value }))} /></Row>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Tax & Totals</div>
          <div className="flex gap-3.5 text-xs items-center mb-2">
            <label className="flex items-center gap-1">
              <input type="radio" checked={data.gstType === "split"} onChange={() => setData((d) => ({ ...d, gstType: "split", cgstPercent: num(d.igstPercent) / 2, sgstPercent: num(d.igstPercent) / 2 }))} /> CGST+SGST
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={data.gstType === "igst"} onChange={() => setData((d) => ({ ...d, gstType: "igst", igstPercent: num(d.cgstPercent) + num(d.sgstPercent) }))} /> IGST
            </label>
          </div>
          {data.gstType === "split" ? (
            <div className="grid grid-cols-2 gap-1.5">
              <Row label="CGST %"><Input type="number" value={data.cgstPercent} onChange={(e) => {
                const v = e.target.value;
                setData((d) => ({ ...d, cgstPercent: v, igstPercent: num(v) + num(d.sgstPercent) }));
              }} /></Row>
              <Row label="SGST %"><Input type="number" value={data.sgstPercent} onChange={(e) => {
                const v = e.target.value;
                setData((d) => ({ ...d, sgstPercent: v, igstPercent: num(d.cgstPercent) + num(v) }));
              }} /></Row>
            </div>
          ) : (
            <Row label="IGST %"><Input type="number" value={data.igstPercent} onChange={(e) => {
              const v = e.target.value;
              const half = num(v) / 2;
              setData((d) => ({ ...d, igstPercent: v, cgstPercent: half, sgstPercent: half }));
            }} /></Row>
          )}
          <Row label="TCS %"><Input type="number" value={data.tcsPercent} onChange={(e) => setData((d) => ({ ...d, tcsPercent: e.target.value }))} /></Row>
          <Row label={`Rounded Total (auto: ${inr2(calc.total)})`}>
            <Input type="text" inputMode="decimal" placeholder="leave blank to auto-round" value={data.roundedTotal} onChange={(e) => setData((d) => ({ ...d, roundedTotal: e.target.value }))} />
          </Row>
          <div className="text-[11px] text-gray-500 mt-1.5">
            Divisor: {(calc.priceDivisor ?? 1).toFixed(4)}× &nbsp;|&nbsp; Final Price ÷ this = Base Price
          </div>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Items</div>
          <div className="text-[11px] text-gray-500 mb-2">
            Enter either Unit Price OR Final Price — the other fills in automatically.
          </div>
          {data.items.map((it, idx) => {
            const row = calc.rows[idx] || {};
            const priceSource = it.priceSource || "unit";
            return (
              <div className="border border-gray-200 rounded-md p-2 mb-2 relative" key={idx}>
                {data.items.length > 1 && (
                  <button
                    className="absolute top-1 right-1 bg-red-600 text-white border-none rounded w-[18px] h-[18px] text-[11px] leading-none cursor-pointer"
                    onClick={() => removeRow(idx)}
                  >
                    ×
                  </button>
                )}
                <Row label="HSN Code"><Input value={it.hsn} onChange={(e) => updateItem(idx, "hsn", e.target.value)} /></Row>
                <Row label="Description"><Input value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} /></Row>
                <Row label="Qty"><Input type="number" value={it.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} /></Row>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <Row label={`Unit Price (before tax)${priceSource === "final" ? " — auto" : " ✏"}`}>
                    <Input
                      type="text" inputMode="decimal"
                      value={priceSource === "unit" ? it.unitPrice : inr2(row.unitPrice ?? 0)}
                      onChange={(e) => setPrice(idx, "unitPrice", e.target.value)}
                      className={priceSource === "final" ? "bg-gray-100 text-gray-500" : ""}
                    />
                  </Row>
                  <Row label={`Final Price (incl. GST+TCS)${priceSource === "unit" ? " — auto" : " ✏"}`}>
                    <Input
                      type="text" inputMode="decimal"
                      value={priceSource === "final" ? it.finalPrice : inr2(row.computedFinalPrice ?? 0)}
                      onChange={(e) => setPrice(idx, "finalPrice", e.target.value)}
                      className={priceSource === "unit" ? "bg-gray-100 text-gray-500" : ""}
                    />
                  </Row>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  <Row label={`GST (${calc.totalGstPercent}%) auto`}>
                    <Input readOnly value={inr2(row.gstAmount ?? 0)} className="bg-gray-100 text-gray-700" />
                  </Row>
                  <Row label={`TCS (${data.tcsPercent}%) auto`}>
                    <Input readOnly value={inr2(row.tcsAmount ?? 0)} className="bg-gray-100 text-gray-700" />
                  </Row>
                </div>
                <Row label="Discount"><Input type="text" inputMode="decimal" value={it.discount} onChange={(e) => updateItem(idx, "discount", e.target.value)} /></Row>
                <div className="text-[10px] text-blue-700 mt-1 bg-blue-50 px-2 py-1 rounded">
                  {priceSource === "final"
                    ? `Base = ${inr2(num(it.finalPrice))} ÷ ${(row.priceDivisor ?? 1).toFixed(4)} = ${inr2(row.unitPrice ?? 0)}`
                    : `Final = ${inr2(num(it.unitPrice))} × ${(row.priceDivisor ?? 1).toFixed(4)} = ${inr2(row.computedFinalPrice ?? 0)}`
                  }
                </div>
              </div>
            );
          })}
          <button
            className="w-full p-1.5 border border-dashed border-gray-400 rounded-md bg-gray-50 cursor-pointer text-xs font-semibold text-gray-700"
            onClick={addRow}
          >
            + Add Item
          </button>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Terms (Fixed)</div>
          {[
            { label: "Other Terms", value: data.otherTerms },
            { label: "Delivery", value: data.delivery },
            { label: "Freight", value: data.freight },
            { label: "Payment Terms", value: data.paymentTerms },
            { label: "Validity", value: data.validity },
            { label: "Insurance & RTO", value: data.insuranceRto },
            { label: "Warranty", value: data.warranty },
          ].map(({ label, value }) => (
            <div key={label} className="mb-2">
              <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">{label}</label>
              <div className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-600 bg-gray-50 whitespace-pre-wrap">
                {label === "Payment Terms" ? highlightAccountNumber(value) : value}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Footer / Company (Fixed)</div>
          {[
            { label: "Company", value: data.footerCompany },
            { label: "Address", value: data.footerAddress },
            { label: "GST No", value: data.footerGst },
            { label: "Email", value: data.footerEmail },
            { label: "Mobile", value: data.footerMobile },
          ].map(({ label, value }) => (
            <div key={label} className="mb-2">
              <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">{label}</label>
              <div className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-600 bg-gray-50">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW */}
      <div className={`${
        mobileTab === "preview" ? "flex" : "hidden"
      } md:flex flex-1 overflow-y-auto p-2 md:p-6 flex-col items-center print:p-0`}>
        <div className="flex justify-between items-center mb-4 w-full max-w-[900px] print:hidden">
          <span className="font-bold text-base text-gray-800">Live Preview</span>
          <div className="flex gap-2 items-center">
            {saveMsg && <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-md">{saveMsg}</span>}
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white cursor-pointer text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-blue-900 text-white cursor-pointer text-sm font-semibold hover:bg-blue-800 transition-colors"
              onClick={handlePrint}
            >
              Print / PDF
            </button>
          </div>
        </div>

        <div className="w-full max-w-[900px] bg-white border border-black text-xs text-gray-900 print:w-auto print-area">
          <div className="flex justify-between items-center px-4 py-3 border-b border-black">
            <div>
              <div className="text-[11px] font-medium">Authorised Dealer</div>
              <div className="text-2xl font-extrabold tracking-wide mt-0.5">MKS</div>
            </div>
            <div className="text-right">
              {logo ? (
                <img src={logo} alt="logo" className="h-16 object-contain ml-auto" />
              ) : (
                <div className="font-bold text-base">
                  Kubota<br /><span className="text-[10px] font-normal">Escorts Kubota Limited</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-center font-bold text-sm p-1.5 border-b border-black">QUOTATION/PROFORMA INVOICE</div>

          <table className="w-full" style={{borderCollapse:'collapse'}}><tbody>
            <tr>
              <td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', whiteSpace:'pre-wrap', width:'55%'}}>
                <div className="font-semibold">To,</div>
                <div className="font-bold">{data.to.name}</div>
                <div><span className="font-semibold">ADD:</span> {data.to.address}</div>
                <div><span className="font-semibold">Mob. No.</span> {data.to.mob}</div>
                <div><span className="font-semibold">Email:</span> {data.to.email}</div>
                <div><span className="font-semibold">GST No.</span> {data.to.gst}</div>
              </td>
              <td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', whiteSpace:'pre-wrap'}}>
                <div><span className="font-semibold">Reference No:</span> {data.refNo}</div>
                <div><span className="font-semibold">Date:</span> {data.date}</div>
                <div className="mt-2.5 font-semibold">Ship to Party Address–</div>
                <div className="font-bold">{data.shipTo.name}</div>
                <div><span className="font-semibold">ADD:</span> {data.shipTo.address}</div>
              </td>
            </tr>
            <tr>
              <td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top'}}><span className="font-semibold">Billing From:</span> {data.billingFrom}</td>
              <td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top'}}><span className="font-semibold">HPN:</span> {data.hpn}</td>
            </tr>
          </tbody></table>

          <table className="w-full" style={{borderCollapse:'collapse'}}><thead><tr>
            <th style={{border:'1px solid black', padding:'4px 6px', background:'#f3f4f6', textAlign:'center', width:'90px', fontSize:'10px'}}>HSN Code</th>
            <th style={{border:'1px solid black', padding:'4px 6px', background:'#f3f4f6', textAlign:'center', fontSize:'10px'}}>Item Description</th>
            <th style={{border:'1px solid black', padding:'4px 6px', background:'#f3f4f6', textAlign:'center', width:'40px', fontSize:'10px'}}>Qty</th>
            <th style={{border:'1px solid black', padding:'4px 6px', background:'#f3f4f6', textAlign:'center', width:'90px', fontSize:'10px'}}>Unit Price</th>
            <th style={{border:'1px solid black', padding:'4px 6px', background:'#f3f4f6', textAlign:'center', width:'70px', fontSize:'10px'}}>Discount</th>
            <th style={{border:'1px solid black', padding:'4px 6px', background:'#f3f4f6', textAlign:'center', width:'100px', fontSize:'10px'}}>Total Price</th>
          </tr></thead><tbody>
            {calc.rows.map((it, idx) => (
              <tr key={idx}>
                <td style={{border:'1px solid black', padding:'4px 6px', textAlign:'center'}}>{it.hsn}</td>
                <td style={{border:'1px solid black', padding:'4px 6px'}}>{it.description}</td>
                <td style={{border:'1px solid black', padding:'4px 6px', textAlign:'center'}}>{it.qty}</td>
                <td style={{border:'1px solid black', padding:'4px 6px', textAlign:'right'}}>{inr2(it.unitPrice)}</td>
                <td style={{border:'1px solid black', padding:'4px 6px', textAlign:'right'}}>{inr2(it.discount)}</td>
                <td style={{border:'1px solid black', padding:'4px 6px', textAlign:'right'}}>{inr2(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody></table>

          <table className="w-full" style={{borderCollapse:'collapse'}}><tbody>
            <tr>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'center'}} colSpan={2}>IGST</td>
              <td style={{border:'1px solid black', padding:'4px 8px', width:'90px'}}>{data.igstPercent}%</td>
              <td style={{border:'1px solid black', padding:'4px 8px', width:'130px', textAlign:'right'}}>{data.gstType === "igst" ? inr2(calc.igst) : ""}</td>
            </tr>
            <tr>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'center', width:'130px'}} rowSpan={2}>CGST</td>
              <td style={{border:'1px solid black', padding:'4px 8px'}}></td>
              <td style={{border:'1px solid black', padding:'4px 8px'}}>{data.cgstPercent}%</td>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'right'}}>{data.gstType === "split" ? inr2(calc.cgst) : ""}</td>
            </tr>
            <tr>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'center'}}>SGST</td>
              <td style={{border:'1px solid black', padding:'4px 8px'}}>{data.sgstPercent}%</td>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'right'}}>{data.gstType === "split" ? inr2(calc.sgst) : ""}</td>
            </tr>
            <tr>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'center'}} colSpan={2}>TCS</td>
              <td style={{border:'1px solid black', padding:'4px 8px'}}>{data.tcsPercent}%</td>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'right'}}>{inr2(calc.tcs)}</td>
            </tr>
            <tr>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'right', fontWeight:'bold'}} colSpan={3}>Total</td>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'right', fontWeight:'bold'}}>{inr2(calc.total)}</td>
            </tr>
            <tr>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'right', fontWeight:'bold'}} colSpan={3}>R/o</td>
              <td style={{border:'1px solid black', padding:'4px 8px', textAlign:'right', fontWeight:'bold'}}>{inr2(calc.rounded)}</td>
            </tr>
            <tr>
              <td style={{border:'1px solid black', padding:'4px 8px', fontWeight:'bold', width:'90px'}}>Total In words</td>
              <td style={{border:'1px solid black', padding:'4px 8px'}} colSpan={3}>{amountInWords}</td>
            </tr>
          </tbody></table>

          <table className="w-full" style={{borderCollapse:'collapse'}}><tbody>
            <tr><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', whiteSpace:'pre-wrap', fontWeight:'600', width:'130px'}}>Other Terms:</td><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', whiteSpace:'pre-wrap'}}>{data.otherTerms}</td></tr>
            <tr><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', fontWeight:'600'}}>Delivery:</td><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', whiteSpace:'pre-wrap'}}>{data.delivery}</td></tr>
            <tr><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', fontWeight:'600'}}>Freight: Extra</td><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', textAlign:'center'}}>{data.freight}</td></tr>
            <tr><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', fontWeight:'600'}}>Payment Terms:</td><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', whiteSpace:'pre-wrap'}}>{highlightAccountNumber(data.paymentTerms)}</td></tr>
            <tr><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', fontWeight:'600'}}>Validity:</td><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', textAlign:'center'}}>{data.validity}</td></tr>
            <tr><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', fontWeight:'600'}}>Insurance & Rto:</td><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', textAlign:'center'}}>{data.insuranceRto}</td></tr>
            <tr><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', fontWeight:'600'}}>Warranty:</td><td style={{border:'1px solid black', padding:'6px 8px', verticalAlign:'top', textAlign:'center'}}>{data.warranty}</td></tr>
          </tbody></table>

          <div className="px-3.5 py-2.5 font-semibold">For: {data.footerCompany}</div>
          <div className="text-center p-3.5">
            <div className="font-extrabold text-sm">{data.footerCompany}</div>
            <div className="text-[10.5px] mt-0.5">{data.footerAddress}</div>
            <div className="text-[10.5px] mt-0.5">{data.footerGst}</div>
            <div className="text-[10.5px] mt-0.5">{data.footerEmail} MobileNo.: {data.footerMobile}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
