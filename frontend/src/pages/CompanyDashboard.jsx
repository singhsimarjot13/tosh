import React, { useState, useEffect } from "react";
import { getDistributors, getAllDealers, createDistributor, getInvoiceSummary, getWalletSummary, uploadDistributors, uploadProducts, uploadInvoices } from "../api/api";
import ProductManagement from "../components/ProductManagement";
import WalletManagement from "../components/WalletManagement";
import InvoiceManagement from "../components/InvoiceManagement";
import ContentManagement from "../components/ContentManagement";
import DashboardAnalytics from "../components/DashboardAnalytics";

export default function CompanyDashboard() {
  const [distributors, setDistributors] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [showDistributorForm, setShowDistributorForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [distributorsRes, dealersRes, invoiceSummaryRes, walletSummaryRes] = await Promise.all([
        getDistributors(),
        getAllDealers(),
        getInvoiceSummary(),
        getWalletSummary()
      ]);
      setDistributors(distributorsRes.data.distributors);
      setDealers(dealersRes.data.dealers);
      setSummary({
        invoices: invoiceSummaryRes.data,
        wallets: walletSummaryRes.data
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };
  const handleBulkDistributorUpload = async (file) => {
    try {
      setLoading(true);
      const res = await uploadDistributors(file);
      alert(`✔ Distributor Upload Complete\nSuccess: ${res.data.successCount}\nFailed: ${res.data.failedCount}`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to upload distributors");
    } finally {
      setLoading(false);
    }
  };
  
  const handleBulkProductUpload = async (file) => {
    try {
      setLoading(true);
      const res = await uploadProducts(file);
      alert(`✔ Product Upload Complete\nSuccess: ${res.data.successCount}\nFailed: ${res.data.failedCount}`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to upload products");
    } finally {
      setLoading(false);
    }
  };
  
  const handleBulkInvoiceUpload = async (file) => {
    try {
      setLoading(true);
      const res = await uploadInvoices(file);
      alert(`✔ Invoice Upload Complete\nSuccess: ${res.data.successCount}\nFailed: ${res.data.failedCount}`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to upload invoices");
    } finally {
      setLoading(false);
    }
  };
  const handleCreateDistributor = async (distributorData) => {
    setLoading(true);
    try {
      await createDistributor(distributorData);
      setShowDistributorForm(false);
      loadData();
    } catch (error) {
      console.error("Error creating distributor:", error);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Dashboard</h1>
            <p className="text-gray-600 text-lg">Manage your distributors and dealers network</p>
          </div>
          <div className="flex space-x-4">
            <div className="bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 px-6 py-3 rounded-xl text-sm font-semibold shadow-md">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🏢</span>
                <span>{distributors.length} Distributors</span>
              </div>
            </div>
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
              onClick={() => setActiveTab('distributors')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'distributors'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">🏢</span>
                <span>Distributors ({distributors.length})</span>
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
                <span>All Dealers ({dealers.length})</span>
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
              onClick={() => setActiveTab('wallets')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'wallets'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">💰</span>
                <span>Wallets</span>
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
              onClick={() => setActiveTab('content')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'content'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">📁</span>
                <span>Content</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-6 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">📊</span>
                <span>Analytics</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">🏢</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-blue-900">{distributors.length}</h3>
                      <p className="text-sm text-blue-700">Total Distributors</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">👥</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-green-900">{dealers.length}</h3>
                      <p className="text-sm text-green-700">Total Dealers</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">📄</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-purple-900">{summary?.invoices?.totalInvoices || 0}</h3>
                      <p className="text-sm text-purple-700">Total Invoices</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">⭐</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-yellow-900">{(summary?.invoices?.totalPoints || 0).toLocaleString()}</h3>
                      <p className="text-sm text-yellow-700">Total Points</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <button
                    onClick={() => setActiveTab('products')}
                    className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span className="text-2xl mr-3">📦</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Manage Products</div>
                      <div className="text-sm text-gray-500">Add, edit, or delete products</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span className="text-2xl mr-3">📄</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Create Invoice</div>
                      <div className="text-sm text-gray-500">Invoice distributors</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowDistributorForm(true)}
                    className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span className="text-2xl mr-3">🏢</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Add Distributor</div>
                      <div className="text-sm text-gray-500">Register new distributor</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Bulk Upload Section for Company Only */}
<div className="bg-white rounded-xl p-6 border border-gray-200 mt-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Upload</h3>

  <div className="grid gap-4 md:grid-cols-3">

    {/* Distributor Upload */}
    <label className="cursor-pointer border p-4 rounded-lg hover:bg-gray-50 transition">
      <span className="flex items-center space-x-2 text-gray-700">
        <span className="text-xl">🏢</span>
        <span>Upload Distributors</span>
      </span>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => handleBulkDistributorUpload(e.target.files[0])}
      />
    </label>

    {/* Product Upload */}
    <label className="cursor-pointer border p-4 rounded-lg hover:bg-gray-50 transition">
      <span className="flex items-center space-x-2 text-gray-700">
        <span className="text-xl">📦</span>
        <span>Upload Products</span>
      </span>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => handleBulkProductUpload(e.target.files[0])}
      />
    </label>

    {/* Invoice Upload */}
    <label className="cursor-pointer border p-4 rounded-lg hover:bg-gray-50 transition">
      <span className="flex items-center space-x-2 text-gray-700">
        <span className="text-xl">📄</span>
        <span>Upload Invoices</span>
      </span>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => handleBulkInvoiceUpload(e.target.files[0])}
      />
    </label>

  </div>
</div>

          {activeTab === 'products' && <ProductManagement />}
          {activeTab === 'wallets' && <WalletManagement />}
          {activeTab === 'invoices' && <InvoiceManagement />}
          {activeTab === 'content' && <ContentManagement />}
          {activeTab === 'analytics' && <DashboardAnalytics />}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Distributors</h2>
                <button
                  onClick={() => setShowDistributorForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  + Add Distributor
                </button>
              </div>

              {showDistributorForm && (
                <DistributorForm 
                  onSubmit={handleCreateDistributor}
                  onCancel={() => setShowDistributorForm(false)}
                  loading={loading}
                />
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {distributors.map(distributor => (
                  <div key={distributor._id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="h-12 w-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {distributor.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{distributor.name}</h3>
                            <p className="text-sm text-gray-600">{distributor.companyName}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span className="text-primary-500">📱</span>
                            <span>{distributor.mobile}</span>
                          </div>
                          {distributor.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className="text-primary-500">✉️</span>
                              <span>{distributor.email}</span>
                            </div>
                          )}
                          {distributor.address && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className="text-primary-500">📍</span>
                              <span className="truncate">{distributor.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800">
                        🏢 Distributor
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(distributor.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          

          {activeTab === 'dealers' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">All Dealers</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dealers.map(dealer => (
                  <div key={dealer._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{dealer.name}</h3>
                        <p className="text-sm text-gray-600">{dealer.companyName}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-500">📱 {dealer.mobile}</p>
                          {dealer.email && (
                            <p className="text-sm text-gray-500">✉️ {dealer.email}</p>
                          )}
                          {dealer.distributorID && (
                            <p className="text-sm text-gray-500">🏢 {dealer.distributorID.name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Dealer
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(dealer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DistributorForm({ onSubmit, onCancel, loading }) {
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Distributor</h3>
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
                {loading ? "Creating..." : "Create Distributor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}