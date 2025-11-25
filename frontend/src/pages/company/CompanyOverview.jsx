import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getDistributors, getAllDealers, getAllProductsAdmin, getUserInvoices } from "../../api/api";
import KpiCard from "../../components/ui/KpiCard";
import { formatNumber } from "../../utils/formatters";

export default function CompanyOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    distributors: 0,
    dealers: 0,
    products: 0,
    companyPoints: 0
  });

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      try {
        const [distRes, dealerRes, productRes, invoiceRes] = await Promise.all([
          getDistributors(),
          getAllDealers(),
          getAllProductsAdmin(),
          getUserInvoices()
        ]);

        const invoices = invoiceRes.data.invoices || [];
        const companyPoints = invoices
          .filter((invoice) => invoice.createdByRole === "Company")
          .reduce((sum, invoice) => sum + Number(invoice.totalReward || 0), 0);

        setStats({
          distributors: distRes.data.distributors?.length || 0,
          dealers: dealerRes.data.dealers?.length || 0,
          products: productRes.data.products?.length || 0,
          companyPoints
        });
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.msg || "Failed to load overview");
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-100 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Overview</p>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total distributors" value={formatNumber(stats.distributors)} icon="🏢" />
        <KpiCard label="Total dealers" value={formatNumber(stats.dealers)} icon="👥" />
        <KpiCard label="Total products" value={formatNumber(stats.products)} icon="📦" />
        <KpiCard label="Points issued" value={`${formatNumber(stats.companyPoints)} pts`} icon="⭐" />
      </div>
    </div>
  );
}

