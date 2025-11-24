import React, { useState, useEffect } from "react";
import { createInvoice, getUserInvoices, getInvoiceSummary, getInvoiceFormData, getProfile } from "../api/api";

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('my-invoices');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        setRole(profile.data.user.role);
      } catch (e) {
        // ignore; role remains null
      }
      await loadInvoiceData();
      await loadFormData();
    };
    init();
  }, []);

  const loadInvoiceData = async () => {
    try {
      // Get current profile first
      const profileRes = await getProfile();
      const userRole = profileRes.data.user.role;
  
      // Distributor → only sent invoices; others → all
      const invoiceType = userRole === 'Distributor' ? 'sent' : 'all';
      const invoicesRes = await getUserInvoices(invoiceType);
  
      // Get summary based on role
      const summaryRes = await getInvoiceSummary(userRole);
  
      // Update states
      setInvoices(invoicesRes.data.invoices);
      console.log("Loaded invoices:", invoicesRes.data.invoices);
      setSummary(summaryRes.data);
  
    } catch (error) {
      console.error("Error loading invoice data:", error);
    }
  };
  

  const loadFormData = async () => {
    try {
      const res = await getInvoiceFormData();
      setProducts(res.data.products || []);
      setUsers(res.data.counterparties || []);
    } catch (error) {
      console.error("Error loading form data:", error);
    }
  };

  const handleCreateInvoice = async (invoiceData) => {
    setLoading(true);
    try {
      await createInvoice(invoiceData);
      setShowForm(false);
      loadInvoiceData();
       // Refresh form data so available stock/allocations update immediately
       loadFormData();
    } catch (error) {
      console.error("Error creating invoice:", error);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Management</h1>
            <p className="text-gray-600 text-lg">Create and manage invoices</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 transform hover:scale-105"
          >
            <span className="mr-2">+</span>
            Create Invoice
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📄</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">{summary.totalInvoices}</h3>
                <p className="text-sm text-gray-600">Total Invoices</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">⭐</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">{summary.totalPoints.toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Total Points</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📈</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">{summary.recentInvoices.length}</h3>
                <p className="text-sm text-gray-600">Recent Activity</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-8">
            <button
              onClick={() => setActiveTab('my-invoices')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 ${
                activeTab === 'my-invoices'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">📄</span>
                <span>My Invoices</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 ${
                activeTab === 'recent'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">🕒</span>
                <span>Recent Activity</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'my-invoices' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">My Invoice History</h2>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                  <p className="text-gray-500 mb-4">Create your first invoice to get started</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                  >
                    + Create Invoice
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map(invoice => (
                    <div key={invoice._id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">📄</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              Invoice #{invoice._id.slice(-6)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {invoice.fromUser.name} → {invoice.toUser.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                  <div className="text-right">
                          <div className="text-lg font-bold text-primary-600">
                            {invoice.points.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">transferred</div>
                        </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Product:</span>
                          <span className="ml-2 font-medium">{invoice.productID.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Quantity:</span>
                          <span className="ml-2 font-medium">{invoice.qty}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <span className="ml-2 font-medium">
                            {new Date(invoice.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recent' && summary && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {summary.recentInvoices.map(invoice => (
                  <div key={invoice._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">📄</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {invoice.fromUser.name} → {invoice.toUser.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {invoice.productID.name} • {new Date(invoice.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-primary-600">
                            {invoice.points?.toLocaleString?.() || 0}
                          </div>
                          <div className="text-xs text-gray-500">transferred</div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Form Modal */}
      {showForm && (
        <InvoiceForm
          products={products}
          users={users}
          onSubmit={handleCreateInvoice}
          onCancel={() => setShowForm(false)}
          loading={loading}
        />
      )}
    </div>
  );
}

 function InvoiceForm({ products, users, onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    toUser: "",
    productID: "",
    qty: "",
    transferPoints: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

   const handleSubmit = (e) => {
    e.preventDefault();
     const qtyNum = parseInt(formData.qty);
     const payload = {
      toUser: formData.toUser,
      productID: formData.productID,
       qty: qtyNum
    };
    if (formData.transferPoints !== "") {
      payload.transferPoints = parseInt(formData.transferPoints);
    }
    onSubmit(payload);
  };

   const selectedProduct = products.find(p => p._id === formData.productID);
   const selectedProductRewardsPerPc = selectedProduct
    ? (selectedProduct.rewardsPerPc ?? selectedProduct.pointsPerUnit ?? 0)
    : 0;
   const selectedProductRewardsForBox = selectedProduct
    ? (selectedProduct.rewardsForBox ?? selectedProductRewardsPerPc * (selectedProduct.boxQuantity || 0))
    : 0;
   const selectedProductRewardsForCarton = selectedProduct
    ? (selectedProduct.rewardsForCarton ?? selectedProductRewardsPerPc * (selectedProduct.cartonQuantity || 0))
    : 0;
   const selectedUser = users.find(u => u._id === formData.toUser);
   const isDealerTarget = selectedUser?.role === 'Dealer';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-2xl bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Invoice</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">To User *</label>
              <select
                name="toUser"
                value={formData.toUser}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">Select user</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.role}){user.role === 'Dealer' && user.dealerRewardLimit ? ` • Limit: ${user.dealerRewardLimit}` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Product *</label>
              <select
                name="productID"
                value={formData.productID}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">Select product</option>
                 {products.map(product => {
                   const rewardsPerPc = product.rewardsPerPc ?? product.pointsPerUnit ?? 0;
                   return (
                     <option key={product._id} value={product._id}>
                       {(product.itemDescription || product.name)} ({rewardsPerPc} pts/pc)
                     </option>
                   );
                 })}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity *</label>
               <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                required
                min="1"
                 className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            {selectedProduct && formData.qty && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-primary-800 mb-2">Invoice Summary</h4>
                 <div className="text-sm text-primary-700">
                  <div>Product: {selectedProduct.itemDescription || selectedProduct.name}</div>
                  <div>Quantity: {formData.qty}</div>
                  <div>Rewards per Piece: {selectedProductRewardsPerPc}</div>
                  <div>Rewards per Box: {selectedProductRewardsForBox}</div>
                  <div>Rewards per Carton: {selectedProductRewardsForCarton}</div>
                  <div className="font-semibold mt-2">
                    Earned Points: {(formData.qty * selectedProductRewardsPerPc).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Optional transfer points for Distributor -> Dealer: show only if target is a Dealer */}
            {isDealerTarget && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Transfer Points (optional for Distributor → Dealer)</label>
                <input
                  type="number"
                  name="transferPoints"
                  value={formData.transferPoints}
                  onChange={handleChange}
                  min="0"
                  className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Leave blank to transfer all earned"
                />
                <p className="text-xs text-gray-500 mt-1">Distributor can choose how many points to transfer (capped by dealer limit).</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
