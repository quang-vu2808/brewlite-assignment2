"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "../../../components/site-header";
import { useCart } from "../../../components/cart-provider";
import {
  calculateUnitPrice,
  type ProductSize,
  type ProductTopping,
} from "../../../lib/pricing";

type Product = {
  id: number | string;
  name: string;
  price: number | string;
  image?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  options: {
    sizes: Array<{ name: ProductSize; surcharge: number }>;
    toppings: ProductTopping[];
  };
};
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");
const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Product;
  return (
    (typeof p.id === "number" || typeof p.id === "string") &&
    typeof p.name === "string" &&
    Number.isSafeInteger(Number(p.price)) &&
    Number(p.price) >= 0 &&
    !!p.options &&
    Array.isArray(p.options.sizes) &&
    p.options.sizes.length === 3 &&
    p.options.sizes.every(
      (s) =>
        ["S", "M", "L"].includes(s.name) &&
        Number.isSafeInteger(s.surcharge) &&
        s.surcharge >= 0,
    ) &&
    new Set(p.options.sizes.map((s) => s.name)).size === 3 &&
    Array.isArray(p.options.toppings) &&
    p.options.toppings.every(
      (t) =>
        typeof t.id === "string" &&
        typeof t.name === "string" &&
        Number.isSafeInteger(t.surcharge) &&
        t.surcharge >= 0,
    )
  );
}
function imageSrc(product: Product): string | null {
  const raw = product.imageUrl || product.image;
  if (!raw || typeof raw !== "string") return null;
  if (/^https?:\/\//.test(raw)) return raw;
  if (raw.startsWith("/images/products/")) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return null;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem, hydrated } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [state, setState] = useState<
    "loading" | "success" | "not-found" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [size, setSize] = useState<ProductSize>("M");
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState("loading");
      setProduct(null);
      setSelected([]);
      setSize("M");
      if (!/^[1-9]\d*$/.test(id)) {
        setState("not-found");
        return;
      }
      try {
        const response = await fetch(
          API_URL + "/products/" + encodeURIComponent(id),
          { signal: controller.signal, cache: "no-store" },
        );
        if (response.status === 404) {
          if (!controller.signal.aborted) setState("not-found");
          return;
        }
        if (!response.ok) throw new Error(`API trả HTTP ${response.status}`);
        const payload: unknown = await response.json();
        if (!isProduct(payload))
          throw new Error("Thông tin sản phẩm từ API không hợp lệ");
        if (!controller.signal.aborted) {
          setProduct(payload);
          setState("success");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(
            error instanceof Error ? error.message : "Không thể tải sản phẩm",
          );
          setState("error");
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [id, retry]);
  const selectedSize = product?.options.sizes.find((s) => s.name === size);
  const toppings =
    product?.options.toppings.filter((t) => selected.includes(t.id)) ?? [];
  const total = product
    ? calculateUnitPrice(
        Number(product.price),
        selectedSize?.surcharge ?? 0,
        toppings,
      )
    : 0;
  const image = product ? imageSrc(product) : null;
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="detail-main">
        <Link className="detail-back" href="/#menu">
          ← Menu
        </Link>
        {state === "loading" && (
          <div className="detail-loading" role="status">
            Đang tải sản phẩm...
          </div>
        )}
        {state === "not-found" && (
          <section className="state-panel">
            <h1>Không tìm thấy sản phẩm</h1>
            <Link href="/#menu">Quay lại Menu</Link>
          </section>
        )}
        {state === "error" && (
          <section className="state-panel" role="alert">
            <h1>Không tải được sản phẩm</h1>
            <p>{message}</p>
            <button onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
          </section>
        )}
        {state === "success" && product && (
          <section className="detail-card">
            <div className="detail-image product-image">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={product.name} />
              ) : (
                <span aria-hidden="true">☕</span>
              )}
            </div>
            <div className="detail-content">
              <span className="section-kicker">BREWLITE SELECTION</span>
              <h1>{product.name}</h1>
              <p>
                {product.description ??
                  "Một ly đồ uống yêu thích, được pha cho riêng bạn."}
              </p>
              <strong className="detail-base-price">
                {formatter.format(Number(product.price))}
              </strong>
              <fieldset className="option-group">
                <legend>Chọn size</legend>
                <div className="option-list">
                  {product.options.sizes.map((option) => (
                    <label
                      className={
                        size === option.name
                          ? "option-button size-option selected"
                          : "option-button size-option"
                      }
                      key={option.name}
                    >
                      <input
                        type="radio"
                        name="size"
                        value={option.name}
                        checked={size === option.name}
                        onChange={() => setSize(option.name)}
                      />
                      <span>Size {option.name}</span>
                      <small>+{formatter.format(option.surcharge)}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="option-group">
                <legend>Thêm topping</legend>
                <div className="topping-list">
                  {product.options.toppings.map((t) => (
                    <label className="topping-option" key={t.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(t.id)}
                        onChange={(e) =>
                          setSelected((current) =>
                            e.target.checked
                              ? [...current, t.id]
                              : current.filter((id) => id !== t.id),
                          )
                        }
                      />
                      <span>{t.name}</span>
                      <strong>+{formatter.format(t.surcharge)}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="detail-total" aria-live="polite">
                <span>Tổng giá</span>
                <strong>{formatter.format(total)}</strong>
              </div>
              <button
                className="detail-action add-to-cart"
                disabled={!hydrated || !selectedSize}
                onClick={() => {
                  if (!selectedSize) return;
                  addItem({
                    productId: String(product.id),
                    name: product.name,
                    image,
                    basePrice: Number(product.price),
                    size,
                    sizeSurcharge: selectedSize.surcharge,
                    toppings,
                  });
                }}
              >
                Thêm vào giỏ hàng
              </button>
              <Link className="continue-shopping" href="/cart">
                Xem giỏ hàng →
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
