import { Minus, Plus } from 'lucide-react';

export default function QuantitySelector({
  quantity = 1,
  onChange,
  maxStock = 10,
  disabled = false,
}) {
  const handleDecrement = () => {
    if (disabled || quantity <= 1) return;
    onChange(quantity - 1);
  };

  const handleIncrement = () => {
    if (disabled || quantity >= maxStock) return;
    onChange(quantity + 1);
  };

  const isAtMax = maxStock > 0 && quantity >= maxStock;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white text-xs uppercase tracking-widest">Quantity</span>
        {!disabled && maxStock > 0 && (
          <span className={`text-[11px] ${maxStock <= 3 ? 'text-orange-400 font-medium' : 'text-neutral-500'}`}>
            {maxStock <= 3 ? `Only ${maxStock} left` : `${maxStock} available`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center border rounded transition-colors ${
            disabled
              ? 'border-white/10 bg-neutral-900/50 opacity-50 cursor-not-allowed'
              : 'border-white/20 bg-neutral-900 focus-within:border-orange-500'
          }`}
        >
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || quantity <= 1}
            aria-label="Decrease quantity"
            className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
          >
            <Minus size={14} />
          </button>

          <span className="w-12 text-center text-sm font-semibold font-mono text-white select-none">
            {quantity}
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || isAtMax}
            aria-label="Increase quantity"
            className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </div>

        {disabled ? (
          <span className="text-[11px] text-neutral-500 italic">Select size first</span>
        ) : isAtMax ? (
          <span className="text-[11px] text-orange-400">Max stock limit</span>
        ) : null}
      </div>
    </div>
  );
}
