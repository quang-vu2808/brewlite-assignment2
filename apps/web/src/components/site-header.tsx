"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { useAuth } from "./auth-provider";

export function SiteHeader() {
  const { hydrated, totalItems } = useCart();
  const { user, logout } = useAuth();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const closeNavigation = () => setNavigationOpen(false);

  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="BrewLite - trang chủ">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="BrewLite" width="166" height="45" />
      </Link>
      <button
        className="header-nav-toggle"
        type="button"
        aria-label={navigationOpen ? "Đóng điều hướng" : "Mở điều hướng"}
        aria-expanded={navigationOpen}
        aria-controls="primary-navigation"
        onClick={() => setNavigationOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav
        id="primary-navigation"
        className={`nav${navigationOpen ? " is-open" : ""}`}
        aria-label="Điều hướng chính"
      >
        <Link href="/#gioi-thieu" onClick={closeNavigation}>
          Giới thiệu
        </Link>
        <Link href="/#menu" onClick={closeNavigation}>
          Menu
        </Link>
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <Link href="/orders">Đơn hàng của tôi</Link>
            <button className="header-auth-button" onClick={logout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <Link className="header-auth-button" href="/login">
            Đăng nhập
          </Link>
        )}
        <Link
          className="cart-header-link"
          href="/cart"
          aria-label={`Giỏ hàng${hydrated ? `, ${totalItems} sản phẩm` : ""}`}
        >
          <span aria-hidden="true">🛒</span>
          <span className="cart-header-text">Giỏ hàng</span>
          <span className="cart-badge" aria-live="polite">
            {hydrated ? totalItems : 0}
          </span>
        </Link>
      </div>
    </header>
  );
}
