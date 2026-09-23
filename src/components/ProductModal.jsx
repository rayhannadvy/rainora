import { useState, useEffect, useRef } from 'react';
import { X, Star, Check } from 'lucide-react';
import { SIZES, isSizeAvailable, getStockQty } from '../lib/constants';
import { useCart } from '../contexts/CartContext';
import QuantitySelector from './QuantitySelector';
import ProductReviews from './ProductReviews';
import RelatedProducts from './RelatedProducts';

export default function ProductModal({ product, onClose, onSelectProduct }) {
  const [currentProduct, setCurrentProduct] = useState(product);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState({ averageRating: 5.0, reviewCount: 0 });
  const modalRef = useRef(null);
  const { addItem } = useCart();

  useEffect(() => {
    setCurrentProduct(product);
    setSize(null);
    setQuantity(1);
    setAdded(false);
    if (modalRef.current) {
      modalRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [product]);

  if (!currentProduct) return null;

  const stock = currentProduct.sizes || {};
  const availableSizes = SIZES.filter((s) => isSizeAvailable(stock, s));
  const maxAvailable = size ? getStockQty(stock, size) : 0;
  const onSale = !!(
    currentProduct.original_price &&
    Number(currentProduct.original_price) > Number(currentProduct.price)
  );
  const discountPct = onSale
    ? Math.round(100 - (currentProduct.price / currentProduct.original_price) * 100)
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
    addItem(currentProduct, size, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleSelectRelated = (item) => {
    setCurrentProduct(item);
    setSize(null);
    setQuantity(1);
    setAdded(false);
    if (onSelectProduct) onSelectProduct(item);
    if (modalRef.current) {
      modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToReviews = (e) => {
    e.preventDefault();
    const el = document.getElementById('customer-reviews');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/85 backdrop-blur-xs" />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative bg-neutral-950 border border-white/10 max-w-5xl w-full max-h-[92vh] overflow-y-auto rounded-lg shadow-2xl p-5 sm:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-20 text-neutral-400 hover:text-white bg-black/60 hover:bg-neutral-800 rounded-full p-2 border border-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* 2-Column Product Main Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
          {/* Product Image */}
          <div className="relative bg-neutral-900 rounded-md overflow-hidden aspect-[3/4] md:aspect-auto md:min-h-[420px]">
            <img
              src={currentProduct.image_url}
              alt={currentProduct.name}
              className="w-full h-full object-cover"
            />
            {onSale && (
              <span className="absolute top-3 left-3 bg-orange-500 text-black text-[11px] font-bold px-2.5 py-1 uppercase tracking-wide rounded-xs">
                {discountPct ? `-${discountPct}% OFF` : 'Sale'}
              </span>
            )}
          </div>

          {/* Product Details & Actions */}
          <div className="flex flex-col justify-between text-left">
            <div>
              <p className="text-neutral-500 text-xs uppercase tracking-widest font-medium">
                {currentProduct.brand || 'RAINORA COLLECTION'}
              </p>

              <h2 className="text-white text-2xl sm:text-3xl font-serif mt-1 tracking-tight">
                {currentProduct.name}
              </h2>

              {/* Star Rating Near Title */}
              <div className="mt-2 flex items-center gap-2">
                <a
                  href="#customer-reviews"
                  onClick={scrollToReviews}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-orange-400 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center text-orange-500">
                    <Star size={14} className="fill-orange-500 text-orange-500" />
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
                <span className="text-neutral-400 text-xs capitalize">{currentProduct.category}</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-orange-500 text-2xl font-semibold font-mono">
                  {currentProduct.price}TK
                </span>
                {onSale && (
                  <span className="text-neutral-600 text-base line-through font-mono">
                    {currentProduct.original_price}TK
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-neutral-400 text-sm mt-3.5 leading-relaxed">
                {currentProduct.description}
              </p>

              {/* Size Selector */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white text-xs uppercase tracking-widest">Select Size</p>
                  {size && (
                    <span className="text-xs text-orange-400 font-medium font-mono">
                      Selected: {size} ({maxAvailable} in stock)
                    </span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {SIZES.map((s) => {
                    const isAvailable = isSizeAvailable(stock, s);
                    const isSelected = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSizeSelect(s)}
                        className={`w-11 h-11 border text-sm rounded-xs transition-all cursor-pointer ${
                          !isAvailable
                            ? 'border-white/10 text-neutral-700 line-through cursor-not-allowed bg-neutral-900/30'
                            : isSelected
                            ? 'bg-orange-500 border-orange-500 text-black font-bold ring-1 ring-orange-500'
                            : 'border-white/30 text-white font-bold hover:border-orange-500 bg-neutral-900/60'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>

                {availableSizes.length === 0 && (
                  <p className="text-red-400 text-xs mt-2.5 font-medium">
                    Currently out of stock in all sizes.
                  </p>
                )}
              </div>
            </div>

            {/* Actions: Quantity Selector + Add to Bag Button */}
            <div className="mt-7 space-y-4 pt-4 border-t border-white/5">
              {/* Quantity Selector - positioned above Add to Bag */}
              <QuantitySelector
                quantity={quantity}
                onChange={setQuantity}
                maxStock={maxAvailable}
                disabled={!size || availableSizes.length === 0}
              />

              {/* Add to Bag Button */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={!size || availableSizes.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-semibold py-3.5 px-6 rounded transition-all cursor-pointer flex items-center justify-center gap-2"
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
          productId={currentProduct.id}
          onReviewsLoaded={setReviewsSummary}
        />

        {/* Related Products: You May Also Like Section */}
        <RelatedProducts
          currentProduct={currentProduct}
          onSelectProduct={handleSelectRelated}
        />
      </div>
    </div>
  );
}
