import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/auth-provider";
import { CartProvider } from "../components/cart-provider";
import { CheckoutProvider } from "../components/checkout-provider";
import { CartToast } from "../components/cart-toast";

export const metadata: Metadata = {
  title: "BrewLite | Menu",
  description: "Xem menu đồ uống BrewLite được tải từ API.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <CartProvider>
          <AuthProvider>
            <CheckoutProvider>
              {children}
              <CartToast />
            </CheckoutProvider>
          </AuthProvider>
        </CartProvider>
      </body>
    </html>
  );
}
