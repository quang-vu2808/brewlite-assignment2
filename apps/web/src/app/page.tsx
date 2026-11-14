"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";

type Product = {
  id: string | number;
  name: string;
  price: number | string;
  imageUrl?: string | null;
  image?: string | null;
};
type LoadState = "loading" | "success" | "error";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");
const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function imageSrc(product: Product): string | null {
  const raw = product.imageUrl || product.image;
  if (!raw || typeof raw !== "string") return null;
  if (/^https?:\/\//.test(raw) || raw.startsWith("/images/products/"))
    return raw;
  return raw.startsWith("/") ? `${API_URL}${raw}` : null;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setState("loading");
      try {
        const response = await fetch(`${API_URL}/products`, {
          signal: abort.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`API trả HTTP ${response.status}`);
        const payload: unknown = await response.json();
        if (!Array.isArray(payload))
          throw new Error("Định dạng danh sách sản phẩm không hợp lệ");
        const valid = payload.filter(
          (item): item is Product =>
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "name" in item &&
            "price" in item,
        );
        if (!abort.signal.aborted) {
          setProducts(valid);
          setState("success");
        }
      } catch (error) {
        if (!abort.signal.aborted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Không thể kết nối máy chủ",
          );
          setState("error");
        }
      }
    }
    void load();
    return () => abort.abort();
  }, [retry]);

  return (
    <div className="site-shell">
      <SiteHeader />

      <main id="top">
        <section className="hero" id="gioi-thieu">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="sparkle">✦</span> HƯƠNG VỊ MỖI NGÀY
            </div>
            <h1>
              Một tách cà phê.
              <br />
              <em>Ngàn khoảnh khắc đẹp.</em>
            </h1>
            <p>
              Thưởng thức hương vị yêu thích, xem menu và chọn đồ uống thật dễ
              dàng cùng BrewLite.
            </p>
            <a className="primary-button" href="#menu">
              Khám phá menu <span aria-hidden="true">↗</span>
            </a>
            <span className="hero-caption">
              BrewLite · Dự án Công nghệ phần mềm
            </span>
          </div>
          <div
            className="hero-art"
            aria-label="Minh họa một tách cà phê cách điệu"
            role="img"
          >
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="steam steam-one" />
            <div className="steam steam-two" />
            <div className="cup">
              <div className="coffee" />
              <div className="cup-handle" />
            </div>
            <div className="saucer" />
            <span className="floating-label">
              Freshly brewed <span aria-hidden="true">✦</span>
            </span>
          </div>
        </section>

        <section className="menu-section" id="menu">
          <div className="section-head">
            <div>
              <span className="section-kicker">BỘ SƯU TẬP CỦA CHÚNG TÔI</span>
              <h2>
                Chọn vị yêu thích <span>của bạn.</span>
              </h2>
            </div>
            <p>Menu được cập nhật trực tiếp từ BrewLite API.</p>
          </div>
          {state === "loading" && (
            <div
              className="product-grid"
              role="status"
              aria-label="Đang tải sản phẩm"
            >
              {[0, 1, 2].map((item) => (
                <div className="product-card skeleton" key={item}>
                  <div className="product-image" />
                  <div className="product-details">
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {state === "error" && (
            <div className="state-panel" role="alert">
              <span className="state-icon">!</span>
              <h3>Không tải được menu</h3>
              <p>
                {message}. Kiểm tra API tại {API_URL} rồi thử lại.
              </p>
              <button onClick={() => setRetry((value) => value + 1)}>
                Thử lại
              </button>
            </div>
          )}
          {state === "success" && products.length === 0 && (
            <div className="state-panel" role="status">
              <span className="state-icon">☕</span>
              <h3>Menu đang được cập nhật</h3>
              <p>Hiện chưa có sản phẩm nào. Mời bạn quay lại sau.</p>
            </div>
          )}
          {state === "success" && products.length > 0 && (
            <div className="product-grid">
              {products.map((product) => {
                const image = imageSrc(product);
                const price = Number(product.price);
                return (
                  <article className="product-card" key={String(product.id)}>
                    <div className="product-image">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={product.name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                            event.currentTarget.parentElement?.classList.add(
                              "image-fallback",
                            );
                          }}
                        />
                      ) : (
                        <span className="coffee-symbol" aria-hidden="true">
                          ☕
                        </span>
                      )}
                    </div>
                    <div className="product-details">
                      <span className="product-overline">
                        BREWLITE SELECTION
                      </span>
                      <h3>{product.name}</h3>
                      <div className="product-bottom">
                        <strong>
                          {Number.isFinite(price)
                            ? formatter.format(price)
                            : "Liên hệ"}
                        </strong>
                        <Link
                          href={`/products/${encodeURIComponent(String(product.id))}`}
                          aria-label={`Xem chi tiết ${product.name}`}
                        >
                          Xem chi tiết ↗
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <footer className="footer">
        <div>
          <span className="footer-brand">
            Brew<span>Lite</span>
          </span>
          <p>Một chút cà phê, một ngày nhiều cảm hứng.</p>
        </div>
        <div className="footer-right">
          <span>
            Đồ án học phần Công nghệ phần mềm · Trường Đại học Sài Gòn
          </span>
          <small>© {new Date().getFullYear()} BrewLite</small>
        </div>
      </footer>
    </div>
  );
}
