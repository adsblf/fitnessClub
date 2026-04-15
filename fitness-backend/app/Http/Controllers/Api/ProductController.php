<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductSale;
use App\Models\ProductSaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    // ══════════════════════════════════════════════════════
    //  OWNER — управление категориями
    // ══════════════════════════════════════════════════════

    public function indexCategories(): JsonResponse
    {
        $cats = ProductCategory::orderBy('name')->get();
        return response()->json(['data' => $cats]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'slug'          => ['required', 'string', 'max:50', 'unique:product_categories,slug', 'regex:/^[a-z0-9_-]+$/'],
            'is_returnable' => 'boolean',
            'icon'          => 'nullable|string|max:10',
        ]);
        $cat = ProductCategory::create($data);
        return response()->json(['message' => 'Категория создана', 'data' => $cat], 201);
    }

    public function updateCategory(Request $request, int $id): JsonResponse
    {
        $cat  = ProductCategory::findOrFail($id);
        $data = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'slug'          => ['sometimes', 'string', 'max:50', Rule::unique('product_categories', 'slug')->ignore($id), 'regex:/^[a-z0-9_-]+$/'],
            'is_returnable' => 'boolean',
            'icon'          => 'nullable|string|max:10',
        ]);
        if (array_key_exists('is_returnable', $data) && (bool)$data['is_returnable'] !== $cat->is_returnable) {
            $slug = $data['slug'] ?? $cat->slug;
            Product::where('category', $slug)->update(['is_returnable' => $data['is_returnable']]);
        }
        $cat->update($data);
        return response()->json(['message' => 'Категория обновлена', 'data' => $cat->fresh()]);
    }

    public function destroyCategory(int $id): JsonResponse
    {
        $cat = ProductCategory::findOrFail($id);
        if (Product::where('category', $cat->slug)->exists()) {
            return response()->json(['message' => 'Нельзя удалить категорию, в которой есть товары'], 422);
        }
        $cat->delete();
        return response()->json(['message' => 'Категория удалена']);
    }

    // ══════════════════════════════════════════════════════
    //  OWNER — управление каталогом
    // ══════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        $query = Product::orderBy('category')->orderBy('name');
        if ($cat = $request->query('category')) { $query->where('category', $cat); }
        if ($search = $request->query('search')) { $query->where('name', 'ilike', "%{$search}%"); }
        return response()->json(['data' => $query->get()->map(fn($p) => $this->formatProduct($p))]);
    }

    public function store(Request $request): JsonResponse
    {
        $slugs = ProductCategory::pluck('slug')->all();
        $data  = $request->validate([
            'name'           => 'required|string|max:150',
            'category'       => ['required', 'string', Rule::in($slugs)],
            'price'          => 'required|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'description'    => 'nullable|string|max:500',
            'is_active'      => 'boolean',
        ]);
        $category = ProductCategory::where('slug', $data['category'])->firstOrFail();
        $data['is_returnable'] = $category->is_returnable;
        $product = Product::create($data);
        return response()->json(['message' => 'Товар добавлен', 'data' => $this->formatProduct($product)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $slugs   = ProductCategory::pluck('slug')->all();
        $data    = $request->validate([
            'name'           => 'sometimes|string|max:150',
            'category'       => ['sometimes', 'string', Rule::in($slugs)],
            'price'          => 'sometimes|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'description'    => 'nullable|string|max:500',
            'is_active'      => 'boolean',
        ]);
        $catSlug  = $data['category'] ?? $product->category;
        $category = ProductCategory::where('slug', $catSlug)->firstOrFail();
        $data['is_returnable'] = $category->is_returnable;
        $product->update($data);
        return response()->json(['message' => 'Товар обновлён', 'data' => $this->formatProduct($product->fresh())]);
    }

    public function destroy(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        if ($product->saleItems()->exists()) {
            $product->update(['is_active' => false]);
            return response()->json(['message' => 'Товар деактивирован (есть история продаж)']);
        }
        $product->delete();
        return response()->json(['message' => 'Товар удалён']);
    }

    public function restock(Request $request, int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $data    = $request->validate(['quantity' => 'required|integer|min:1']);
        $product->increment('stock_quantity', $data['quantity']);
        return response()->json([
            'message'        => "Склад обновлён: добавлено {$data['quantity']} ед.",
            'stock_quantity' => $product->fresh()->stock_quantity,
        ]);
    }

    // ══════════════════════════════════════════════════════
    //  ADMIN + OWNER — продажи (POS)
    // ══════════════════════════════════════════════════════

    public function listForSale(Request $request): JsonResponse
    {
        $query = Product::where('is_active', true)->orderBy('category')->orderBy('name');
        if ($cat    = $request->query('category')) { $query->where('category', $cat); }
        if ($search = $request->query('search'))   { $query->where('name', 'ilike', "%{$search}%"); }
        $categories = ProductCategory::orderBy('name')->get();
        return response()->json([
            'data'       => $query->get()->map(fn($p) => $this->formatProduct($p)),
            'categories' => $categories,
        ]);
    }

    public function createSale(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payment_method'     => ['required', Rule::in(['cash', 'card_terminal', 'online_sbp'])],
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
        ]);

        $resolved = []; $total = 0.0; $isRefundable = false;
        $needsAcquiring = in_array($data['payment_method'], ['card_terminal', 'online_sbp'], true);

        foreach ($data['items'] as $item) {
            $product = Product::findOrFail($item['product_id']);
            if (!$product->is_active) {
                return response()->json(['message' => "Товар «{$product->name}» недоступен"], 422);
            }
            if ($product->stock_quantity < $item['quantity']) {
                return response()->json(['message' => "Недостаточно товара «{$product->name}» (доступно: {$product->stock_quantity})"], 422);
            }
            $resolved[] = ['product' => $product, 'quantity' => (int) $item['quantity']];
            $total     += (float) $product->price * $item['quantity'];
            if ($product->is_returnable) { $isRefundable = true; }
        }

        return DB::transaction(function () use ($data, $resolved, $total, $isRefundable, $needsAcquiring) {
            $user = auth()->user();
            $user->loadMissing('person.administrator');
            $adminPersonId = $user->person?->administrator?->person_id;
            $txnId = 'PS-' . strtoupper(uniqid());

            $sale = ProductSale::create([
                'administrator_id' => $adminPersonId,
                'total_amount'     => round($total, 2),
                'payment_method'   => $data['payment_method'],
                'status'           => $needsAcquiring ? 'pending_payment' : 'success',
                'is_refundable'    => $isRefundable,
                'paid_at'          => now(),
                'transaction_id'   => $txnId,
            ]);

            foreach ($resolved as $row) {
                ProductSaleItem::create([
                    'product_sale_id' => $sale->id,
                    'product_id'      => $row['product']->id,
                    'quantity'        => $row['quantity'],
                    'unit_price'      => $row['product']->price,
                    'is_returnable'   => $row['product']->is_returnable,
                ]);
                $row['product']->decrement('stock_quantity', $row['quantity']);
            }

            if (!$needsAcquiring) {
                $sale->load('items.product');
                return response()->json(['message' => 'Продажа оформлена', 'data' => $this->formatSale($sale)], 201);
            }

            // Создаём запись о платеже для эмулятора эквайринга
            $payment = \App\Models\Payment::create([
                'client_id'       => null,
                'product_sale_id' => $sale->id,
                'amount'          => round($total, 2),
                'paid_at'         => now(),
                'payment_method'  => $data['payment_method'],
                'status'          => 'pending',
                'purpose'         => 'product_sale',
                'transaction_id'  => $txnId,
            ]);

            $frontend = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
            return response()->json([
                'message'      => 'Продажа зарезервирована. Ожидание оплаты.',
                'redirect_url' => "{$frontend}/payment/{$payment->id}",
                'payment'      => ['id' => $payment->id, 'amount' => $payment->amount],
            ], 201);
        });
    }

    public function listSales(Request $request): JsonResponse
    {
        $query = ProductSale::with(['items.product'])->where('status', 'success')->orderByDesc('paid_at');

        if ($df = $request->query('date_from')) { $query->whereDate('paid_at', '>=', $df); }
        if ($dt = $request->query('date_to'))   { $query->whereDate('paid_at', '<=', $dt); }

        $perPage   = min((int) $request->query('per_page', 25), 100);
        $paginated = $query->paginate($perPage);
        $ids       = $paginated->pluck('id')->all();

        $refundItemsByOriginal = ProductSaleItem::whereIn(
            'product_sale_id',
            ProductSale::whereIn('refund_of_id', $ids)->pluck('id')
        )->get()->groupBy('original_item_id');

        $refundedSet = ProductSale::whereIn('refund_of_id', $ids)
            ->pluck('refund_of_id')->countBy()->all();

        $rows = $paginated->map(function (ProductSale $s) use ($refundItemsByOriginal, $refundedSet) {
            $hasRefund    = isset($refundedSet[$s->id]);
            $withinWindow = $s->paid_at->gte(now()->subDays(14));
            $canRefund    = false;
            if ($withinWindow) {
                foreach ($s->items as $item) {
                    if (!$item->is_returnable) continue;
                    $refunded = $refundItemsByOriginal->get($item->id)?->sum('quantity') ?? 0;
                    if ($refunded < $item->quantity) { $canRefund = true; break; }
                }
            }
            return $this->formatSale($s, $refundItemsByOriginal, $hasRefund, $canRefund);
        });

        $netRevenue = (float) ProductSale::when($request->query('date_from'), fn($q,$v)=>$q->whereDate('paid_at','>=',$v))
            ->when($request->query('date_to'), fn($q,$v)=>$q->whereDate('paid_at','<=',$v))
            ->whereIn('status', ['success', 'refund'])->sum('total_amount');

        return response()->json([
            'data'    => $rows,
            'meta'    => ['current_page' => $paginated->currentPage(), 'last_page' => $paginated->lastPage(), 'total' => $paginated->total()],
            'summary' => ['total_amount' => $netRevenue, 'total_count' => $paginated->total()],
        ]);
    }

    public function refundSale(Request $request, int $id): JsonResponse
    {
        $sale = ProductSale::with('items.product')->findOrFail($id);

        if ($sale->isRefund()) {
            return response()->json(['message' => 'Это уже запись о возврате'], 409);
        }
        if ($sale->paid_at->lt(now()->subDays(14))) {
            return response()->json(['message' => 'Срок возврата истёк (14 дней)'], 422);
        }

        $data = $request->validate([
            'items'            => 'nullable|array',
            'items.*.item_id'  => 'required_with:items|integer',
            'items.*.quantity' => 'required_with:items|integer|min:1',
        ]);

        $existingRefundItems = ProductSaleItem::whereIn(
            'product_sale_id',
            ProductSale::where('refund_of_id', $sale->id)->pluck('id')
        )->get()->groupBy('original_item_id');

        $itemsToRefund = collect();

        if (!empty($data['items'])) {
            foreach ($data['items'] as $req) {
                $item = $sale->items->firstWhere('id', $req['item_id']);
                if (!$item) {
                    return response()->json(['message' => "Позиция #{$req['item_id']} не принадлежит этому чеку"], 422);
                }
                if (!$item->is_returnable) {
                    return response()->json(['message' => "«{$item->product?->name}» не подлежит возврату"], 422);
                }
                $alreadyRefunded = $existingRefundItems->get($item->id)?->sum('quantity') ?? 0;
                $available       = $item->quantity - $alreadyRefunded;
                if ($req['quantity'] > $available) {
                    return response()->json(['message' => "Доступно: {$available} шт. «{$item->product?->name}»"], 422);
                }
                $itemsToRefund->push(['item' => $item, 'quantity' => (int) $req['quantity']]);
            }
        } else {
            foreach ($sale->items as $item) {
                if (!$item->is_returnable) continue;
                $alreadyRefunded = $existingRefundItems->get($item->id)?->sum('quantity') ?? 0;
                $available       = $item->quantity - $alreadyRefunded;
                if ($available > 0) { $itemsToRefund->push(['item' => $item, 'quantity' => $available]); }
            }
        }

        if ($itemsToRefund->isEmpty()) {
            return response()->json(['message' => 'Нет позиций доступных для возврата'], 422);
        }

        $refundAmount = $itemsToRefund->sum(fn($r) => (float) $r['item']->unit_price * $r['quantity']);

        return DB::transaction(function () use ($sale, $itemsToRefund, $refundAmount) {
            $user = auth()->user();
            $user->loadMissing('person.administrator');

            $refund = ProductSale::create([
                'administrator_id' => $user->person?->administrator?->person_id,
                'total_amount'     => -round($refundAmount, 2),
                'payment_method'   => $sale->payment_method,
                'status'           => 'refund',
                'is_refundable'    => false,
                'refund_of_id'     => $sale->id,
                'paid_at'          => now(),
                'transaction_id'   => 'REF-PS-' . strtoupper(uniqid()),
            ]);

            foreach ($itemsToRefund as $r) {
                ProductSaleItem::create([
                    'product_sale_id'  => $refund->id,
                    'product_id'       => $r['item']->product_id,
                    'quantity'         => $r['quantity'],
                    'unit_price'       => $r['item']->unit_price,
                    'is_returnable'    => $r['item']->is_returnable,
                    'original_item_id' => $r['item']->id,
                ]);
                $r['item']->product->increment('stock_quantity', $r['quantity']);
            }

            $refund->load('items.product');
            return response()->json([
                'message' => 'Возврат оформлен. К возврату: ' . number_format($refundAmount, 2, '.', '') . ' ₽',
                'data'    => $this->formatSale($refund),
            ]);
        });
    }

    // ══════════════════════════════════════════════════════

    private function formatProduct(Product $p): array
    {
        return [
            'id'             => $p->id,
            'name'           => $p->name,
            'category'       => $p->category,
            'price'          => (float) $p->price,
            'stock_quantity' => $p->stock_quantity,
            'is_returnable'  => $p->is_returnable,
            'description'    => $p->description,
            'is_active'      => $p->is_active,
            'in_stock'       => $p->stock_quantity > 0,
        ];
    }

    private function formatSale(
        ProductSale $s,
        ?Collection $refundItemsByOriginal = null,
        bool        $hasRefund = false,
        bool        $canRefund = false
    ): array {
        $s->loadMissing('items.product');
        return [
            'id'             => $s->id,
            'status'         => $s->status,
            'total_amount'   => (float) $s->total_amount,
            'payment_method' => $s->payment_method,
            'is_refundable'  => $s->is_refundable,
            'paid_at'        => $s->paid_at?->toDateTimeString(),
            'transaction_id' => $s->transaction_id,
            'refund_of_id'   => $s->refund_of_id,
            'has_refund'     => $hasRefund,
            'can_refund'     => $canRefund,
            'items'          => $s->items->map(function ($i) use ($refundItemsByOriginal) {
                $alreadyRefunded   = $refundItemsByOriginal?->get($i->id)?->sum('quantity') ?? 0;
                $availableToRefund = $i->is_returnable ? max(0, $i->quantity - $alreadyRefunded) : 0;
                return [
                    'id'                  => $i->id,
                    'product_id'          => $i->product_id,
                    'product_name'        => $i->product?->name,
                    'product_category'    => $i->product?->category,
                    'quantity'            => $i->quantity,
                    'unit_price'          => (float) $i->unit_price,
                    'subtotal'            => (float) $i->unit_price * $i->quantity,
                    'is_returnable'       => $i->is_returnable,
                    'refunded_quantity'   => $alreadyRefunded,
                    'available_to_refund' => $availableToRefund,
                ];
            })->all(),
        ];
    }
}
