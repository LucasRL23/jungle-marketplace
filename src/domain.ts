export interface Nft {
  id: string;
  name: string;
  creator: string;
  category: string;
  price: string;
  stock: number;
  version: number;
  image: string;
}
export interface Catalog {
  items: Nft[];
  total: number;
  pages: number;
}
export interface CatalogSearch {
  q: string;
  category: string;
  sort: "recent" | "price-asc" | "price-desc";
  page: number;
}
export interface User {
  id: string;
  name: string;
  email: string;
}
export interface Session {
  user: User;
  expiresAt: number;
}
export interface LoginResult extends Session {
  token: string;
}
export interface CartItem {
  nftId: string;
  edition: "standard" | "limited";
  quantity: number;
}
export interface Cart {
  items: (CartItem & { nft: Nft; available: number; unitPrice: string })[];
  coupon: string;
  version: number;
}
export interface Quote {
  id: string;
  cartVersion: number;
  items: (CartItem & { name: string; unitPrice: string; image: string })[];
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
  coupon: string;
  expiresAt: number;
}
export interface Wallet {
  id: string;
  label: string;
  address: string;
  network: "Ethereum" | "Polygon";
}
export interface Order {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "declined";
  version: number;
  quote: Quote;
  collector: { name: string; email: string };
  wallet: Wallet;
  createdAt: number;
  transaction: string;
  reason?: string;
}
