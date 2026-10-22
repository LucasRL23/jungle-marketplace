import { http, HttpResponse, delay } from 'msw'
import type { CatalogSearch, Nft } from '../domain'
import { wei } from '../lib/money'
const names = ['Cosmic Perspective', 'Golden Hour', 'The Wanderer', 'Quiet Dimensions', 'Parallel Worlds', 'After the Rain', 'Digital Bloom', 'Beyond the Horizon', 'Inner Light', 'New Beginnings', 'Wild Spirit', 'Dream State', 'Infinite Garden', 'Solitude', 'Moonwalker', 'Electric Soul', 'Hidden Paradise', 'The Observer', 'Soft Motion', 'Future Memories', 'Echoes', 'Organic Forms', 'Another Universe', 'Slow Days']
const categories = ['Art', 'Photography', 'Collectibles']
export const nfts: Nft[] = names.map((name, i) => ({ id: `nft-${i + 1}`, name, creator: ['Alex Morgan', 'Luna Studio', 'Noah Chen'][i % 3], category: categories[i % 3], price: `${1 + i % 4}.${String((i * 17 + 25) % 100).padStart(2, '0')}`, stock: i === 7 ? 0 : 8 + i, version: 1, image: `/artwork/${i % 6}.svg` }))
export const handlers = [
  http.get('/api/nfts', async ({ request }) => {
    const p = new URL(request.url).searchParams
    const scenario = localStorage.getItem('jungle-scenario')
    await delay(scenario === 'slow' ? 2500 : 200)
    if (scenario === 'error') return HttpResponse.json({ message: 'O catálogo está indisponível. Tente novamente.' }, { status: 503 })
    let items = scenario === 'empty' ? [] : nfts.filter(n => (!p.get('q') || `${n.name} ${n.creator}`.toLowerCase().includes(p.get('q')!.toLowerCase())) && (!p.get('category') || n.category === p.get('category')))
    const sort = p.get('sort') as CatalogSearch['sort']
    if (sort === 'price-asc' || sort === 'price-desc') items = [...items].sort((a, b) => (wei(a.price) < wei(b.price) ? -1 : wei(a.price) > wei(b.price) ? 1 : 0) * (sort === 'price-desc' ? -1 : 1))
    const page = Math.max(1, Number(p.get('page')) || 1)
    return HttpResponse.json({ items: items.slice((page - 1) * 8, page * 8), total: items.length, pages: Math.ceil(items.length / 8) })
  }),
  http.get('/api/nfts/:id', async ({ params }) => {
    await delay(200)
    const nft = nfts.find(n => n.id === params.id)
    return nft ? HttpResponse.json(nft) : HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
  }),
]
