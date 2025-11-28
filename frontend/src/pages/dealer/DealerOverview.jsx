import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getProfile, getUserInvoices, getWalletBalance } from "../../api/api";
import { formatNumber } from "../../utils/formatters";

export default function DealerOverview() {
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, balanceRes, invoicesRes] = await Promise.all([
          getProfile(),
          getWalletBalance(),
          getUserInvoices()
        ]);

        setUser(profileRes.data?.user || null);
        setWalletBalance(balanceRes.data?.balance || 0);
        setInvoices(invoicesRes.data?.invoices || []);
      } catch (error) {
        console.error("Dealer overview load failed:", error);
        toast.error(error?.response?.data?.msg || "Unable to load dealer overview.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const distributorName = useMemo(() => {
    // Best available: latest invoice created by Distributor for this dealer.
    const distributorInvoices = (invoices || []).filter(
      (inv) => inv.createdByRole === "Distributor" && inv.fromUser?.name
    );
    if (!distributorInvoices.length) return "—";
    const latest = [...distributorInvoices].sort(
      (a, b) =>
        new Date(b.invoiceDate || b.date || 0).getTime() -
        new Date(a.invoiceDate || a.date || 0).getTime()
    )[0];
    return latest.fromUser?.name || "—";
  }, [invoices]);

  return (
    <div className="space-y-10 text-white">
      <header className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0c0d11] via-[#111217] to-[#070709] p-10 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Dealer</p>
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-white">
              {user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Dealer Command"}
            </h1>
            <p className="mt-3 text-sm text-gray-400 max-w-xl">
              Track rewards received from your distributor and keep a clear view of your network performance.
            </p>
          </div>
          <div className="rounded-3xl border border-[#f5c66f]/30 bg-[#111217] px-8 py-6 text-right">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Reward points</p>
            <p className="mt-2 text-4xl font-semibold text-white">
              {formatNumber(walletBalance)}
            </p>
            <p className="mt-1 text-xs text-gray-400">Total points available in your wallet.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-[#0b0c10] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Linked distributor</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold text-white">{distributorName}</p>
              <p className="mt-1 text-sm text-gray-400">
                This is the distributor who allocates products and rewards to you.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
              🏢
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0b0c10] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Recent reward activity</p>
          {loading ? (
            <div className="mt-4 h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          ) : !invoices.length ? (
            <p className="mt-4 text-sm text-gray-400">
              No invoices recorded yet. As your distributor shares invoices, they will appear here.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-gray-300">
              {invoices.slice(0, 3).map((invoice) => (
                <li
                  key={invoice._id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">
                      {invoice.fromUser?.name || "Distributor"} →
                      {" You"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {invoice.items?.[0]?.productID?.name ||
                        invoice.items?.[0]?.itemName ||
                        "Multiple products"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#f5c66f]">
                      {formatNumber(invoice.totalReward || 0)} pts
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(invoice.invoiceDate || invoice.date || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}


