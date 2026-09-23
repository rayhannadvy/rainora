import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Check, ArrowLeft, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import QuantitySelector from '../components/QuantitySelector';
import ProductReviews from '../components/ProductReviews';
import RelatedProducts from '../components/RelatedProducts';
import { SIZES, isSizeAvailable, getStockQty } from '../lib/constants';
import { useCart } from '../contexts/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState({ averageRating: 5.0, reviewCount: 0 });
  const { addItem } = useCart();

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSize(null);
    setQuantity(1);
    setAdded(false);
    window.scrollTo({ top: 0, behavior: 'instant' });

    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const found = data.find((p) => String(p.id) === String(id));
          if (found) setProduct(found);
          else setError('Product not found.');
        } else {
          setError('Failed to load product.');
        }
      })
      .catch(() => setError('Failed to load product.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="bg-black min-h-screen text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-40">
          <div className="flex items-center gap-2 text-neutral-400">
            <Loader2 className="animate-spin text-orange-500" size={24} />
            <span>Loading piece...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-black min-h-screen text-white flex flex-col">
        <Header />
        <div className="flex-1 max-w-7xl mx-auto px-5 py-40 text-center">
          <h2 className="text-2xl font-serif text-neutral-300 mb-4">{error || 'Product not found'}</h2>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Return to Shop
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const stock = product.sizes || {};
  const availableSizes = SIZES.filter((s) => isSizeAvailable(stock, s));
  const maxAvailable = size ? getStockQty(stock, size) : 0;
  const onSale = !!(
    product.original_price && Number(product.original_price) > Number(product.price)
  );
  const discountPct = onSale
    ? Math.round(100 - (product.price / product.original_price) * 100)
    : null;

  const handleSizeSelect = (s) => {
    setSize(s);
    const available = getStockQty(stock, s);
    if (quantity > available) {
      setQuantity(Math.max(1, available));
    }
  };

  const handleAdd = () => {
    if (!size) return;
    addItem(product, size, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const scrollToReviews = (e) => {
    e.preventDefault();
    const el = document.getElementById('customer-reviews');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-black min-h-screen text-white flex flex-col">
      <Header />

      <main className="flex-1 pt-28 pb-20 px-5 md:px-8 max-w-6xl mx-auto w-full">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-8">
          <Link to="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-white transition-colors">
            Shop
          </Link>
          <span>/</span>
          <span className="text-neutral-300 truncate max-w-[200px] sm:max-w-none">{product.name}</span>
        </nav>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14">
          {/* Product Image */}
          <div className="relative bg-neutral-900 rounded-lg overflow-hidden aspect-[3/4] md:aspect-auto md:min-h-[500px] border border-white/10">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {onSale && (
              <span className="absolute top-4 left-4 bg-orange-500 text-black text-xs font-bold px-3 py-1.5 uppercase tracking-wider rounded">
                {discountPct ? `-${discountPct}% OFF` : 'Sale'}
              </span>
            )}
          </div>

          {/* Product Information */}
          <div className="flex flex-col justify-between text-left">
            <div>
              <p className="text-neutral-500 text-xs uppercase tracking-widest font-semibold">
                {product.brand || 'RAINORA COLLECTION'}
              </p>

              <h1 className="text-white text-3xl sm:text-4xl font-serif mt-2 tracking-tight">
                {product.name}
              </h1>

              {/* Star Rating Near Title */}
              <div className="mt-2.5 flex items-center gap-2.5">
                <a
                  href="#customer-reviews"
                  onClick={scrollToReviews}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-orange-400 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center text-orange-500">
                    <Star size={15} className="fill-orange-500 text-orange-500" />
                  </div>
                  <span className="font-semibold text-white">
                    {reviewsSummary.reviewCount > 0
                      ? reviewsSummary.averageRating.toFixed(1)
                      : '5.0'}
                  </span>
                  <span className="text-neutral-500 group-hover:underline">
                    ({reviewsSummary.reviewCount}{' '}
                    {reviewsSummary.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </a>
                <span className="text-neutral-700">&middot;</span>
                <span className="text-neutral-400 text-xs capitalize">{product.category}</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-5">
                <span className="text-orange-500 text-3xl font-semibold font-mono">
                  {product.price}TK
                </span>
                {onSale && (
                  <span className="text-neutral-600 text-lg line-through font-mono">
                    {product.original_price}TK
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-neutral-400 text-sm mt-4 leading-relaxed">
                {product.description}
              </p>

              {/* Select Size */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-white text-xs uppercase tracking-widest font-semibold">
                    Select Size
                  </p>
                  {size && (
                    <span className="text-xs text-orange-400 font-medium font-mono">
                      Selected: {size} ({maxAvailable} in stock)
                    </span>
                  )}
                </div>

                <div className="flex gap-2.5 flex-wrap">
                  {SIZES.map((s) => {
                    const isAvailable = isSizeAvailable(stock, s);
                    const isSelected = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSizeSelect(s)}
                        className={`w-12 h-12 border text-sm rounded transition-all cursor-pointer ${
                          !isAvailable
                            ? 'border-white/10 text-neutral-700 line-through cursor-not-allowed bg-neutral-900/40'
                            : isSelected
                            ? 'bg-orange-500 border-orange-500 text-black font-bold ring-1 ring-orange-500'
                            : 'border-white/20 text-white font-bold hover:border-orange-500 bg-neutral-900/60'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>

                {availableSizes.length === 0 && (
                  <p className="text-red-400 text-xs mt-3 font-medium">
                    Currently out of stock in all sizes.
                  </p>
                )}
              </div>
            </div>

            {/* Actions: Quantity Selector & Add to Bag Button */}
            <div className="mt-8 space-y-4 pt-6 border-t border-white/10">
              <QuantitySelector
                quantity={quantity}
                onChange={setQuantity}
                maxStock={maxAvailable}
                disabled={!size || availableSizes.length === 0}
              />

              <button
                type="button"
                onClick={handleAdd}
                disabled={!size || availableSizes.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-semibold py-4 px-6 rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {added ? (
                  <>
                    <Check size={18} className="stroke-[2.5]" />
                    <span>Added to Bag!</span>
                  </>
                ) : (
                  <span>{!size ? 'Select a Size to Add' : `Add ${quantity > 1 ? `${quantity} Items ` : ''}to Bag`}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <ProductReviews
          productId={product.id}
          onReviewsLoaded={setReviewsSummary}
        />

        {/* Related Products: You May Also Like */}
        <RelatedProducts
          currentProduct={product}
          onSelectProduct={(item) => navigate(`/product/${item.id}`)}
        />
      </main>

      <Footer />
    </div>
  );
}
