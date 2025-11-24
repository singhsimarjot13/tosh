import React, { useState, useEffect } from "react";
import { getAllProducts } from "../api/api";

export default function ProductsView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await getAllProducts();
      setProducts(response.data.products);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const search = searchTerm.toLowerCase();
    const description = (product.itemDescription || product.name || "").toLowerCase();
    const itemNo = (product.itemNo || "").toLowerCase();
    return description.includes(search) || itemNo.includes(search);
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Catalog</h1>
            <p className="text-gray-600 text-lg">Browse available products and reward points</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600">{products.length}</div>
            <div className="text-sm text-gray-500">Available Products</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-lg">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search products by item number or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100">
        <div className="p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No products found' : 'No products available'}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search terms' : 'Products will appear here when available'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(product => {
                const rewardsPerPiece = product.rewardsPerPc ?? product.pointsPerUnit ?? 0;
                const rewardsPerDozen = product.rewardsPerDozen ?? rewardsPerPiece * 12;
                const rewardsForBox = product.rewardsForBox ?? rewardsPerPiece * (product.boxQuantity || 0);
                const rewardsForCarton = product.rewardsForCarton ?? rewardsPerPiece * (product.cartonQuantity || 0);

                return (
                  <div key={product._id} className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          {product.imageURL ? (
                            <img
                              src={product.imageURL}
                              alt={product.itemDescription || product.itemNo}
                              className="h-12 w-12 rounded-xl object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {(product.itemDescription || product.itemNo || "?").charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {product.itemDescription || product.name}
                            </h3>
                            <p className="text-sm text-gray-600">{product.itemNo}</p>
                          </div>
                        </div>
                        
                        {product.imageURL && (
                          <div className="mb-4">
                          <img 
                            src={product.imageURL} 
                            alt={product.itemDescription || product.itemNo}
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Rewards / Piece:</span>
                            <span className="text-lg font-bold text-primary-600">
                              {rewardsPerPiece.toLocaleString()} pts
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Rewards / Dozen:</span>
                            <span className="font-semibold text-primary-600">
                              {rewardsPerDozen.toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                            <div>Box Qty: {product.boxQuantity || 0}</div>
                            <div>Carton Qty: {product.cartonQuantity || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          product.status === 'Active'
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                            : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                        }`}>
                          {product.status === 'Active' ? '✅ Active' : '❌ Inactive'}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            Earn {rewardsPerPiece.toLocaleString()} pts / pc
                          </div>
                          <div className="text-xs text-gray-500">
                            Box: {rewardsForBox.toLocaleString()} | Carton: {rewardsForCarton.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {filteredProducts.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-6 border border-primary-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary-800 mb-2">
              Product Summary
            </h3>
            <p className="text-primary-700">
              Showing {filteredProducts.length} of {products.length} products
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
