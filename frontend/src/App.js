import React, { useState, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { getProfile } from "./api/api";
import Login from "./components/Login";
import Layout from "./components/Layout";
import DistributorDashboard from "./pages/DistributorDashboard";
import DealerDashboard from "./pages/DealerDashboard";
import CompanyOverview from "./pages/company/CompanyOverview";
import CompanyDistributors from "./pages/company/CompanyDistributors";
import CompanyDealers from "./pages/company/CompanyDealers";
import CompanyProducts from "./pages/company/CompanyProducts";
import CompanyInvoices from "./pages/company/CompanyInvoices";
import CompanyAnalytics from "./pages/company/CompanyAnalytics";
import CompanyContent from "./pages/company/CompanyContent";
import CompanyWallets from "./pages/company/CompanyWallets";

function App() {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const res = await getProfile();
        if (mounted && res?.data?.user) {
          setUser(res.data.user);
        }
      } catch (_) {
        // silently ignore bootstrap errors
      } finally {
        if (mounted) setBootstrapping(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  if (bootstrapping) return null;

  const renderNonCompany = () => {
    if (user?.role === "Distributor") return <DistributorDashboard user={user} />;
    if (user?.role === "Dealer") return <DealerDashboard user={user} />;
    return null;
  };

  if (!user) {
    return (
      <>
        <Login setUser={setUser} setToken={() => {}} />
        <Toaster position="top-center" />
      </>
    );
  }

  if (user.role !== "Company") {
    return (
      <BrowserRouter>
        <Routes>
          <Route
            path="/*"
            element={
              <Layout user={user} setUser={setUser} setToken={() => {}}>
                {renderNonCompany()}
              </Layout>
            }
          />
        </Routes>
        <Toaster position="top-center" />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} setUser={setUser} setToken={() => {}} />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<CompanyOverview />} />
          <Route path="distributors" element={<CompanyDistributors />} />
          <Route path="dealers" element={<CompanyDealers />} />
          <Route path="products" element={<CompanyProducts />} />
          <Route path="invoices" element={<CompanyInvoices />} />
          <Route path="analytics" element={<CompanyAnalytics />} />
          <Route path="content" element={<CompanyContent />} />
          <Route path="wallets" element={<CompanyWallets />} />
        </Route>
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </BrowserRouter>
  );
}

export default App;
