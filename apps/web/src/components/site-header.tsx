import Link from "next/link";

export function SiteHeader({ home = false }: { home?: boolean }) {
  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="BrewLite - trang chủ">
        Brew<span>Lite</span>
      </Link>
      <nav className="nav" aria-label="Điều hướng chính">
        <a href={home ? "#gioi-thieu" : "/#gioi-thieu"}>Giới thiệu</a>
        <a href={home ? "#menu" : "/#menu"}>Menu</a>
      </nav>
    </header>
  );
}
