import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getUserInvoices, uploadInvoices } from "../../api/api";
import UploadCard from "../../components/ui/UploadCard";
import DataTable from "../../components/ui/DataTable";
import Pagination from "../../components/ui/Pagination";
import { formatNumber } from "../../utils/formatters";

export default function CompanyInvoices() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [filters, setFilters] = useState({ query: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await getUserInvoices();
      setInvoices(res.data.invoices || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleUpload = async ({ file, fields }) => {
    try {
      const res = await uploadInvoices(file, undefined, fields.invoiceDate);
      setUploadResult({
        title: "Invoice upload",
        message: `Success: ${res.data.successCount || 0} • Failed: ${res.data.failedCount || 0}`,
        details: res.data.failed?.slice(0, 3).map((row, idx) => `${idx + 1}. ${row.error}`).join("\n")
      });
      toast.success("Invoices uploaded");
      loadInvoices();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || "Upload failed");
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.invoiceDate || invoice.date || Date.now());
      const matchText = filters.query
        ? [invoice.invoiceNumber, invoice.fromUser?.name, invoice.toUser?.name]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(filters.query.toLowerCase()))
        : true;
      const matchFrom = filters.from ? invoiceDate >= new Date(filters.from) : true;
      const matchTo = filters.to ? invoiceDate <= new Date(filters.to) : true;
      return matchText && matchFrom && matchTo;
    });
  }, [filters, invoices]);

  const companyInvoices = useMemo(() => invoices.filter((invoice) => invoice.createdByRole === "Company"), [invoices]);
  const companyPoints = companyInvoices.reduce((sum, invoice) => sum + Number(invoice.totalReward || 0), 0);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-8">
      <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Invoices</p>
      <UploadCard
        title="Upload invoice Excel"
        description="Matches the standard template. Invoice date required."
        icon="📄"
        extraFields={[
          { name: "invoiceDate", label: "Invoice Date", type: "date", required: true, placeholder: "YYYY-MM-DD" }
        ]}
        onSubmit={handleUpload}
        result={uploadResult}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Company invoices</p>
          <p className="text-2xl font-semibold text-gray-900">{formatNumber(companyInvoices.length)}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Total invoices</p>
          <p className="text-2xl font-semibold text-gray-900">{formatNumber(invoices.length)}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Company rewards</p>
          <p className="text-2xl font-semibold text-gray-900">{formatNumber(companyPoints)} pts</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Search
            <input
              type="text"
              value={filters.query}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, query: e.target.value }));
                setPage(1);
              }}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2"
              placeholder="Invoice, distributor, dealer"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            From date
            <input
              type="date"
              value={filters.from}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, from: e.target.value }));
                setPage(1);
              }}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            To date
            <input
              type="date"
              value={filters.to}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, to: e.target.value }));
                setPage(1);
              }}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-100 border-t-transparent" />
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                { key: "invoiceNumber", label: "Invoice" },
                {
                  key: "fromUser",
                  label: "From",
                  render: (_, row) => `${row.fromUser?.name || "—"} (${row.createdByRole})`
                },
                {
                  key: "toUser",
                  label: "To",
                  render: (_, row) => row.toUser?.name || "—"
                },
                {
                  key: "totalQty",
                  label: "Total Qty",
                  render: (value) => formatNumber(value || 0)
                },
                {
                  key: "items",
                  label: "Unit of Measure",
                  render: (_, row) => row.items?.map((item) => item.uom).join(", ") || "—"
                },
                {
                  key: "items",
                  label: "Line items",
                  render: (_, row) =>
                    row.items
                      ?.map((item) => `${item.itemName || item.productID?.name} • ${item.qty} ${item.uom}`)
                      .join(", ") || "—"
                },
                {
                  key: "invoiceDate",
                  label: "Date",
                  render: (value, row) => new Date(value || row.date).toLocaleDateString()
                },
                {
                  key: "totalReward",
                  label: "Rewards",
                  render: (value) => `${formatNumber(value || 0)} pts`
                }
              ]}
              data={paged}
            />
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

