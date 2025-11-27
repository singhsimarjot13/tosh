import React, { useState } from "react";
import toast from "react-hot-toast";
import UploadCard from "../../components/ui/UploadCard";
import { uploadDealers } from "../../api/api";

export default function DistributorUploadDealers() {
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = async ({ file }) => {
    if (!file) {
      toast.error("Select a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setSubmitting(true);
    try {
      const res = await uploadDealers(formData);
      const success = res.data?.successCount ?? 0;
      const failed = res.data?.failedCount ?? 0;
      setResult({
        title: "Bulk dealer upload",
        message: `Success: ${success} • Failed: ${failed}`,
        details: res.data?.failed
          ?.map((row, index) => `${index + 1}. ${row.error}`)
          .slice(0, 5)
          .join("\n")
      });
      toast.success(res.data?.msg || "Dealer list processed.");
    } catch (error) {
      console.error("Dealer upload failed:", error);
      toast.error(error?.response?.data?.msg || "Unable to upload dealers.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 text-white">
      <header className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#090a0d] via-[#111217] to-[#050506] p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Bulk onboarding</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Upload dealer roster</h1>
        <p className="mt-2 text-sm text-gray-400">
          Use the official spreadsheet template so every dealer receives access instantly. Upload status and backend
          messages appear below in real time.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-[#0b0c10] p-8">
          <h2 className="text-2xl font-semibold text-white">Bulk add instructions</h2>
          <ul className="mt-6 space-y-3 text-sm text-gray-400">
            <li>• Keep phone numbers unique and include ISD code when possible.</li>
            <li>• Company name + city help finance identify invoices quickly.</li>
            <li>• Reward wallet is activated automatically after a successful upload.</li>
          </ul>
          <div className="mt-6 rounded-2xl border border-[#f5c66f]/40 bg-[#111217] p-4 text-sm text-[#f5c66f]">
            Pro tip: use the same file naming format as company invoice upload so compliance reports stay aligned.
          </div>
        </section>

        <UploadCard
          title="Upload Excel / CSV"
          description="Drop the SN Bulk Dealer template here. Accepted formats: .xlsx, .xls, .csv"
          icon="📥"
          ctaLabel="Upload dealer list"
          onSubmit={handleUpload}
          isSubmitting={submitting}
          result={result}
        />
      </div>
    </div>
  );
}


