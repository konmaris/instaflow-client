import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useRestaurant } from "./store/restaurant";
import { Menu } from "./pages/Menu";
import { Checkout } from "./pages/Checkout";
import { Track } from "./pages/Track";

export default function App() {
  const { loading, error, restaurant, load } = useRestaurant();

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="flex min-h-full items-center justify-center text-gray-400">
        Loading…
      </div>
    );

  if (error || !restaurant)
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Restaurant not found</h1>
        <p className="text-sm text-gray-500">{error}</p>
        <p className="text-xs text-gray-400">
          Open as <code>?slug=demoresto</code> in dev, or via a restaurant subdomain.
        </p>
      </div>
    );

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Menu />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="track/:orderId" element={<Track />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
