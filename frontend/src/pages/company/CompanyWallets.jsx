import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getUserInvoices, companyDeductDistributor, getDistributors } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import { formatNumber } from "../../utils/formatters";

const tabOptions = [
  { id: "company", label: "My Transactions" },
  { id: "all", label: "All Transactions" }
];

export default function CompanyWallets() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [tab, setTab] = useState("company");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [deductForm, setDeductForm] = useState({ distributorId: "", points: "", note: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoiceRes, distributorRes] = await Promise.all([getUserInvoices(), getDistributors()]);
      setInvoices(invoiceRes.data.invoices || []);
      setDistributors(distributorRes.data.distributors || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const companyTransfers = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.createdByRole === "Company")
        .map((invoice) => ({
          id: invoice._id,
          distributor: invoice.toUser?.name,
          dealer: invoice.toUser?.role === "Dealer" ? invoice.toUser?.name : "—",
          bpCode: invoice.toUser?.bpCode,
          points: invoice.totalReward || 0,
          date: invoice.invoiceDate || invoice.date,
          type: "Company"
        })),
    [invoices]
  );

  const allTransfers = useMemo(
    () =>
      invoices.map((invoice) => ({
        id: invoice._id,
        distributor: invoice.createdByRole === "Company" ? invoice.toUser?.name : invoice.fromUser?.name,
        dealer: invoice.toUser?.role === "Dealer" ? invoice.toUser?.name : "—",
        bpCode: invoice.toUser?.bpCode || invoice.fromUser?.bpCode,
        points: invoice.totalReward || 0,
        date: invoice.invoiceDate || invoice.date,
        type: invoice.createdByRole
      })),
    [invoices]
  );

  const dataset = tab === "company" ? companyTransfers : allTransfers;
  const paged = dataset.slice((page - 1) * pageSize, page * pageSize);

  const handleDeduct = async (event) => {
    event.preventDefault();
    if (!deductForm.distributorId) return;
    try {
      await companyDeductDistributor(deductForm.distributorId, Number(deductForm.points), deductForm.note);
      toast.success("Points deducted");
      setDeductForm({ distributorId: "", points: "", note: "" });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || "Failed to deduct points");
    }
  };

  return (
    <div className="space-y-8">
      <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Wallets</p>
      <div className="flex flex-wrap gap-3">
        {tabOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setTab(option.id);
              setPage(1);
            }}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
              tab === option.id ? "border-gray-900 text-gray-900" : "border-gray-200 text-gray-500"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-100 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs uppercase tracking-[0.3em] text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Distributor</th>
                  <th className="px-4 py-3 text-left">Dealer</th>
                  <th className="px-4 py-3 text-left">BP Code</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((txn) => (
                  <tr key={txn.id}>
                    <td className="px-4 py-3">{txn.distributor || "—"}</td>
                    <td className="px-4 py-3">{txn.dealer || "—"}</td>
                    <td className="px-4 py-3">{txn.bpCode || "—"}</td>
                    <td className="px-4 py-3">{new Date(txn.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{txn.type}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatNumber(txn.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={dataset.length} onChange={setPage} />
        </div>
      )}

      <form onSubmit={handleDeduct} className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Manual adjustment</p>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Distributor
            <select
              name="distributorId"
              value={deductForm.distributorId}
              onChange={(e) => setDeductForm((prev) => ({ ...prev, distributorId: e.target.value }))}
              required
              className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2"
            >
              <option value="">Select</option>
              {distributors.map((dist) => (
                <option key={dist._id} value={dist._id}>
                  {dist.name} ({dist.bpCode})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Points
            <input
              type="number"
              min="1"
              value={deductForm.points}
              onChange={(e) => setDeductForm((prev) => ({ ...prev, points: e.target.value }))}
              required
              className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Note
            <input
              type="text"
              value={deductForm.note}
              onChange={(e) => setDeductForm((prev) => ({ ...prev, note: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2"
              placeholder="Optional"
            />
          </label>
        </div>
        <button type="submit" className="rounded-2xl bg-[#c7a13f] px-4 py-2 text-sm font-semibold text-white">
          Deduct points
        </button>
      </form>
    </div>
  );
}

