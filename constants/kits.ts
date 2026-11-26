import type { CategoryTypeId, ProductArtId, ProductCategory, ShopKitId } from '@/types';

export interface ShopKitConfig {
  id: ShopKitId;
  name: string;
  sub: string;
  defaultShopName: string;
  cats: string[];
  fields: string[];
  variant: 'size-colour' | 'piece' | 'batch' | 'unit' | 'shade' | 'serial' | 'none';
  sizes: string[];
  barcode: 'zyro' | 'maker';
  unit: string;
  extras: string[];
}

export const KITS: ShopKitConfig[] = [
  {
    id: 'clothing',
    name: 'Clothing and fashion',
    sub: 'Suits, kurtas, lawn, kids wear',
    defaultShopName: 'Hamza Fashion',
    cats: ['Men', 'Women', 'Kids', 'Unstitched', 'Accessories'],
    fields: ['Size', 'Colour', 'Fabric'],
    variant: 'size-colour',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    barcode: 'zyro',
    unit: 'piece',
    extras: ['Size and colour on every label', 'Low stock by size'],
  },
  {
    id: 'shoes',
    name: 'Shoes and bags',
    sub: 'Shoes, sandals, bags',
    defaultShopName: 'Stride Footwear',
    cats: ['Men', 'Women', 'Kids', 'Sandals', 'Bags'],
    fields: ['Size', 'Colour'],
    variant: 'size-colour',
    sizes: ['38', '39', '40', '41', '42', '43'],
    barcode: 'zyro',
    unit: 'pair',
    extras: ['Shoe sizes 36–46', 'Pairs, not pieces'],
  },
  {
    id: 'jewellery',
    name: 'Jewellery',
    sub: 'Gold, silver, artificial',
    defaultShopName: 'Noor Jewellers',
    cats: ['Gold', 'Silver', 'Artificial', 'Bridal sets'],
    fields: ['Karat', 'Weight (g)', 'Making charge'],
    variant: 'piece',
    sizes: [],
    barcode: 'zyro',
    unit: 'piece',
    extras: ['Every piece gets its own code', 'Weight on the label'],
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    sub: 'Medicines and personal care',
    defaultShopName: 'Shifa Pharmacy',
    cats: ['Tablets', 'Syrups', 'Injections', 'Medical devices', 'Personal care'],
    fields: ['Batch', 'Expiry date', 'Pack size'],
    variant: 'batch',
    sizes: [],
    barcode: 'maker',
    unit: 'pack',
    extras: ['Scan the maker’s barcode', 'Expiry alerts 60 days ahead'],
  },
  {
    id: 'grocery',
    name: 'Grocery and general store',
    sub: 'Kiryana, mart, daily items',
    defaultShopName: 'Madina Mart',
    cats: ['Atta and rice', 'Oil and ghee', 'Drinks', 'Snacks', 'Household'],
    fields: ['Pack size', 'Unit'],
    variant: 'unit',
    sizes: [],
    barcode: 'maker',
    unit: 'pack',
    extras: ['Scan the maker’s barcode', 'Loose items by kg or litre'],
  },
  {
    id: 'cosmetics',
    name: 'Cosmetics and beauty',
    sub: 'Makeup, skin and hair care',
    defaultShopName: 'Glow Beauty Store',
    cats: ['Makeup', 'Skin care', 'Hair care', 'Fragrance'],
    fields: ['Shade', 'Expiry date'],
    variant: 'shade',
    sizes: [],
    barcode: 'maker',
    unit: 'piece',
    extras: ['Shades as variants', 'Expiry alerts'],
  },
  {
    id: 'mobile',
    name: 'Mobiles and electronics',
    sub: 'Phones, chargers, accessories',
    defaultShopName: 'City Mobiles',
    cats: ['Phones', 'Chargers', 'Covers', 'Audio'],
    fields: ['IMEI or serial', 'Warranty'],
    variant: 'serial',
    sizes: [],
    barcode: 'maker',
    unit: 'piece',
    extras: ['IMEI on every phone sold', 'Warranty on the receipt'],
  },
  {
    id: 'other',
    name: 'Something else',
    sub: 'Start empty and add your own',
    defaultShopName: 'Your shop',
    cats: [],
    fields: [],
    variant: 'none',
    sizes: [],
    barcode: 'zyro',
    unit: 'piece',
    extras: ['Add categories as you go'],
  },
];

