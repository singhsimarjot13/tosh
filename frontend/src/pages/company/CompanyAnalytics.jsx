import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getUserInvoices, getDistributors } from "../../api/api";
import KpiCard from "../../components/ui/KpiCard";
import { formatNumber } from "../../utils/formatters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function CompanyAnalytics() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [distributors, setDistributors] = useState([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [invoiceRes, distRes] = await Promise.all([getUserInvoices(), getDistributors()]);
        setInvoices(invoiceRes.data.invoices || []);
        setDistributors(distRes.data.distributors || []);
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.msg || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const topDealers = useMemo(() => {
    const totals = invoices.reduce((acc, invoice) => {
      if (invoice.toUser?.role !== "Dealer") return acc;
      const key = invoice.toUser._id;
      acc[key] = acc[key] || { name: invoice.toUser.name, points: 0 };
      acc[key].points += Number(invoice.totalReward || 0);
      return acc;
    }, {});
    return Object.values(totals).sort((a, b) => b.points - a.points).slice(0, 5);
  }, [invoices]);

  const topDistributors = useMemo(() => {
    const totals = invoices.reduce((acc, invoice) => {
      const dist =
        invoice.createdByRole === "Company"
          ? invoice.toUser
          : invoice.fromUser?.role === "Distributor"
          ? invoice.fromUser
          : null;
      if (!dist?._id) return acc;
      const key = dist._id;
      acc[key] = acc[key] || { name: dist.name, points: 0, lastInvoice: null };
      acc[key].points += Number(invoice.totalReward || 0);
      const date = invoice.invoiceDate || invoice.date;
      if (!acc[key].lastInvoice || new Date(date) > new Date(acc[key].lastInvoice)) {
        acc[key].lastInvoice = date;
      }
      return acc;
    }, {});
    return Object.values(totals).sort((a, b) => b.points - a.points).slice(0, 5);
  }, [invoices]);

  const worstDistributor = useMemo(() => {
    const lastMap = distributors.reduce((acc, dist) => {
      acc[dist._id] = { name: dist.name, bpCode: dist.bpCode, lastInvoice: null };
      return acc;
    }, {});
    invoices
      .filter((invoice) => invoice.createdByRole === "Distributor")
      .forEach((invoice) => {
        const id = invoice.fromUser?._id;
        if (!id || !lastMap[id]) return;
        const date = invoice.invoiceDate || invoice.date;
        if (!lastMap[id].lastInvoice || new Date(date) > new Date(lastMap[id].lastInvoice)) {
          lastMap[id].lastInvoice = date;
        }
      });
    return Object.values(lastMap).sort(
      (a, b) => new Date(a.lastInvoice || 0) - new Date(b.lastInvoice || 0)
    )[0];
  }, [distributors, invoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-100 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Analytics</p>
      <div className="grid gap-6 md:grid-cols-3">
        <KpiCard label="Top dealers" value={formatNumber(topDealers.length)} icon="👥" />
        <KpiCard label="Top distributors" value={formatNumber(topDistributors.length)} icon="🏢" />
        <KpiCard
          label="Worst distributor"
          value={worstDistributor?.name || "No data"}
          sublabel={worstDistributor?.lastInvoice ? `Last invoice: ${new Date(worstDistributor.lastInvoice).toLocaleDateString()}` : "No invoices yet"}
          icon="⚠️"
        />
      </div>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Top dealer performance</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDealers} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="points" fill="#c7a13f" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Top distributor performance</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDistributors} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="points" fill="#111" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

