import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  ClipboardList,
  Clock,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Boxes,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Plus,
  BarChart3,
  Zap,
  Flame,
} from 'lucide-react';
import { authFetch } from '../../lib/adminApi';
import { CATEGORIES, SIZES, totalStock, statusColor } from '../../lib/constants';

export default function AdminOverview({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [stockAlertTab, setStockAlertTab] = useState('all'); // 'all' | 'out' | 'low'
  const [chartTimeframe, setChartTimeframe] = useState('7d'); // '7d' | '30d' | '12m'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      authFetch('/api/orders').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()).catch(() => null),
    ])
      .then(([p, o, c]) => {
        setProducts(Array.isArray(p) ? p : []);
        setOrders(Array.isArray(o) ? o : []);
        if (Array.isArray(c) && c.length > 0) setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtered orders & core stats
  const nonCancelledOrders = useMemo(
    () => orders.filter((o) => o.status !== 'Cancelled'),
    [orders]
  );

  const revenue = useMemo(
    () => nonCancelledOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    [nonCancelledOrders]
  );

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'Pending').length,
    [orders]
  );

  const outOfStockProducts = useMemo(
    () => products.filter((p) => totalStock(p.sizes) === 0),
    [products]
  );

  const lowStockProducts = useMemo(
    () =>
      products.filter((p) => {
        const t = totalStock(p.sizes);
        return t > 0 && t <= 5;
      }),
    [products]
  );

  const outOfStockCount = outOfStockProducts.length;
  const lowStockCount = lowStockProducts.length;

  // 1. TODAY'S PERFORMANCE METRICS
  const todayStats = useMemo(() => {
    const now = new Date();
    const todayOrders = nonCancelledOrders.filter((o) => {
      const d = new Date(o.created_at);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    });

    const count = todayOrders.length;
    const rev = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const units = todayOrders.reduce((sum, o) => {
      if (Array.isArray(o.items)) {
        return sum + o.items.reduce((itemSum, it) => itemSum + Number(it.qty || 1), 0);
      }
      return sum + 1;
    }, 0);
    const aov = count > 0 ? Math.round(rev / count) : 0;

    return { count, rev, units, aov };
  }, [nonCancelledOrders]);

  // 2. DECISION INSIGHTS METRICS
  const businessInsights = useMemo(() => {
    const aov = nonCancelledOrders.length > 0 ? Math.round(revenue / nonCancelledOrders.length) : 0;

    const catRevMap = {};
    const catUnitsMap = {};
    nonCancelledOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const matchedProd = products.find((p) => p.id === it.product_id || p.name === it.name);
          const catKey = matchedProd?.category || it.category || 'other';
          const lineTotal = Number(it.price || 0) * Number(it.qty || 1);
          catRevMap[catKey] = (catRevMap[catKey] || 0) + lineTotal;
          catUnitsMap[catKey] = (catUnitsMap[catKey] || 0) + Number(it.qty || 1);
        });
      }
    });

    const sortedCats = Object.entries(catRevMap).sort((a, b) => b[1] - a[1]);
    const topCatKey = sortedCats[0]?.[0];
    const topCatRev = sortedCats[0]?.[1] || 0;
    const topCatUnits = topCatKey ? catUnitsMap[topCatKey] || 0 : 0;
    const topCatLabel =
      categories.find((c) => c.key === topCatKey)?.label ||
      (topCatKey ? topCatKey.replace('_', ' ') : 'None yet');
    const topCatShare = revenue > 0 ? Math.round((topCatRev / revenue) * 100) : 0;

    const completedOrders = orders.filter((o) =>
      ['Confirmed', 'Shipped', 'Delivered'].includes(o.status)
    ).length;
    const fulfillmentRate =
      nonCancelledOrders.length > 0
        ? Math.round((completedOrders / nonCancelledOrders.length) * 100)
        : 100;

    return { aov, topCatLabel, topCatRev, topCatUnits, topCatShare, fulfillmentRate };
  }, [nonCancelledOrders, revenue, products, categories, orders]);

  // 3. TOP SELLING PIECES
  const topSellingProducts = useMemo(() => {
    const map = {};
    nonCancelledOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const id = it.product_id;
          if (!map[id]) {
            const prod = products.find((p) => p.id === id) || {};
            map[id] = {
              id,
              name: it.name || prod.name || 'Product',
              brand: prod.brand || '',
              category: prod.category || it.category || '',
              image_url: it.image_url || prod.image_url || '',
              price: Number(it.price || prod.price || 0),
              unitsSold: 0,
              revenue: 0,
              stock: prod.sizes ? totalStock(prod.sizes) : 0,
            };
          }
          map[id].unitsSold += Number(it.qty || 1);
          map[id].revenue += Number(it.price || 0) * Number(it.qty || 1);
        });
      }
    });

    let list = Object.values(map).sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue);

    if (list.length < 5 && products.length > 0) {
      const existingIds = new Set(list.map((p) => p.id));
      const fillers = products
        .filter((p) => !existingIds.has(p.id))
        .slice(0, 5 - list.length)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand || '',
          category: p.category || '',
          image_url: p.image_url || '',
          price: Number(p.price || 0),
          unitsSold: 0,
          revenue: 0,
          stock: totalStock(p.sizes),
        }));
      list = [...list, ...fillers];
    }

    return list.slice(0, 5);
  }, [nonCancelledOrders, products]);

  // 4. SALES REVENUE ANALYTICS CHART DATA (7D, 30D, 12M)
  const chartData = useMemo(() => {
    if (chartTimeframe === '7d') {
      const points = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const dayOrders = nonCancelledOrders.filter((o) => {
          const od = new Date(o.created_at);
          od.setHours(0, 0, 0, 0);
          return od.getTime() === d.getTime();
        });

        const dayRev = dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        points.push({
          label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          revenue: dayRev,
          ordersCount: dayOrders.length,
        });
      }
      return points;
    }

    if (chartTimeframe === '30d') {
      const points = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const dayOrders = nonCancelledOrders.filter((o) => {
          const od = new Date(o.created_at);
          od.setHours(0, 0, 0, 0);
          return od.getTime() === d.getTime();
        });

        const dayRev = dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const showLabel = i % 5 === 0 || i === 29 || i === 0;
        points.push({
          label: showLabel ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          revenue: dayRev,
          ordersCount: dayOrders.length,
        });
      }
      return points;
    }

    const points = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const yr = d.getFullYear();
      const mo = d.getMonth();

      const monthOrders = nonCancelledOrders.filter((o) => {
        const od = new Date(o.created_at);
        return od.getFullYear() === yr && od.getMonth() === mo;
      });

      const monthRev = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      points.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        fullDate: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        revenue: monthRev,
        ordersCount: monthOrders.length,
      });
    }
    return points;
  }, [chartTimeframe, nonCancelledOrders]);

  const chartPeriodTotalRevenue = useMemo(
    () => chartData.reduce((sum, p) => sum + p.revenue, 0),
    [chartData]
  );
  const chartPeriodTotalOrders = useMemo(
    () => chartData.reduce((sum, p) => sum + p.ordersCount, 0),
    [chartData]
  );
  const chartMaxRevenue = useMemo(
    () => Math.max(...chartData.map((p) => p.revenue), 1000),
    [chartData]
  );

  // Category distribution
  const categoryCounts = useMemo(
    () =>
      categories
        .map((c) => ({
          ...c,
          count: products.filter((p) => p.category === c.key).length,
        }))
        .sort((a, b) => b.count - a.count),
    [categories, products]
  );

  // Alert products
  const displayedAlertProducts =
    stockAlertTab === 'out'
      ? outOfStockProducts
      : stockAlertTab === 'low'
      ? lowStockProducts
      : [...outOfStockProducts, ...lowStockProducts];

  if (loading) {
    return <p className="text-neutral-500 text-center py-20">Loading dashboard intelligence...</p>;
  }

  return (
    <div className="space-y-8">
      {/* ---------------- HEADER & CONCISE QUICK ACTIONS ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-white text-2xl font-serif mb-1">Business Intelligence & Overview</h1>
          <p className="text-neutral-500 text-xs sm:text-sm">
            Sales velocity, inventory health, and fast decision-making insights.
          </p>
        </div>

        {/* Quick Actions (Orders and Add Product only) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate && onNavigate('orders')}
            className="flex items-center gap-2 bg-neutral-900 border border-white/15 hover:border-orange-500/60 text-neutral-200 hover:text-white px-4 py-2 text-xs rounded font-medium transition-colors cursor-pointer"
          >
            <ShoppingBag size={14} className="text-orange-500" />
            <span>Orders</span>
            {pendingOrders > 0 && (
              <span className="bg-orange-500 text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {pendingOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate && onNavigate('products')}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-black font-semibold px-4 py-2 text-xs rounded transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ---------------- 1. TODAY'S PERFORMANCE HERO SECTION ---------------- */}
      <div className="bg-gradient-to-r from-neutral-950 via-neutral-900/60 to-neutral-950 border border-orange-500/30 rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-white text-sm sm:text-base font-medium flex items-center gap-2">
              <Zap size={16} className="text-orange-500" /> Today's Performance
            </h2>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black/50 border border-white/10 p-4 rounded-lg">
            <p className="text-neutral-400 text-xs font-medium">Today's Revenue</p>
            <p className="text-2xl sm:text-3xl text-orange-400 font-serif font-semibold mt-1">
              {todayStats.rev.toLocaleString()} TK
            </p>
            <p className="text-neutral-500 text-[11px] mt-1">
              {todayStats.count > 0 ? `From ${todayStats.count} order(s)` : 'No orders recorded yet today'}
            </p>
          </div>

          <div className="bg-black/50 border border-white/10 p-4 rounded-lg">
            <p className="text-neutral-400 text-xs font-medium">Today's Orders</p>
            <p className="text-2xl sm:text-3xl text-white font-serif font-semibold mt-1">
              {todayStats.count}
            </p>
            <p className="text-neutral-500 text-[11px] mt-1">
              {todayStats.units} total items / units
            </p>
          </div>

          <div className="bg-black/50 border border-white/10 p-4 rounded-lg">
            <p className="text-neutral-400 text-xs font-medium">Products Sold Today</p>
            <p className="text-2xl sm:text-3xl text-white font-serif font-semibold mt-1">
              {todayStats.units}
            </p>
            <p className="text-neutral-500 text-[11px] mt-1">
              Units checked out by shoppers
            </p>
          </div>

          <div className="bg-black/50 border border-white/10 p-4 rounded-lg">
            <p className="text-neutral-400 text-xs font-medium">Today's Avg Order Value</p>
            <p className="text-2xl sm:text-3xl text-emerald-400 font-serif font-semibold mt-1">
              {todayStats.aov.toLocaleString()} TK
            </p>
            <p className="text-neutral-500 text-[11px] mt-1">
              {todayStats.count > 0 ? 'Per basket average' : 'Awaiting first order'}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- 2. STOCK & INVENTORY ALERTS ---------------- */}
      <div className="bg-neutral-950 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-white text-sm font-medium flex items-center gap-2">
              <Boxes size={16} className="text-orange-500" /> Stock & Inventory Alerts
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Review items that need immediate restocking or are running low on specific sizes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setStockAlertTab('all')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                stockAlertTab === 'all'
                  ? 'bg-orange-500 text-black font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              All Alerts ({outOfStockCount + lowStockCount})
            </button>
            <button
              onClick={() => setStockAlertTab('out')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                stockAlertTab === 'out'
                  ? 'bg-red-500 text-black font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
            <button
              onClick={() => setStockAlertTab('low')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                stockAlertTab === 'low'
                  ? 'bg-yellow-500 text-black font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
          </div>
        </div>

        {displayedAlertProducts.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 flex flex-col items-center gap-2">
            <CheckCircle2 size={32} className="text-emerald-500/60" />
            <p className="text-sm text-neutral-300">
              {stockAlertTab === 'out'
                ? 'No products are currently out of stock.'
                : stockAlertTab === 'low'
                ? 'No products are currently low on stock.'
                : 'All products are well stocked! No inventory alerts.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {displayedAlertProducts.map((p) => {
              const currentTotal = totalStock(p.sizes);
              const isOut = currentTotal === 0;

              return (
                <div
                  key={p.id}
                  className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-12 h-14 object-cover shrink-0 rounded border border-white/5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                        {isOut ? (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
                            Low Stock: {currentTotal} left
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        Brand: <span className="text-neutral-300">{p.brand || 'N/A'}</span> &middot; Category:{' '}
                        <span className="text-neutral-300 capitalize">{p.category}</span> &middot; Price:{' '}
                        <span className="text-orange-400 font-mono">{p.price}TK</span>
                      </p>
                    </div>
                  </div>

                  {/* Size inventory breakdown */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-neutral-500 mr-1">Sizes:</span>
                    {SIZES.map((size) => {
                      const qty = Number(p.sizes?.[size] ?? 0);
                      const isSizeEmpty = qty === 0;
                      const isSizeLow = qty > 0 && qty <= 2;

                      return (
                        <span
                          key={size}
                          className={`text-xs px-2 py-1 rounded border font-mono ${
                            isSizeEmpty
                              ? 'bg-red-500/10 border-red-500/30 text-red-400 font-bold'
                              : isSizeLow
                              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                              : 'bg-neutral-900 border-white/10 text-neutral-300'
                          }`}
                          title={`${size}: ${qty} in stock`}
                        >
                          {size}: {qty}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- 3. PRODUCTS BY CATEGORY DISTRIBUTION ---------------- */}
      <div className="bg-neutral-950 border border-white/10 p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-white text-sm font-medium flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-500" /> Products by Category Distribution
            </h2>
            <p className="text-neutral-500 text-xs mt-0.5">
              Breakdown of total catalog items across active product categories.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {products.length} total products
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {categoryCounts.map((c) => (
            <div key={c.key}>
              <div className="flex justify-between text-xs text-neutral-300 mb-1.5">
                <span className="font-medium">{c.label}</span>
                <span className="font-mono text-neutral-400">
                  {c.count} {c.count === 1 ? 'item' : 'items'} (
                  {products.length ? Math.round((c.count / products.length) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-neutral-900 border border-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${products.length ? (c.count / products.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- 4. TOP SELLING PIECES ---------------- */}
      <div className="bg-neutral-950 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-white text-sm font-medium flex items-center gap-2">
              <Sparkles size={16} className="text-orange-500" /> Top Selling Pieces
            </h2>
            <p className="text-neutral-500 text-xs mt-0.5">
              Ranked by customer demand, order volume, and generated revenue.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('products')}
            className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            Manage Catalog <ArrowRight size={12} />
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {topSellingProducts.map((p, idx) => {
            const isOut = p.stock === 0;
            const isLow = p.stock > 0 && p.stock <= 5;

            return (
              <div key={p.id} className="py-3 flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-neutral-500 w-5">{idx + 1}</span>
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-12 h-14 object-cover rounded border border-white/10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs sm:text-sm font-medium truncate">{p.name}</p>
                  <p className="text-neutral-500 text-[11px] capitalize mt-0.5">
                    {p.brand ? `${p.brand} · ` : ''}{p.category}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-orange-400 font-bold font-mono">
                      {p.unitsSold} units sold
                    </span>
                    {p.revenue > 0 && (
                      <span className="text-[11px] text-neutral-400 font-mono">
                        &middot; {p.revenue.toLocaleString()} TK revenue
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {isOut ? (
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-semibold block">
                      Out of Stock
                    </span>
                  ) : isLow ? (
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded font-semibold block">
                      Low: {p.stock} left
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 font-mono block">
                      {p.stock} in stock
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- 5. DECISION INSIGHTS ---------------- */}
      <div className="space-y-3">
        <div>
          <h2 className="text-white text-sm font-medium flex items-center gap-2">
            <Flame size={15} className="text-orange-500" /> Decision Insights
          </h2>
          <p className="text-neutral-500 text-xs mt-0.5">
            Key indicators to help you plan restocking, marketing, and order fulfillment fast.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-neutral-950 border border-white/10 p-4 rounded-lg">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Best Selling Category</span>
              <span className="text-orange-500 font-bold font-mono">{businessInsights.topCatShare}%</span>
            </div>
            <p className="text-lg text-white font-serif font-medium capitalize truncate">
              {businessInsights.topCatLabel}
            </p>
            <p className="text-neutral-500 text-[11px] mt-1">
              Generated {businessInsights.topCatRev.toLocaleString()} TK ({businessInsights.topCatUnits} units sold)
            </p>
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">Restock Priority</span>
              <span className="text-orange-400 font-medium">Keep in stock</span>
            </div>
          </div>

          <div className="bg-neutral-950 border border-white/10 p-4 rounded-lg">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Average Order Value</span>
              <Wallet size={13} className="text-emerald-400" />
            </div>
            <p className="text-lg text-emerald-400 font-serif font-medium">
              {businessInsights.aov.toLocaleString()} TK
            </p>
            <p className="text-neutral-500 text-[11px] mt-1">
              Across {nonCancelledOrders.length} active customer orders
            </p>
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">Basket Strategy</span>
              <span className="text-neutral-300">Target: multi-item sets</span>
            </div>
          </div>

          <div className="bg-neutral-950 border border-white/10 p-4 rounded-lg">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Fulfillment Health</span>
              <span
                className={`text-xs font-bold font-mono ${
                  businessInsights.fulfillmentRate >= 80 ? 'text-green-400' : 'text-yellow-400'
                }`}
              >
                {businessInsights.fulfillmentRate}%
              </span>
            </div>
            <p className="text-lg text-white font-serif font-medium">
              {orders.length - pendingOrders} / {orders.length} Processed
            </p>
            <p className="text-neutral-500 text-[11px] mt-1">
              {pendingOrders} order(s) currently pending confirmation
            </p>
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">Action</span>
              <button
                onClick={() => onNavigate && onNavigate('orders')}
                className="text-orange-400 hover:text-orange-300 font-medium cursor-pointer"
              >
                Review Pending
              </button>
            </div>
          </div>

          <div className="bg-neutral-950 border border-white/10 p-4 rounded-lg">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Inventory Restock Alert</span>
              <AlertTriangle size={13} className="text-red-400" />
            </div>
            <p className="text-lg text-white font-serif font-medium">
              {outOfStockCount + lowStockCount} Needs Attention
            </p>
            <p className="text-neutral-500 text-[11px] mt-1">
              {outOfStockCount} out of stock &middot; {lowStockCount} low stock (&le;5)
            </p>
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">Fast Action</span>
              <button
                onClick={() => setStockAlertTab('out')}
                className="text-red-400 hover:text-red-300 font-medium cursor-pointer"
              >
                View Stock Alerts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 6. SALES REVENUE ANALYSIS CHART ---------------- */}
      <div className="bg-neutral-950 border border-white/10 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-orange-500" />
              <h2 className="text-white text-base font-serif font-medium">Sales Revenue Analysis</h2>
            </div>
            <p className="text-neutral-500 text-xs mt-0.5">
              Track revenue momentum and order volume over selectable periods.
            </p>
          </div>

          {/* Timeframe selector tabs */}
          <div className="flex items-center bg-neutral-900 p-1 rounded-lg border border-white/10 text-xs self-start sm:self-auto">
            <button
              onClick={() => {
                setChartTimeframe('7d');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                chartTimeframe === '7d'
                  ? 'bg-orange-500 text-black font-semibold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => {
                setChartTimeframe('30d');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                chartTimeframe === '30d'
                  ? 'bg-orange-500 text-black font-semibold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => {
                setChartTimeframe('12m');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                chartTimeframe === '12m'
                  ? 'bg-orange-500 text-black font-semibold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>

        {/* Period Summary Badges */}
        <div className="flex items-center gap-4 sm:gap-6 border-y border-white/5 py-3 text-xs flex-wrap">
          <div>
            <span className="text-neutral-500">Period Revenue:</span>{' '}
            <span className="text-white font-semibold font-mono text-sm ml-1">
              {chartPeriodTotalRevenue.toLocaleString()} TK
            </span>
          </div>
          <div>
            <span className="text-neutral-500">Period Orders:</span>{' '}
            <span className="text-white font-semibold font-mono text-sm ml-1">
              {chartPeriodTotalOrders}
            </span>
          </div>
          <div>
            <span className="text-neutral-500">Period AOV:</span>{' '}
            <span className="text-orange-400 font-semibold font-mono text-sm ml-1">
              {chartPeriodTotalOrders > 0
                ? Math.round(chartPeriodTotalRevenue / chartPeriodTotalOrders).toLocaleString()
                : 0}{' '}
              TK
            </span>
          </div>
          {hoveredPoint && (
            <div className="ml-auto bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded text-[11px] text-orange-300 font-mono">
              {hoveredPoint.fullDate}:{' '}
              <span className="font-bold">{hoveredPoint.revenue.toLocaleString()} TK</span> (
              {hoveredPoint.ordersCount} orders)
            </div>
          )}
        </div>

        {/* Interactive SVG Chart */}
        <div className="relative pt-2 pb-1">
          <svg
            viewBox="0 0 600 200"
            className="w-full h-48 sm:h-56 overflow-visible select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                <stop offset="60%" stopColor="#f97316" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = 20 + 130 * (1 - pct);
              return (
                <g key={idx}>
                  <line
                    x1="45"
                    y1={y}
                    x2="590"
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="40"
                    y={y + 3}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.3)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {Math.round(chartMaxRevenue * pct) >= 1000
                      ? `${(Math.round(chartMaxRevenue * pct) / 1000).toFixed(1)}k`
                      : Math.round(chartMaxRevenue * pct)}
                  </text>
                </g>
              );
            })}

            {/* SVG Area & Polyline */}
            {(() => {
              const count = chartData.length;
              if (count === 0) return null;

              const points = chartData.map((d, i) => {
                const x = 45 + (i / (count - 1 || 1)) * 545;
                const y = 20 + 130 - (d.revenue / chartMaxRevenue) * 130;
                return { x, y, d };
              });

              const linePath = points.reduce(
                (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
                ''
              );
              const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} 150 L ${points[0].x.toFixed(1)} 150 Z`;

              return (
                <>
                  {/* Shaded Area */}
                  <path d={areaPath} fill="url(#areaGradient)" />

                  {/* Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Circles & Hover Rects */}
                  {points.map((p, i) => {
                    const isHovered = hoveredPoint?.fullDate === p.d.fullDate;
                    const stepWidth = 545 / count;

                    return (
                      <g key={i}>
                        {/* Invisible hover slice */}
                        <rect
                          x={Math.max(45, p.x - stepWidth / 2)}
                          y="10"
                          width={stepWidth}
                          height="160"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(p.d)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />

                        {/* Guide line on hover */}
                        {isHovered && (
                          <line
                            x1={p.x}
                            y1="20"
                            x2={p.x}
                            y2="150"
                            stroke="#f97316"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                        )}

                        {/* Point dot */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 5.5 : p.d.revenue > 0 ? 3.5 : 2}
                          fill={isHovered ? '#ffedd5' : '#f97316'}
                          stroke="#000"
                          strokeWidth={isHovered ? 2 : 1}
                          className="pointer-events-none transition-all"
                        />

                        {/* X-axis Label */}
                        {p.d.label && (
                          <text
                            x={p.x}
                            y="170"
                            textAnchor="middle"
                            fill={isHovered ? '#f97316' : 'rgba(255,255,255,0.4)'}
                            fontSize="9"
                            fontFamily="monospace"
                            className="pointer-events-none"
                          >
                            {p.d.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>
      </div>
    </div>
  );
}
