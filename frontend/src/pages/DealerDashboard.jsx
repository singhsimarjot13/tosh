import React, { useState, useEffect } from "react";
import { getWalletBalance, getWalletTransactions, getUserInvoices, getProfile } from "../api/api";
import ProductsView from "../components/ProductsView";
import ContentView from "../components/ContentView";

export default function DealerDashboard({user}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [boughtProducts, setBoughtProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(user || null);

  const summarizeIncomingProducts = (invoiceRecords, receiverId) => {
    if (!receiverId) return [];
    const summary = new Map();
    const receiverIdStr = String(receiverId);

    invoiceRecords.forEach(invoice => {
      if (invoice.createdByRole !== "Distributor") return;
      const toUserId = invoice.toUser?._id || invoice.toUser;
      if (String(toUserId) !== receiverIdStr) return;

      (invoice.items || []).forEach(item => {
        const productId = item.productID?._id || item.productID || item.itemCode;
        if (!productId) return;
        const key = String(productId);
        const entry = summary.get(key) || {
          productId: key,
          productName: item.productID?.name || item.itemName || "Product",
          totalQty: 0,
          totalPoints: 0,
          lastDate: null
        };

        entry.totalQty += Number(item.qty || 0);
        entry.totalPoints += Number(item.rewardTotal || 0);
        const invoiceDate = new Date(invoice.invoiceDate || invoice.date || Date.now());
        if (!entry.lastDate || invoiceDate > entry.lastDate) {
          entry.lastDate = invoiceDate;
        }

        summary.set(key, entry);
      });
    });

    return Array.from(summary.values());
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      let profileUser = currentUser;
      if (!profileUser) {
        const profileRes = await getProfile();
        profileUser = profileRes.data.user;
        setCurrentUser(profileUser);
      }

      const [balanceRes, transactionsRes, invoicesRes] = await Promise.all([
        getWalletBalance(),
        getWalletTransactions(),
        getUserInvoices()
      ]);

      setWalletBalance(balanceRes.data.balance || 0);
      setTransactions(transactionsRes.data.transactions || []);

      const invoiceList = invoicesRes.data.invoices || [];
      setInvoices(invoiceList);
      setBoughtProducts(summarizeIncomingProducts(invoiceList, profileUser?._id));
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dealer Dashboard</h1>
            <p className="text-gray-600 text-lg">Welcome to your dealer portal</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600">{walletBalance.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Wallet Balance</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">📊</span>
                <span>Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'products'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">📦</span>
                <span>Products</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('bought')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'bought'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">🛒</span>
                <span>Bought Products</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">📄</span>
                <span>Invoices</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'wallet'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">💰</span>
                <span>Wallet</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'content'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">📁</span>
                <span>SN News</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Wallet Summary */}
              <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-800">Wallet Balance</h3>
                    <p className="text-primary-700">Your current reward points</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary-600">{walletBalance.toLocaleString()}</div>
                    <div className="text-sm text-primary-500">points</div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📊</div>
                    <p className="text-gray-500">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map(transaction => (
                      <div key={transaction._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            transaction.type === 'Credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            <span className="text-sm">
                              {transaction.type === 'Credit' ? '⬆️' : '⬇️'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{transaction.type}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${
                          transaction.type === 'Credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'Credit' ? '+' : '-'}{transaction.points.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'bought' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">My Bought Products</h2>
              {boughtProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🛒</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases yet</h3>
                  <p className="text-gray-500">Products you receive via invoices will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward Points</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Purchase</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {boughtProducts.map(bp => (
                        <tr key={bp.productId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bp.productName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bp.totalQty}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(bp.totalPoints || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bp.lastDate ? new Date(bp.lastDate).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === 'invoices' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">My Invoices</h2>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                  <p className="text-gray-500">Invoices you receive from your distributor will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map(inv => (
                        <tr key={inv._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            #{inv._id.slice(-6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{inv.fromUser?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{inv.items?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {(inv.totalReward || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {new Date(inv.invoiceDate || inv.date || Date.now()).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === 'wallet' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">Wallet History</h2>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">💰</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No wallet activity</h3>
                  <p className="text-gray-500">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map(transaction => (
                    <div key={transaction._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'Credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            <span className="text-lg">
                              {transaction.type === 'Credit' ? '⬆️' : '⬇️'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{transaction.type} Transaction</h3>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${
                            transaction.type === 'Credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'Credit' ? '+' : '-'}{transaction.points.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        
          {activeTab === 'content' && <ContentView />}
        </div>
      </div>
    </div>
  );
}