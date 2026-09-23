import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Star,
  CheckCircle2,
  ThumbsUp,
  Search,
  Trash2,
  Reply,
  Loader2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { authFetch } from '../../lib/adminApi';
import { useToast } from '../../contexts/ToastContext';

const QUICK_SUGGESTIONS = [
  "Thank you for choosing RAINORA! We're thrilled you love the export quality and fit.",
  "We truly appreciate your feedback! We recommend washing inside out in cold water to keep the fabric pristine.",
  "Thank you for your review! Feel free to check out our matching pieces in the same category.",
  "Thanks for your order! We are glad the sizing worked out perfectly for you.",
];

export default function AdminReviews() {
  const { success, error: toastError } = useToast();
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'needs_reply' | 'replied'
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState('all');

  // Replying state
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [revRes, prodRes] = await Promise.all([
        fetch('/api/reviews').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
      ]);
      setReviews(Array.isArray(revRes) ? revRes : []);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
    } catch (err) {
      console.error('Error fetching admin reviews data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartReply = (rev) => {
    setActiveReplyId(rev.id);
    setReplyText(rev.admin_reply || '');
  };

  const handleCancelReply = () => {
    setActiveReplyId(null);
    setReplyText('');
  };

  const handleSaveReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setSubmittingReplyId(reviewId);
    try {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reply',
          reviewId,
          replyText: replyText.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to post reply');
      const updated = await res.json();
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setActiveReplyId(null);
      setReplyText('');
      success('Reply published successfully');
    } catch (err) {
      toastError(err.message);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleDeleteReply = async (reviewId) => {
    if (!window.confirm('Are you sure you want to remove your store reply?')) return;
    setSubmittingReplyId(reviewId);
    try {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reply',
          reviewId,
          replyText: '',
        }),
      });
      if (!res.ok) throw new Error('Failed to delete reply');
      const updated = await res.json();
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      success('Store reply removed successfully');
    } catch (err) {
      toastError(err.message);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm(`Are you sure you want to permanently delete this customer review?`))
      return;
    setDeletingId(reviewId);
    try {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          reviewId,
        }),
      });
      if (!res.ok) throw new Error('Failed to delete review');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      success('Customer review deleted successfully');
    } catch (err) {
      toastError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const productsMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const unrepliedCount = reviews.filter((r) => !r.admin_reply).length;
  const repliedCount = reviews.filter((r) => !!r.admin_reply).length;

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'needs_reply' && r.admin_reply) return false;
    if (filter === 'replied' && !r.admin_reply) return false;
    if (starFilter !== 'all' && Number(r.rating) !== Number(starFilter)) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const prodName = productsMap[r.product_id]?.name?.toLowerCase() || '';
      const custName = r.customer_name?.toLowerCase() || '';
      const comment = r.comment?.toLowerCase() || '';
      return prodName.includes(q) || custName.includes(q) || comment.includes(q);
    }
    return true;
  });

  if (loading) return <p className="text-neutral-500 text-center py-20">Loading customer reviews...</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-serif mb-1">Customer Reviews</h1>
          <p className="text-neutral-500 text-sm">
            Read feedback, reply to customers with thank-yous or suggestions, and moderate reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded font-medium">
            {unrepliedCount} Review(s) Awaiting Reply
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-orange-500 text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('needs_reply')}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
              filter === 'needs_reply'
                ? 'bg-orange-500 text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            Needs Reply ({unrepliedCount})
          </button>
          <button
            onClick={() => setFilter('replied')}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
              filter === 'replied'
                ? 'bg-orange-500 text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            Replied ({repliedCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={starFilter}
            onChange={(e) => setStarFilter(e.target.value)}
            className="bg-neutral-900 border border-white/10 text-white text-xs px-2.5 py-1.5 rounded outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs outline-none focus:border-orange-500 w-full sm:w-44 rounded"
            />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-neutral-950 border border-white/10 rounded-lg py-16 text-center text-neutral-500">
          <p className="text-sm">No reviews found matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((rev) => {
            const product = productsMap[rev.product_id];
            const isReplying = activeReplyId === rev.id;
            const isDeletingThis = deletingId === rev.id;
            const isSubmittingThis = submittingReplyId === rev.id;

            return (
              <div
                key={rev.id}
                className="bg-neutral-950 border border-white/10 p-5 rounded-lg space-y-3.5 transition-colors"
              >
                {/* Top Row: Product preview & review actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  {/* Product preview */}
                  <div className="flex items-center gap-3 min-w-0">
                    {product?.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-10 h-12 object-cover rounded border border-white/10 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">
                        {product?.name || `Product #${rev.product_id}`}
                      </p>
                      <p className="text-neutral-500 text-[11px]">
                        Brand: <span className="text-neutral-300">{product?.brand || 'N/A'}</span> &middot; Category:{' '}
                        <span className="text-neutral-300 capitalize">{product?.category || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleStartReply(rev)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer"
                    >
                      <Reply size={13} />
                      <span>{rev.admin_reply ? 'Edit Reply' : 'Reply'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      disabled={isDeletingThis}
                      title="Delete review"
                      className="text-neutral-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                    >
                      {isDeletingThis ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Customer Review Body */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{rev.customer_name}</span>
                    {rev.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-semibold">
                        <CheckCircle2 size={11} /> Verified Buyer
                      </span>
                    )}
                    <span className="text-neutral-700">&middot;</span>
                    <div className="flex items-center text-orange-500 gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          className={
                            s <= rev.rating ? 'fill-orange-500 text-orange-500' : 'text-neutral-800'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-neutral-500 text-[11px]">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-neutral-300 text-xs leading-relaxed">{rev.comment}</p>

                  {rev.photo_url && (
                    <div className="pt-1">
                      <img
                        src={rev.photo_url}
                        alt="Customer upload"
                        className="w-16 h-18 object-cover rounded border border-white/10"
                      />
                    </div>
                  )}
                </div>

                {/* Existing Admin Reply Box */}
                {rev.admin_reply && !isReplying && (
                  <div className="mt-3 pl-3.5 border-l-2 border-orange-500 bg-orange-500/5 py-2.5 px-3 rounded-r-md text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-[11px]">
                        <MessageSquare size={13} />
                        <span>Official Store Response</span>
                        {rev.replied_at && (
                          <span className="text-neutral-500 font-normal lowercase text-[10px]">
                            &middot; {new Date(rev.replied_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteReply(rev.id)}
                        disabled={isSubmittingThis}
                        className="text-neutral-500 hover:text-red-400 text-[11px] cursor-pointer"
                      >
                        Remove Reply
                      </button>
                    </div>
                    <p className="text-neutral-300 leading-relaxed text-xs">{rev.admin_reply}</p>
                  </div>
                )}

                {/* Reply Form (When Active) */}
                {isReplying && (
                  <div className="mt-3 p-4 bg-neutral-900/70 border border-orange-500/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                        <Reply size={13} />
                        Replying as RAINORA Store Owner to {rev.customer_name}
                      </span>
                      <button
                        onClick={handleCancelReply}
                        className="text-neutral-500 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Quick suggestion template chips */}
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1.5">
                        Quick Suggestions (Click to insert):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_SUGGESTIONS.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReplyText(sug)}
                            className="text-[11px] px-2 py-1 rounded bg-black/40 border border-white/10 text-neutral-400 hover:text-white hover:border-orange-500/40 text-left transition-colors cursor-pointer truncate max-w-xs"
                            title={sug}
                          >
                            <Sparkles size={10} className="inline mr-1 text-orange-500" />
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Write your reply, e.g. "Thank you ${rev.customer_name}! We appreciate your support..."`}
                      className="w-full bg-neutral-950 border border-white/10 focus:border-orange-500 text-white text-xs p-3 rounded outline-none resize-none"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelReply}
                        className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveReply(rev.id)}
                        disabled={!replyText.trim() || isSubmittingThis}
                        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black text-xs font-semibold px-4 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {isSubmittingThis ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Post Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