export function kitById(id: ShopKitId): ShopKitConfig {
  return KITS.find((k) => k.id === id) ?? KITS[0];
}

export const SIZESETS: Array<[string, string, string[]]> = [
  ['sxxl', 'S to XXL', ['S', 'M', 'L', 'XL', 'XXL']],
  ['waist', 'Waist 28 to 36', ['28', '30', '32', '34', '36']],
  ['chest', 'Chest 36 to 46', ['36', '38', '40', '42', '44', '46']],
  ['eu', 'EU 39 to 44', ['39', '40', '41', '42', '43', '44']],
  ['eu45', 'Men 39 to 45', ['39', '40', '41', '42', '43', '44', '45']],
  ['kidsf', 'Kids 28 to 35', ['28', '29', '30', '31', '32', '33', '34', '35']],
  ['euw', 'EU 36 to 41', ['36', '37', '38', '39', '40', '41']],
  ['kids', 'Kids 2 to 11 years', ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y']],
  ['free', 'One size', ['One size']],
];

export function getSizeSet(id?: string): [string, string, string[]] {
  return SIZESETS.find((x) => x[0] === id) ?? SIZESETS[0];
}

export const CTYPES: Record<
  CategoryTypeId,
  { label: string; ex: string; asks: string; bc: 'zyro' | 'maker' | 'serial' }
> = {
  sc: {
    label: 'Sizes and colours',
    ex: 'Kurtas, suits, shoes',
    asks: 'colours, sizes and how many of each',
    bc: 'zyro',
  },
  piece: {
    label: 'Each piece is different',
    ex: 'Gold rings, bangles, sets',
    asks: 'karat, weight and making charge for each piece',
    bc: 'zyro',
  },
  batch: {
    label: 'Batches with expiry',
    ex: 'Medicines, baby milk',
    asks: 'batch number, expiry and packs in each batch',
    bc: 'maker',
  },
  pack: {
    label: 'Packs or loose',
    ex: 'Atta, rice, oil, fabric',
    asks: 'pack size, or price per kg, litre or metre',
    bc: 'maker',
  },
  shade: {
    label: 'Shades',
    ex: 'Lipstick, foundation',
    asks: 'shade names, how many of each and expiry',
    bc: 'maker',
  },
  serial: {
    label: 'One serial per unit',
    ex: 'Mobiles, laptops',
    asks: 'the IMEI or serial of every unit and warranty',
    bc: 'serial',
  },
  simple: {
    label: 'Just a quantity',
    ex: 'Belts, socks, bags',
    asks: 'only how many you have',
    bc: 'zyro',
  },
};

export const CTYPE_ORDER: CategoryTypeId[] = [
  'sc',
  'simple',
  'piece',
  'batch',
  'pack',
  'shade',
  'serial',
];

export const SHOP_CATEGORIES: Record<
  ShopKitId,
  Array<[string, string, CategoryTypeId, string?, ProductArtId?]>
> = {
  clothing: [
    ['men', 'Men', 'sc', 'sxxl', 'kurta'],
    ['women', 'Women', 'sc', 'free', 'lawn'],
    ['foot', 'Footwear', 'sc', 'eu', 'chappal'],
    ['acc', 'Accessories', 'simple', '', 'belt'],
    ['fabric', 'Fabric by the metre', 'pack', '', 'fabric'],
    ['kids', 'Kids', 'sc', 'kids', 'tee'],
  ],
  shoes: [
    ['men', 'Men', 'sc', 'eu45', 'sneaker'],
    ['women', 'Women', 'sc', 'euw', 'khussa'],
    ['kids', 'Kids', 'sc', 'kidsf', 'sneaker'],
    ['acc', 'Shoe care', 'simple', '', 'belt'],
  ],
  jewellery: [
    ['gold', 'Gold', 'piece'],
    ['silver', 'Silver', 'piece'],
    ['bridal', 'Bridal sets', 'piece'],
    ['artificial', 'Artificial', 'simple'],
  ],
  pharmacy: [
    ['tablets', 'Tablets', 'batch'],
    ['syrups', 'Syrups', 'batch'],
    ['injections', 'Injections', 'batch'],
    ['devices', 'Medical devices', 'simple'],
    ['care', 'Personal care', 'batch'],
  ],
  grocery: [
    ['atta', 'Atta and rice', 'pack'],
    ['oil', 'Oil and ghee', 'pack'],
    ['drinks', 'Drinks', 'pack'],
    ['snacks', 'Snacks', 'pack'],
    ['household', 'Household', 'pack'],
  ],
  cosmetics: [
    ['makeup', 'Makeup', 'shade'],
    ['skin', 'Skin care', 'batch'],
    ['hair', 'Hair care', 'batch'],
    ['fragrance', 'Fragrance', 'simple'],
  ],
  mobile: [
    ['phones', 'Phones', 'serial'],
    ['chargers', 'Chargers', 'simple'],
    ['covers', 'Covers', 'simple'],
    ['audio', 'Audio', 'serial'],
  ],
  other: [['general', 'General', 'simple']],
};

export function categoriesForKit(kit: ShopKitId): ProductCategory[] {
  return (SHOP_CATEGORIES[kit] ?? SHOP_CATEGORIES.clothing).map((c, idx) => ({
    id: c[0],
    label: c[1],
    type: c[2],
    sizeSetId: c[3] || undefined,
    art: c[4] || undefined,
    counterVisible: !(kit === 'clothing' && c[0] === 'kids'),
    order: idx,
  }));
}

export const SWATCHES: Record<string, string> = {
  Black: '#24282A',
  White: '#F7F5F0',
  Navy: '#26375E',
  Sky: '#93B9DC',
  Olive: '#6E7442',
  Grey: '#8C918E',
  Beige: '#D9C8A7',
  Indigo: '#33437A',
  Rose: '#E2A2B3',
  Mint: '#A9D9C2',
  Charcoal: '#3B3E3D',
  Rust: '#A4532E',
  Cream: '#EFE6D2',
  Brown: '#6E4626',
  Gold: '#C9A24A',
  Maroon: '#6E2230',
  Tan: '#8A5A33',
  Slate: '#5E6B73',
  Coffee: '#4B3221',
  Mustard: '#C9962E',
  Silver: '#B9BDC0',
  Red: '#B3312F',
  Camel: '#B88A5A',
};

export const CATEGORY_TINTS: Record<string, { bg: string; fg: string }> = {
  men: { bg: '#E1EEEE', fg: '#0B4F55' },
  women: { bg: '#F6E4DF', fg: '#7A3427' },
  foot: { bg: '#F1E6D6', fg: '#6B4A1E' },
  acc: { bg: '#E5EDE3', fg: '#2F4A2E' },
  fabric: { bg: '#ECE6EF', fg: '#4A3A5A' },
};

export const PRODUCT_ART: Record<ProductArtId, { b: string; s: string; l: string }> = {
  tee: {
    b: 'M44 20L52 17C55 23 65 23 68 17L76 20L98 33L90 50L80 45V100C66 103 54 103 40 100V45L30 50L22 33Z',
    s: 'M40 92C54 95 66 95 80 92V100C66 103 54 103 40 100ZM90 50L80 45V40L93 44Z',
    l: 'M52 17C55 25 65 25 68 17M40 45V36M80 45V36',
  },
  kurta: {
    b: 'M46 12L54 10C56 15 64 15 66 10L74 12L94 27L88 45L80 41L82 109C68 111 52 111 38 109L40 41L32 45L26 27Z',
    s: 'M38 101C52 103 68 103 82 101V109C68 111 52 111 38 109Z',
    l: 'M54 10C56 16 64 16 66 10M60 14V42M60 21v.01M60 28v.01M60 35v.01M39.5 92v12M80.5 92v12',
  },
  suit: {
    b: 'M47 10L55 8H65L73 10L92 24L86 42L79 38L80 90C68 92 52 92 40 90L41 38L34 42L28 24ZM44 90H76L78 112H64L60 98L56 112H42Z',
    s: 'M44 90H76L76.6 96H43.4ZM40 84C52 86 68 86 80 84V90C68 92 52 92 40 90Z',
    l: 'M55 8V13C58 15 62 15 65 13V8M60 14V34M40.5 76v12M79.5 76v12',
  },
  jeans: {
    b: 'M38 12H82L86 108H66L60 50L54 108H34Z',
    s: 'M38 12H82L82.5 21H37.5Z',
    l: 'M38 21H82M60 21V44M44 22c0 7 5 10 10 10M76 22c0 7-5 10-10 10M64 30v.01M40 100h12M68 100h12',
  },
  lawn: {
    b: 'M24 42H96Q100 42 100 46V60Q100 64 96 64H24Q20 64 20 60V46Q20 42 24 42ZM18 66H102V80Q102 84 98 84H22Q18 84 18 80ZM16 86H104V100Q104 104 100 104H20Q16 104 16 100Z',
    s: 'M18 66H102V70H18ZM16 86H104V90H16Z',
    l: 'M34 50a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M52 54a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M70 50a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M86 55a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M26 76H94M24 96H96',
  },
  shawl: {
    b: 'M24 26H96Q100 26 100 30V72L60 92L20 72V30Q20 26 24 26Z',
    s: 'M20 64L60 84L100 64V72L60 92L20 72Z',
    l: 'M28 76v10M36 80v10M44 84v10M52 88v10M68 88v10M76 84v10M84 80v10M92 76v10M46 48c4-9 18-9 18 2c0 7-8 10-12 6M30 34H90',
  },
  chappal: {
    b: 'M60 12C76 12 82 28 80 48C78 64 82 78 80 92C78 105 70 110 60 110C50 110 42 105 40 92C38 78 42 64 40 48C38 28 44 12 60 12Z',
    s: 'M39 38C50 33 70 33 81 38L82 51C70 46 50 46 38 51ZM41 58C52 54 68 54 79 58L80 69C68 65 52 65 40 69Z',
    l: 'M47 41v4M53 40v5M60 39.5v5M67 40v5M73 41v4M60 76V102',
  },
  sneaker: {
    b: 'M12 84C12 72 18 66 28 64L46 58C52 56 56 58 58 62C64 70 74 72 86 74C100 76 108 80 108 88V92H12Z',
    s: 'M12 88H108V94C108 97 106 98 103 98H16C13 98 12 96 12 94Z',
    l: 'M50 62L56 70M58 60L64 68M66 64L70 71M30 80H76M96 80v.01',
  },
  khussa: {
    b: 'M14 86C14 76 22 70 34 70C50 70 62 72 78 70C92 68 100 60 104 52C108 60 106 74 98 82C90 90 74 94 56 94H22C17 94 14 91 14 86Z',
    s: 'M14 89C30 93 60 93 98 84V86C88 93 72 97 56 97H22C17 97 14 94 14 89Z',
    l: 'M40 79v.01M48 78.5v.01M56 78v.01M64 77.5v.01M72 76.5v.01M30 74C44 82 70 80 90 70',
  },
  belt: {
    b: 'M10 52H96Q104 52 104 60Q104 68 96 68H10Z',
    s: 'M10 64H100Q104 64 103 66Q101 68 96 68H10Z',
    l: 'M14 46H36V74H14ZM25 60H52M70 60v.01M78 60v.01M86 60v.01',
  },
  socks: {
    b: 'M30 14H48V62C48 70 52 74 60 78C68 82 70 94 60 98C52 102 42 96 34 90C28 84 30 74 30 68ZM58 22H76V66C76 74 80 78 88 82C96 86 98 98 88 102C80 106 70 100 62 94C56 88 58 78 58 72Z',
    s: 'M30 14H48V24H30ZM58 22H76V32H58Z',
    l: 'M34 16v6M39 16v6M44 16v6M62 24v6M67 24v6M72 24v6',
  },
  fabric: {
    b: 'M28 34H90A10 22 0 0 1 90 78H28A10 22 0 0 1 28 34ZM34 78L26 106H76L70 78Z',
    s: 'M90 34A10 22 0 0 1 90 78A10 22 0 0 1 90 34Z',
    l: 'M38 46H82M38 56H82M38 66H82M90 50A4 7 0 0 1 90 62',
  },
};
