export interface Product {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  price: number
  image: string
  category: string
  categoryAr: string
  featured?: boolean
  bestSeller?: boolean
}

export const categories = [
  { id: 'shrimp', name: 'Shrimp', nameAr: 'جمبري', icon: '🦐' },
  { id: 'crab', name: 'Crab', nameAr: 'كابوريا', icon: '🦀' },
  { id: 'lobster', name: 'Lobster', nameAr: 'استاكوزا', icon: '🦞' },
  { id: 'fish', name: 'Fish', nameAr: 'سمك', icon: '🐟' },
  { id: 'squid', name: 'Squid', nameAr: 'كاليماري', icon: '🦑' },
  { id: 'mixed', name: 'Mixed Platters', nameAr: 'أطباق مشكلة', icon: '🍽️' },
]

export const products: Product[] = [
  // Shrimp
  {
    id: 'shrimp-grilled',
    name: 'Grilled Shrimp',
    nameAr: 'جمبري مشوي',
    description: 'Fresh grilled shrimp with herbs and lemon',
    descriptionAr: 'جمبري طازج مشوي مع الأعشاب والليمون',
    price: 250,
    image: '/images/shrimp-grilled.jpg',
    category: 'shrimp',
    categoryAr: 'جمبري',
    featured: true,
    bestSeller: true,
  },
  {
    id: 'shrimp-fried',
    name: 'Fried Shrimp',
    nameAr: 'جمبري مقلي',
    description: 'Crispy golden fried shrimp',
    descriptionAr: 'جمبري مقلي ذهبي مقرمش',
    price: 220,
    image: '/images/shrimp-fried.jpg',
    category: 'shrimp',
    categoryAr: 'جمبري',
    bestSeller: true,
  },
  {
    id: 'shrimp-spicy',
    name: 'Spicy Shrimp',
    nameAr: 'جمبري حار',
    description: 'Shrimp in spicy tomato sauce',
    descriptionAr: 'جمبري بصلصة الطماطم الحارة',
    price: 240,
    image: '/images/shrimp-spicy.jpg',
    category: 'shrimp',
    categoryAr: 'جمبري',
    featured: true,
  },
  {
    id: 'shrimp-coconut',
    name: 'Coconut Shrimp',
    nameAr: 'جمبري جوز الهند',
    description: 'Shrimp coated in coconut and fried',
    descriptionAr: 'جمبري مغطى بجوز الهند ومقلي',
    price: 260,
    image: '/images/shrimp-coconut.jpg',
    category: 'shrimp',
    categoryAr: 'جمبري',
  },
  
  // Crab
  {
    id: 'crab-steamed',
    name: 'Steamed Crab',
    nameAr: 'كابوريا بالبخار',
    description: 'Fresh steamed crab with garlic butter',
    descriptionAr: 'كابوريا طازجة بالبخار مع زبدة الثوم',
    price: 350,
    image: '/images/crab-steamed.jpg',
    category: 'crab',
    categoryAr: 'كابوريا',
    featured: true,
    bestSeller: true,
  },
  {
    id: 'crab-fried',
    name: 'Fried Crab',
    nameAr: 'كابوريا مقلية',
    description: 'Crispy fried soft shell crab',
    descriptionAr: 'كابوريا قشرة طرية مقلية مقرمشة',
    price: 320,
    image: '/images/crab-fried.jpg',
    category: 'crab',
    categoryAr: 'كابوريا',
  },
  {
    id: 'crab-spicy',
    name: 'Spicy Crab',
    nameAr: 'كابوريا حارة',
    description: 'Crab in spicy Asian sauce',
    descriptionAr: 'كابوريا بصلصة آسيوية حارة',
    price: 340,
    image: '/images/crab-spicy.jpg',
    category: 'crab',
    categoryAr: 'كابوريا',
    bestSeller: true,
  },
  
  // Lobster
  {
    id: 'lobster-grilled',
    name: 'Grilled Lobster',
    nameAr: 'استاكوزا مشوية',
    description: 'Whole lobster grilled with garlic butter',
    descriptionAr: 'استاكوزا كاملة مشوية مع زبدة الثوم',
    price: 550,
    image: '/images/lobster-grilled.jpg',
    category: 'lobster',
    categoryAr: 'استاكوزا',
    featured: true,
    bestSeller: true,
  },
  {
    id: 'lobster-thermidor',
    name: 'Lobster Thermidor',
    nameAr: 'استاكوزا ثيرميدور',
    description: 'Classic French lobster in creamy sauce',
    descriptionAr: 'استاكوزا فرنسية كلاسيكية بصلصة كريمية',
    price: 600,
    image: '/images/lobster-thermidor.jpg',
    category: 'lobster',
    categoryAr: 'استاكوزا',
    featured: true,
  },
  
  // Fish
  {
    id: 'fish-grilled-sea-bass',
    name: 'Grilled Sea Bass',
    nameAr: 'سمك قاروص مشوي',
    description: 'Fresh sea bass grilled to perfection',
    descriptionAr: 'سمك قاروص طازج مشوي بشكل مثالي',
    price: 280,
    image: '/images/fish-sea-bass.jpg',
    category: 'fish',
    categoryAr: 'سمك',
    bestSeller: true,
  },
  {
    id: 'fish-fried-red-snapper',
    name: 'Fried Red Snapper',
    nameAr: 'سمك بلطي مقلي',
    description: 'Crispy fried red snapper',
    descriptionAr: 'سمك بلطي مقلي مقرمش',
    price: 200,
    image: '/images/fish-red-snapper.jpg',
    category: 'fish',
    categoryAr: 'سمك',
  },
  {
    id: 'fish-sayadeya',
    name: 'Fish Sayadeya',
    nameAr: 'صيادية سمك',
    description: 'Traditional Egyptian fish with rice',
    descriptionAr: 'صيادية سمك مصرية تقليدية مع الأرز',
    price: 250,
    image: '/images/fish-sayadeya.jpg',
    category: 'fish',
    categoryAr: 'سمك',
    featured: true,
  },
  
  // Squid
  {
    id: 'squid-fried',
    name: 'Fried Calamari',
    nameAr: 'كاليماري مقلي',
    description: 'Crispy fried squid rings',
    descriptionAr: 'حلقات كاليماري مقلية مقرمشة',
    price: 180,
    image: '/images/squid-fried.jpg',
    category: 'squid',
    categoryAr: 'كاليماري',
    bestSeller: true,
  },
  {
    id: 'squid-grilled',
    name: 'Grilled Squid',
    nameAr: 'كاليماري مشوي',
    description: 'Tender grilled squid with herbs',
    descriptionAr: 'كاليماري طري مشوي مع الأعشاب',
    price: 200,
    image: '/images/squid-grilled.jpg',
    category: 'squid',
    categoryAr: 'كاليماري',
  },
  {
    id: 'squid-stuffed',
    name: 'Stuffed Squid',
    nameAr: 'كاليماري محشي',
    description: 'Squid stuffed with rice and vegetables',
    descriptionAr: 'كاليماري محشي بالأرز والخضروات',
    price: 220,
    image: '/images/squid-stuffed.jpg',
    category: 'squid',
    categoryAr: 'كاليماري',
    featured: true,
  },
  
  // Mixed Platters
  {
    id: 'mixed-seafood-platter',
    name: 'Seafood Platter',
    nameAr: 'طبق مأكولات بحرية مشكل',
    description: 'Mixed seafood platter with shrimp, fish, and calamari',
    descriptionAr: 'طبق مأكولات بحرية مشكل مع جمبري وسمك وكاليماري',
    price: 450,
    image: '/images/mixed-platter.jpg',
    category: 'mixed',
    categoryAr: 'أطباق مشكلة',
    featured: true,
    bestSeller: true,
  },
  {
    id: 'mixed-grilled-platter',
    name: 'Grilled Platter',
    nameAr: 'طبق مشويات مشكل',
    description: 'Assorted grilled seafood',
    descriptionAr: 'مشويات بحرية مشكلة',
    price: 420,
    image: '/images/mixed-grilled.jpg',
    category: 'mixed',
    categoryAr: 'أطباق مشكلة',
    bestSeller: true,
  },
  {
    id: 'mixed-family-platter',
    name: 'Family Platter',
    nameAr: 'طبق العائلة',
    description: 'Large mixed platter for the whole family',
    descriptionAr: 'طبق مشكل كبير للعائلة بأكملها',
    price: 800,
    image: '/images/mixed-family.jpg',
    category: 'mixed',
    categoryAr: 'أطباق مشكلة',
    featured: true,
  },
]

export const branches = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Desouk', nameAr: 'دسوق', city: 'Desouk' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Alexandria', nameAr: 'الإسكندرية', city: 'Alexandria' },
  { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Cairo', nameAr: 'القاهرة', city: 'Cairo' },
  { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Giza', nameAr: 'الجيزة', city: 'Giza' },
  ]

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category)
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured)
}

export function getBestSellers(): Product[] {
  return products.filter((p) => p.bestSeller)
}
