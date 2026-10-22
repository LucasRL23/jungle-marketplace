export interface Nft { id: string; name: string; creator: string; category: string; price: string; stock: number; version: number; image: string }
export interface Catalog { items: Nft[]; total: number; pages: number }
export interface CatalogSearch { q: string; category: string; sort: 'recent' | 'price-asc' | 'price-desc'; page: number }
