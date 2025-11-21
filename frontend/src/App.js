import React, { useState, useEffect } from "react";
import { getProfile } from "./api/api";
import Login from "./components/Login";
import Layout from "./components/Layout";
import CompanyDashboard from "./pages/CompanyDashboard";
import DistributorDashboard from "./pages/DistributorDashboard";
import DealerDashboard from "./pages/DealerDashboard";

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
        //
      } finally {
        if (mounted) setBootstrapping(false);
      }
    };
  
    init();
  
    return () => { mounted = false };  // prevents re-run
  }, []);
  

  if (bootstrapping) return null;

  // If user is not logged in — show login page
  if (!user) {
    return (
      <Login setUser={setUser} setToken={() => {}} />

    );
  }

  // Dashboard renderer
  const renderDashboard = () => {
    switch (user.role) {
      case "Company":
        return <CompanyDashboard />;
      case "Distributor":
        return <DistributorDashboard />;
      case "Dealer":
        return <DealerDashboard />;
      default:
        return <div>Unknown Role</div>;
    }
  };

  return (
<Layout
  user={user}
  setUser={setUser}
  setToken={() => {}}
>
  {renderDashboard()}
</Layout>

  );
}
export default App;
