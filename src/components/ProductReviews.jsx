import { useState, useEffect, useRef } from 'react';
import {
  Star,
  CheckCircle2,
  ThumbsUp,
  Image as ImageIcon,
  X,
  Loader2,
  ShieldCheck,
  Filter,
  Camera,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

function StarRating({ rating = 5, size = 16, interactive = false, onSelect }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = interactive
          ? (hoverRating || rating) >= star
          : rating >= star;
        const isHalf = !interactive && !isFilled && rating >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onSelect && onSelect(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer p-0.5' : 'cursor-default'}`}
          >
            <Star
              size={size}
              className={`${
                isFilled
                  ? 'fill-orange-500 text-orange-500'
                  : isHalf
                  ? 'fill-orange-500/50 text-orange-500'
                  : 'text-neutral-700'
              } transition-colors`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function ProductReviews({ productId, onReviewsLoaded }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [data, setData] = useState({
    averageRating: 5.0,
    reviewCount: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState('all');
  const [onlyPhotos, setOnlyPhotos] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'highest' | 'helpful'
  const [showAll, setShowAll] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [helpfulVoted, setHelpfulVoted] = useState({});

  // Write Review State
  const [isWriting, setIsWriting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    rating: 5,
    comment: '',
    photo_url: '',
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchReviews = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
      const json = await res.json();
      if (json && Array.isArray(json.reviews)) {
        setData(json);
        if (onReviewsLoaded) {
          onReviewsLoaded({
            averageRating: json.averageRating,
            reviewCount: json.reviewCount,
          });
        }
      }
    } catch (e) {
      console.error('Error loading reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    setStarFilter('all');
    setOnlyPhotos(false);
    setShowAll(false);
  }, [productId]);

  const handleHelpful = async (reviewId) => {
    if (helpfulVoted[reviewId]) return;
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'helpful', reviewId }),
      });
      setHelpfulVoted((prev) => ({ ...prev, [reviewId]: true }));
      setData((prev) => ({
        ...prev,
        reviews: prev.reviews.map((r) =>
          r.id === reviewId ? { ...r, helpful_count: (r.helpful_count || 0) + 1 } : r
        ),
      }));
      toastSuccess('Thank you for your feedback!');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Photo size is too large. Please select an image under 8MB.');
      return;
    }

    setPhotoUploading(true);
    setPhotoPreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload-photo',
            fileName: file.name,
            fileBase64: base64Data,
            contentType: file.type,
          }),
        });
        const json = await res.json();
        if (json?.url) {
          setForm((f) => ({ ...f, photo_url: json.url }));
        } else {
          setForm((f) => ({ ...f, photo_url: base64Data }));
        }
      } catch (uploadErr) {
        console.warn('Upload fallback to inline data:', uploadErr);
        setForm((f) => ({ ...f, photo_url: base64Data }));
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setForm((f) => ({ ...f, photo_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleWriteSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!form.name.trim() || !form.comment.trim()) {
      setSubmitError('Please provide your name and your review.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          rating: form.rating,
          comment: form.comment.trim(),
          photo_url: form.photo_url || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit review');
      const newReview = await res.json();

      // Refresh component state in place immediately
      setData((prev) => {
        const updatedReviews = [newReview, ...(prev.reviews || [])];
        const newCount = (prev.reviewCount || 0) + 1;
        const totalRating = updatedReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0);
        const newAvg = Number((totalRating / newCount).toFixed(1));
        const updatedDist = { ...(prev.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }) };
        const stars = Math.min(5, Math.max(1, Math.round(Number(newReview.rating || 5))));
        updatedDist[stars] = (updatedDist[stars] || 0) + 1;

        if (onReviewsLoaded) {
          onReviewsLoaded({
            averageRating: newAvg,
            reviewCount: newCount,
          });
        }

        return {
          ...prev,
          averageRating: newAvg,
          reviewCount: newCount,
          distribution: updatedDist,
          reviews: updatedReviews,
        };
      });

      setSubmitSuccess(true);
      toastSuccess('Review submitted successfully! Thank you.');
      setTimeout(() => {
        setIsWriting(false);
        setSubmitSuccess(false);
        setForm({ name: '', phone: '', rating: 5, comment: '', photo_url: '' });
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1500);
      fetchReviews();
    } catch (err) {
      setSubmitError(err.message);
      toastError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter and Sort Reviews
  const filteredReviews = (data.reviews || []).filter((r) => {
    if (starFilter !== 'all' && Number(r.rating) !== Number(starFilter)) return false;
    if (onlyPhotos && !r.photo_url) return false;
    return true;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'helpful') return (b.helpful_count || 0) - (a.helpful_count || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const visibleReviews = showAll ? sortedReviews : sortedReviews.slice(0, 3);

  return (
    <div id="customer-reviews" className="mt-12 pt-8 border-t border-white/10 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white text-xl font-serif">Customer Reviews</h3>
            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/30 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold">
              <ShieldCheck size={12} /> Verified Purchases Only
            </span>
          </div>
          <p className="text-neutral-500 text-xs mt-1">
            Real feedback from verified buyers who purchased this item.
          </p>
        </div>

        <button
          onClick={() => {
            setPhotoPreview(null);
            setIsWriting(true);
          }}
          className="bg-neutral-900 hover:bg-orange-500 hover:text-black text-white text-xs font-semibold px-4 py-2 border border-white/10 hover:border-orange-500 transition-colors rounded cursor-pointer self-start sm:self-auto"
        >
          Write a Review
        </button>
      </div>

      {/* Rating Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-900/40 border border-white/10 p-6 rounded-lg mb-8">
        {/* Score & Stars */}
        <div className="flex flex-col items-center justify-center text-center md:border-r border-white/10 pr-4">
          <span className="text-4xl md:text-5xl font-serif text-white font-bold">
            {data.reviewCount > 0 ? data.averageRating.toFixed(1) : '5.0'}
          </span>
          <div className="mt-2">
            <StarRating rating={data.averageRating} size={18} />
          </div>
          <p className="text-neutral-400 text-xs mt-1.5 font-medium">
            Based on {data.reviewCount} verified {data.reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Distribution Bars */}
        <div className="col-span-1 md:col-span-2 space-y-2 justify-center flex flex-col">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = data.distribution?.[stars] || 0;
            const pct = data.reviewCount > 0 ? (count / data.reviewCount) * 100 : 0;
            const isSelected = starFilter === stars;

            return (
              <button
                key={stars}
                onClick={() => setStarFilter(isSelected ? 'all' : stars)}
                className={`w-full flex items-center gap-3 text-xs group cursor-pointer transition-opacity ${
                  starFilter !== 'all' && !isSelected ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className="flex items-center gap-1 w-12 text-neutral-400 text-[11px] group-hover:text-white">
                  <span>{stars}</span>
                  <Star size={11} className="fill-orange-500 text-orange-500" />
                </div>
                <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-neutral-500 text-[11px] w-8 text-right font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-white/5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-neutral-500 text-xs flex items-center gap-1 mr-1">
            <Filter size={12} /> Filter:
          </span>
          <button
            onClick={() => setStarFilter('all')}
            className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer ${
              starFilter === 'all'
                ? 'bg-orange-500 text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            All ({data.reviewCount})
          </button>
          {[5, 4, 3].map((star) => (
            <button
              key={star}
              onClick={() => setStarFilter(starFilter === star ? 'all' : star)}
              className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer ${
                starFilter === star
                  ? 'bg-orange-500 text-black font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              {star} Stars ({data.distribution?.[star] || 0})
            </button>
          ))}
          <button
            onClick={() => setOnlyPhotos((v) => !v)}
            className={`text-xs px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              onlyPhotos
                ? 'bg-orange-500 text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            <ImageIcon size={12} /> With Photos
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-neutral-500 text-xs">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-neutral-900 border border-white/10 text-neutral-300 text-xs px-2.5 py-1 rounded outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-12 text-center text-neutral-500 flex items-center justify-center gap-2 text-xs">
          <Loader2 size={16} className="animate-spin" /> Loading reviews...
        </div>
      ) : sortedReviews.length === 0 ? (
        <div className="py-12 text-center text-neutral-500 bg-neutral-900/30 rounded border border-white/5">
          <p className="text-sm text-neutral-400">No reviews found matching this filter.</p>
          <button
            onClick={() => {
              setStarFilter('all');
              setOnlyPhotos(false);
            }}
            className="mt-2 text-xs text-orange-500 underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-neutral-900/40 border border-white/10 p-5 rounded-lg space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{rev.customer_name}</span>
                    {rev.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-semibold">
                        <CheckCircle2 size={12} /> Verified Buyer
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={rev.rating} size={13} />
                    <span className="text-neutral-500 text-[11px]">
                      {new Date(rev.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Helpful Button */}
                <button
                  onClick={() => handleHelpful(rev.id)}
                  disabled={helpfulVoted[rev.id]}
                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                    helpfulVoted[rev.id]
                      ? 'border-orange-500/40 text-orange-400 bg-orange-500/10'
                      : 'border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <ThumbsUp size={12} />
                  <span>Helpful ({rev.helpful_count || 0})</span>
                </button>
              </div>

              {/* Review Comment (Headline removed per user request) */}
              <p className="text-neutral-300 text-xs leading-relaxed pt-0.5">{rev.comment}</p>

              {rev.photo_url && (
                <div className="pt-2">
                  <img
                    src={rev.photo_url}
                    alt="Customer photo"
                    onClick={() => setLightboxPhoto(rev.photo_url)}
                    className="w-16 h-18 object-cover rounded border border-white/20 cursor-pointer hover:opacity-85 transition-opacity"
                  />
                </div>
              )}

              {/* Store Owner Official Response */}
              {rev.admin_reply && (
                <div className="mt-3 pt-3 border-t border-white/5 pl-3.5 border-l-2 border-orange-500 bg-orange-500/[0.04] py-2 px-3 rounded-r-md text-xs space-y-1">
                  <div className="flex items-center gap-2 text-orange-400 font-semibold text-[11px] uppercase tracking-wider">
                    <span>Response from RAINORA</span>
                    {rev.replied_at && (
                      <span className="text-neutral-500 font-normal lowercase text-[10px]">
                        &middot; {new Date(rev.replied_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-300 leading-relaxed text-xs">{rev.admin_reply}</p>
                </div>
              )}
            </div>
          ))}


          {/* See All Reviews Button */}
          {sortedReviews.length > 3 && (
            <div className="text-center pt-2">
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-orange-500 border border-orange-500/40 hover:bg-orange-500 hover:text-black rounded transition-colors cursor-pointer"
              >
                {showAll ? 'Show Less' : `See All Reviews (${sortedReviews.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Photo Modal */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 cursor-pointer"
        >
          <div className="relative max-w-xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-3 -right-3 z-10 text-white bg-black/70 rounded-full p-1.5 hover:text-orange-500 cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={lightboxPhoto}
              alt="Enlarged review photo"
              className="max-w-full max-h-[80vh] object-contain rounded border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Write a Review Modal Form */}
      {isWriting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative bg-neutral-950 border border-white/10 max-w-lg w-full p-6 sm:p-7 rounded-lg text-left shadow-2xl">
            <button
              onClick={() => setIsWriting(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <h4 className="text-white text-lg font-serif mb-1">Write a Review</h4>
            <p className="text-neutral-500 text-xs mb-5">
              Share your feedback with other customers. Verified purchases only.
            </p>

            {submitSuccess ? (
              <div className="text-center py-10 text-green-400 space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-green-500" />
                <p className="font-semibold text-sm">Thank you for your review!</p>
                <p className="text-xs text-neutral-400">Your review has been verified and posted.</p>
              </div>
            ) : (
              <form onSubmit={handleWriteSubmit} className="space-y-4">
                {submitError && (
                  <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 p-2.5 rounded">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-neutral-400 text-xs uppercase tracking-wider mb-1.5">
                    Your Rating *
                  </label>
                  <StarRating
                    rating={form.rating}
                    size={22}
                    interactive
                    onSelect={(val) => setForm((f) => ({ ...f, rating: val }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tanvir Ahmed"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full bg-neutral-900 border border-white/10 text-white text-xs px-3 py-2 rounded outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">
                      Order Phone (For Verification)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 017xxxxxxxx"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-neutral-900 border border-white/10 text-white text-xs px-3 py-2 rounded outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Review Headline REMOVED per user request */}

                <div>
                  <label className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">
                    Your Review *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="How does the garment fit? Quality of material? Details about sizing..."
                    value={form.comment}
                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                    className="w-full bg-neutral-900 border border-white/10 text-white text-xs px-3 py-2 rounded outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Interactive Customer Photo Upload */}
                <div>
                  <label className="block text-neutral-400 text-xs uppercase tracking-wider mb-1.5">
                    Add a Photo (Optional)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="review-photo-upload"
                  />

                  {photoPreview ? (
                    <div className="relative inline-block mt-1">
                      <img
                        src={photoPreview}
                        alt="Selected review photo preview"
                        className="w-20 h-24 object-cover rounded border border-orange-500/50"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow cursor-pointer"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                      {photoUploading && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded">
                          <Loader2 size={18} className="animate-spin text-orange-500" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <label
                      htmlFor="review-photo-upload"
                      className="flex items-center justify-center gap-2.5 border border-dashed border-white/20 hover:border-orange-500/60 bg-neutral-900/50 hover:bg-neutral-900 px-4 py-3 rounded text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {photoUploading ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-orange-500" />
                          <span>Uploading photo...</span>
                        </>
                      ) : (
                        <>
                          <Camera size={16} className="text-orange-500" />
                          <span>Choose a photo from your camera or gallery</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWriting(false)}
                    className="text-xs text-neutral-400 hover:text-white px-3 py-2 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || photoUploading}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black text-xs font-semibold px-4 py-2 rounded transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
                    Submit Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
