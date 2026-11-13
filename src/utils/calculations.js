export const calculateTotals = (invoice) => {
  const items = invoice.items.map((item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    return { ...item, amount };
  });
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const igst = subtotal * 0.18;
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const tcs = subtotal * 0.01;
  const rto = subtotal * 0.06;
  const total = subtotal + igst + tcs + rto;
  return { ...invoice, items, subtotal, igst, cgst, sgst, tcs, rto, total };
};
