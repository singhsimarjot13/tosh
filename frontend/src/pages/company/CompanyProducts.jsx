import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllProductsAdmin, uploadProducts, createProduct } from "../../api/api";
import UploadCard from "../../components/ui/UploadCard";
import { formatNumber } from "../../utils/formatters";

const ProductCard = ({ product }) => (
  <div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white/90 p-6 shadow-sm lg:flex-row lg:items-center">
    <div className="flex items-center gap-4">
      {product.imageURL ? (
        <img src={product.imageURL} alt={product.itemDescription} className="h-28 w-28 rounded-2xl object-cover" />
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gray-900/90 text-3xl text-white">📦</div>
      )}
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-gray-400">{product.itemNo}</p>
        <p className="text-lg font-semibold text-gray-900">{product.itemDescription}</p>
        <p className="text-sm text-gray-500">
          Box: {product.boxQuantity || 0} • Carton: {product.cartonQuantity || 0}
        </p>
      </div>
    </div>
    <div className="grid flex-1 grid-cols-2 gap-4 xl:grid-cols-4">
      {[
        { key: "rewardsPerPc", label: "Per Piece" },
        { key: "rewardsPerDozen", label: "Per Dozen" },
        { key: "rewardsForBox", label: "Per Box" },
        { key: "rewardsForCarton", label: "Per Carton" }
      ].map((metric) => (
        <div key={metric.key} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{metric.label}</p>
          <p className="text-lg font-semibold text-gray-900">{formatNumber(product[metric.key] || 0)} pts</p>
        </div>
      ))}
    </div>
  </div>
);

export default function CompanyProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [formData, setFormData] = useState({
    itemNo: "",
    itemDescription: "",
    bomType: "Not a BOM",
    boxQuantity: "",
    cartonQuantity: "",
    rewardsPerPc: ""
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await getAllProductsAdmin();
      setProducts(res.data.products || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleProductUpload = async ({ file }) => {
    try {
      const res = await uploadProducts(file);
      setUploadResult({
        title: "Product upload",
        message: `Success: ${res.data.successCount || 0} • Failed: ${res.data.failedCount || 0}`,
        details: res.data.failed?.slice(0, 3).map((row, idx) => `${idx + 1}. ${row.error}`).join("\n")
      });
      toast.success("Products uploaded");
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || "Upload failed");
    }
  };

  const handleSingleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
      await createProduct(payload);
      toast.success("Product created");
      setFormData({ itemNo: "", itemDescription: "", bomType: "Not a BOM", boxQuantity: "", cartonQuantity: "", rewardsPerPc: "" });
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || "Failed to create product");
    }
  };

  return (
    <div className="space-y-8">
      <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Products</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <UploadCard
          title="Bulk upload"
          description="Use the product template to sync catalog data and reward metrics."
          icon="📦"
          onSubmit={handleProductUpload}
          result={uploadResult}
        />
        <form onSubmit={handleSingleSubmit} className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Single product</p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { name: "itemNo", label: "Item Number" },
              { name: "itemDescription", label: "Description" },
              { name: "bomType", label: "BOM Type" },
              { name: "boxQuantity", label: "Box Quantity" },
              { name: "cartonQuantity", label: "Carton Quantity" },
              { name: "rewardsPerPc", label: "Rewards / Piece" }
            ].map((field) => (
              <label key={field.name} className="text-sm font-medium text-gray-700">
                {field.label}
                <input
                  required
                  type="text"
                  value={formData[field.name]}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2"
                />
              </label>
            ))}
          </div>
          <button type="submit" className="rounded-2xl bg-[#c7a13f] px-4 py-2 text-sm font-semibold text-white">
            Add product
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-100 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

