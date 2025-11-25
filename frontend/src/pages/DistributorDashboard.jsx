import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getDealers, createDealer, getWalletBalance, getWalletTransactions, getUserInvoices, distributorDeductDealer, uploadDealers, getProfile } from "../api/api";
import ProductsView from "../components/ProductsView";
import InvoiceManagement from "../components/InvoiceManagement";
import ContentView from "../components/ContentView";

export default function DistributorDashboard({user}) {
  const [dealers, setDealers] = useState([]);
  const [showDealerForm, setShowDealerForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [boughtProducts, setBoughtProducts] = useState([]);
	const [showDeductModal, setShowDeductModal] = useState(false);
	const [deductForm, setDeductForm] = useState({ dealerId: '', points: '', note: '' });
	const [deductSubmitting, setDeductSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(user || null);

  const summarizeIncomingProducts = (invoiceRecords, receiverId, creatorRoleFilter) => {
    if (!receiverId) return [];
    const summary = new Map();
    const receiverIdStr = String(receiverId);

    invoiceRecords.forEach(invoice => {
      if (creatorRoleFilter && invoice.createdByRole !== creatorRoleFilter) return;
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

      const [dealersRes, balanceRes, transactionsRes, invoicesRes] = await Promise.all([
        getDealers(),
        getWalletBalance(),
        getWalletTransactions(),
        getUserInvoices()
      ]);

      setDealers(dealersRes.data.dealers || []);
      setWalletBalance(balanceRes.data.balance || 0);
      setTransactions(transactionsRes.data.transactions || []);

      const invoiceList = invoicesRes.data.invoices || [];
      setInvoices(invoiceList);
      setBoughtProducts(summarizeIncomingProducts(invoiceList, profileUser?._id, "Company"));
    } catch (error) {
      console.error("Distributor dashboard load error:", error);
    }
  };
  

	const openDeductModal = (dealer) => {
		setDeductForm({ dealerId: dealer._id, points: '', note: '' });
		setShowDeductModal(true);
	};

	const handleDeductSubmit = async (e) => {
		e.preventDefault();
		if (!deductForm.dealerId || !deductForm.points || Number(deductForm.points) <= 0) {
			toast.error('Please enter a positive points value.');
			return;
		}
		setDeductSubmitting(true);
		try {
			await distributorDeductDealer(deductForm.dealerId, Number(deductForm.points), deductForm.note);
			setShowDeductModal(false);
			setDeductForm({ dealerId: '', points: '', note: '' });
			await loadData();
			toast.success('Points deducted successfully');
		} catch (err) {
			const msg = err?.response?.data?.msg || 'Failed to deduct points';
			toast.error(msg);
		} finally {
			setDeductSubmitting(false);
		}
	};

  const handleCreateDealer = async (dealerData) => {
    setLoading(true);
    try {
      await createDealer(dealerData);
      setShowDealerForm(false);
      loadData();
    } catch (error) {
      console.error("Error creating dealer:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleDistributorBulkDealerUpload = async (file) => {
    setLoading(true);
    try {
      const res = await uploadDealers(file); // no distributorID required
      toast.success(`Dealers processed • Success: ${res.data.successCount}, Failed: ${res.data.failedCount}`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Failed to upload dealers");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Distributor Dashboard</h1>
            <p className="text-gray-600 text-lg">Manage your dealer network</p>
          </div>
          <div className="flex space-x-4">
            <div className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 px-6 py-3 rounded-xl text-sm font-semibold shadow-md">
              <div className="flex items-center space-x-2">
                <span className="text-lg">👥</span>
                <span>{dealers.length} Dealers</span>
              </div>
            </div>
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
              onClick={() => setActiveTab('dealers')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'dealers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">👥</span>
                <span>Dealers</span>
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

              {/* Dealers Summary */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">My Dealers</h3>
                  <button
                    onClick={() => setShowDealerForm(true)}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
                  >
                    <span className="mr-2">➕</span>
                    Add Dealer
                  </button>
                </div>
                {dealers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">👥</div>
                    <p className="text-gray-500">No dealers yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {dealers.slice(0, 6).map(dealer => (
                      <div key={dealer._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="font-medium text-gray-900">{dealer.name}</h4>
                        <p className="text-sm text-gray-600">{dealer.companyName}</p>
                        <p className="text-xs text-gray-500 mt-1">📱 {dealer.mobile}</p>
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
          {activeTab === 'dealers' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">My Dealers</h2>
                <button
                  onClick={() => setShowDealerForm(true)}
                  className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="mr-2">➕</span>
                  Add Dealer
                </button>
              </div>
              {/* Bulk Upload Dealers */} 
<label className="cursor-pointer border p-4 rounded-lg hover:bg-gray-50 transition">
  <span className="flex items-center space-x-2 text-gray-700">
    <span className="text-xl">📥</span>
    <span>Upload Dealers</span>
  </span>

  <input
    type="file"
    accept=".xlsx,.xls,.csv"
    className="hidden"
    onChange={(e) => handleDistributorBulkDealerUpload(e.target.files[0])}
  />
</label>


              {showDealerForm && (
                <DealerForm 
                  onSubmit={handleCreateDealer}
                  onCancel={() => setShowDealerForm(false)}
                  loading={loading}
                />
              )}

				{dealers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">👥</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No dealers yet</h3>
                  <p className="text-gray-500 mb-4">Get started by adding your first dealer</p>
                  <button
                    onClick={() => setShowDealerForm(true)}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
                  >
                    <span className="mr-2">➕</span>
                    Add Your First Dealer
                  </button>
                </div>
				) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dealers.map(dealer => (
                    <div key={dealer._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{dealer.name}</h3>
                          <p className="text-sm text-gray-600">{dealer.companyName}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-500">📱 {dealer.mobile}</p>
                            {dealer.email && (
                              <p className="text-sm text-gray-500">✉️ {dealer.email}</p>
                            )}
                            {dealer.address && (
                              <p className="text-sm text-gray-500">📍 {dealer.address}</p>
                            )}
                            {dealer.businessType && (
                              <p className="text-sm text-gray-500">🏢 {dealer.businessType}</p>
                            )}
                          </div>
                        </div>
                      </div>
								<div className="mt-3 flex items-center justify-between">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Dealer
                        </span>
									<div className="flex items-center space-x-2">
										<button
											onClick={() => openDeductModal(dealer)}
											className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50"
										>
											Deduct Points
										</button>
										<span className="text-xs text-gray-500">
											{new Date(dealer.createdAt).toLocaleDateString()}
										</span>
									</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'invoices' && <InvoiceManagement onInvoiceCreated={loadData} />}
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

		{showDeductModal && (
			<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
				<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
					<div className="mt-3">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Deduct Points from Dealer</h3>
						<form onSubmit={handleDeductSubmit} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">Dealer</label>
								<select
									className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
									value={deductForm.dealerId}
									onChange={(e) => setDeductForm({ ...deductForm, dealerId: e.target.value })}
									required
								>
									<option value="">Select dealer</option>
									{dealers.map(d => (
										<option key={d._id} value={d._id}>{d.name}</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700">Points *</label>
								<input
									type="number"
									min="1"
									value={deductForm.points}
									onChange={(e) => setDeductForm({ ...deductForm, points: e.target.value })}
									required
									className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700">Note (optional)</label>
								<input
									type="text"
									value={deductForm.note}
									onChange={(e) => setDeductForm({ ...deductForm, note: e.target.value })}
									className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
								/>
							</div>

							<div className="flex justify-end space-x-3 pt-2">
								<button
									type="button"
									onClick={() => setShowDeductModal(false)}
									className="px-4 py-2 rounded-md border border-gray-300 text-gray-700"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={deductSubmitting}
									className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-70"
								>
									{deductSubmitting ? 'Processing...' : 'Deduct Points'}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		)}
    </div>
  );
}

function DealerForm({ onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    companyName: "",
    businessType: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Dealer</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Mobile *</label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Type</label>
              <input
                type="text"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Dealer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}