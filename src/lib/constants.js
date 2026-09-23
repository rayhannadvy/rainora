export const SHOP_INFO = {
  name: 'RAINORA',
  tagline: 'Treasury of the Finest Export Collection',
  whatsapp: '8801305986630',
  whatsappDisplay: '01305986630',
  phone: '01305986630',
  address: '2nd floor, Aslam Villa (Besides Metro Provati counter), GEC road, 2 number gate, Chattogram 4203',
  facebook: 'https://www.facebook.com/rainora.fabrics',
  instagram: 'https://www.instagram.com/rainora.fabrics',
  offerBannerTitle: 'Special Offers',
  offerBannerSubtitle: "Grab these export pieces before the discount runs out \u2014 limited stock, real savings.",
};

export const CATEGORIES = [
  { key: 'pants', label: 'Denim Pants' },
  { key: 'full_sleeve', label: 'Full-Sleeve Shirts' },
  { key: 'half_sleeve', label: 'Half-Sleeve Shirts' },
  { key: 'polo', label: 'Polo T-Shirts' },
  { key: 'tshirt', label: 'Normal T-Shirts' },
];

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

export const DEFAULT_STOCK = { S: 10, M: 10, L: 10, XL: 10, XXL: 0 };

// NOTE: Product stock quantities are stored in the `sizes` jsonb column on
// the `products` table (repurposed from a plain boolean map to per-size
// quantities, e.g. { S: 10, M: 0, L: 5, XL: 10, XXL: 0 }). A size is
// considered in-stock/available whenever its quantity is greater than 0.
export function isSizeAvailable(stock, size) {
  const qty = Number(stock?.[size] ?? 0);
  return qty > 0;
}

export function getStockQty(stock, size) {
  return Number(stock?.[size] ?? 0);
}

export function totalStock(stock) {
  if (!stock) return 0;
  return SIZES.reduce((sum, s) => sum + getStockQty(stock, s), 0);
}

export function statusColor(status) {
  switch (status) {
    case 'Pending':
      return 'text-yellow-400 border-yellow-400/40';
    case 'Confirmed':
      return 'text-blue-400 border-blue-400/40';
    case 'Shipped':
      return 'text-purple-400 border-purple-400/40';
    case 'Delivered':
      return 'text-green-400 border-green-400/40';
    case 'Cancelled':
      return 'text-red-400 border-red-400/40';
    default:
      return 'text-neutral-400 border-neutral-400/40';
  }
}
