// Demo menu (frontend ke seed data jaisa). `npm run seed` isse Hotel Sunrise banata hai
const hf = (half, full) => [{ label: "Half", price: half }, { label: "Full", price: full }];
const one = (price, label = "Regular") => [{ label, price }];
const p = (id, label, price) => ({ label, price });

const d = (id, name, category, portions, veg, rating, votes, minutes, spicy, desc, extra = {}) => ({
    id, name, category, portions, veg, rating, votes, minutes, spicy, desc, available: true, ...extra,
});

export const DEMO_CATEGORIES = [
  { id: 'starters', name: 'Starters', blurb: 'Tandoor and fry', cover: 'paneer-tikka' },
  { id: 'main', name: 'Main course', blurb: 'Curries and dal', cover: 'butter-chicken' },
  { id: 'rice', name: 'Biryani and rice', blurb: 'Dum and steamed', cover: 'chicken-biryani' },
  { id: 'breads', name: 'Breads', blurb: 'Fresh from the tandoor', cover: 'butter-naan' },
  { id: 'fast', name: 'Pizza and noodles', blurb: 'Quick favourites', cover: 'margherita-pizza' },
  { id: 'desserts', name: 'Desserts', blurb: 'Something sweet', cover: 'gulab-jamun' },
  { id: 'drinks', name: 'Drinks', blurb: 'Cool and hot', cover: 'mango-lassi' },
];

export const DEMO_DISHES = [
  d('paneer-tikka', 'Paneer Tikka', 'starters', hf(150, 300), true, 4.6, 1240, 15, 2, 'Smoky tandoori cottage cheese with capsicum and onion, served with mint chutney.', { bestseller: true }),
  d('chicken-65', 'Chicken 65', 'starters', hf(160, 289), false, 4.5, 980, 18, 3, 'Crisp fried chicken tossed with curry leaves, green chilli and pepper.'),
  d('spring-rolls', 'Veg Spring Rolls', 'starters', one(199), true, 4.2, 610, 12, 1, 'Golden rolls stuffed with cabbage, carrot and glass noodles, with sweet chilli dip.'),
  d('hara-bhara-kabab', 'Hara Bhara Kabab', 'starters', one(229), true, 4.4, 702, 14, 1, 'Spinach, peas and potato patties, pan-seared and served with chutney.'),
  d('crispy-corn', 'Crispy Corn', 'starters', one(189), true, 4.3, 540, 10, 1, 'Fried sweet corn tossed with onion, capsicum and chaat masala.'),

  d('paneer-butter-masala', 'Paneer Butter Masala', 'main', hf(160, 299), true, 4.7, 2310, 20, 1, 'Soft paneer in a rich tomato and cashew gravy finished with butter.', { bestseller: true }),
  d('dal-makhani', 'Dal Makhani', 'main', hf(140, 249), true, 4.6, 1480, 18, 0, 'Black lentils simmered overnight and finished with cream and butter.'),
  d('butter-chicken', 'Butter Chicken', 'main', hf(210, 349), false, 4.8, 3120, 22, 1, 'Tandoori chicken in a silky tomato gravy. The house favourite.', { bestseller: true }),
  d('palak-paneer', 'Palak Paneer', 'main', hf(150, 279), true, 4.3, 640, 18, 0, 'Paneer cubes in a smooth spinach gravy with garlic and cumin.'),
  d('kadai-paneer', 'Kadai Paneer', 'main', hf(155, 289), true, 4.4, 780, 20, 2, 'Paneer with capsicum and onion in a freshly ground kadai masala.'),

  d('chicken-biryani', 'Chicken Biryani', 'rice', hf(189, 329), false, 4.7, 2760, 28, 2, 'Dum-cooked basmati layered with marinated chicken and saffron. Served with raita.', { bestseller: true }),
  d('veg-biryani', 'Veg Biryani', 'rice', hf(149, 259), true, 4.2, 830, 25, 1, 'Basmati rice with seasonal vegetables, mint and fried onions. Served with raita.'),
  d('jeera-rice', 'Jeera Rice', 'rice', one(149), true, 4.1, 430, 10, 0, 'Steamed basmati tempered with cumin and ghee.'),

  d('butter-naan', 'Butter Naan', 'breads', [{ label: '1 pc', price: 55 }, { label: '6 pcs', price: 300 }], true, 4.5, 1900, 8, 0, 'Soft leavened bread from the tandoor, brushed with butter.'),
  d('garlic-naan', 'Garlic Naan', 'breads', [{ label: '1 pc', price: 69 }, { label: '6 pcs', price: 375 }], true, 4.6, 2050, 8, 0, 'Naan topped with chopped garlic and coriander.', { bestseller: true }),
  d('tandoori-roti', 'Tandoori Roti', 'breads', [{ label: '1 pc', price: 29 }, { label: '6 pcs', price: 160 }], true, 4.2, 760, 7, 0, 'Whole wheat flatbread baked in the tandoor.'),
  d('laccha-paratha', 'Laccha Paratha', 'breads', one(59, '1 pc'), true, 4.4, 690, 9, 0, 'Flaky layered whole wheat paratha with ghee.', { available: false }),

  d('margherita-pizza', 'Margherita Pizza', 'fast', one(299), true, 4.4, 920, 18, 0, 'Wood-fired base with tomato sauce, mozzarella and fresh basil.'),
  d('farmhouse-pizza', 'Farmhouse Pizza', 'fast', one(379), true, 4.4, 810, 20, 0, 'Capsicum, onion, olives, sweet corn and mushroom on mozzarella.'),
  d('hakka-noodles', 'Veg Hakka Noodles', 'fast', hf(139, 219), true, 4.1, 560, 14, 1, 'Wok-tossed noodles with crunchy vegetables and soy.'),
  d('red-sauce-pasta', 'Red Sauce Pasta', 'fast', one(249), true, 4.2, 480, 15, 0, 'Penne in a tangy tomato and basil sauce, topped with parmesan.'),

  d('gulab-jamun', 'Gulab Jamun', 'desserts', [{ label: '2 pcs', price: 99 }, { label: '4 pcs', price: 189 }], true, 4.7, 2200, 6, 0, 'Warm milk dumplings soaked in cardamom syrup.', { bestseller: true }),
  d('rasmalai', 'Rasmalai', 'desserts', one(129, '2 pcs'), true, 4.6, 1020, 5, 0, 'Soft cheese discs in chilled saffron milk with pistachio.'),
  d('brownie-sundae', 'Brownie Sundae', 'desserts', one(179), true, 4.5, 890, 8, 0, 'Warm chocolate brownie, vanilla ice cream and hot fudge.'),
  d('gajar-halwa', 'Gajar Halwa', 'desserts', one(119), true, 4.4, 640, 6, 0, 'Slow-cooked carrot pudding with khoya, nuts and cardamom.'),

  d('mango-lassi', 'Mango Lassi', 'drinks', one(99), true, 4.6, 1330, 4, 0, 'Thick chilled yoghurt blended with Alphonso mango pulp.'),
  d('lime-soda', 'Fresh Lime Soda', 'drinks', one(79), true, 4.3, 770, 3, 0, 'Fresh lime and mint with soda. Choose sweet or salted at the counter.'),
  d('cold-coffee', 'Cold Coffee', 'drinks', one(129), true, 4.4, 910, 5, 0, 'Blended coffee, milk and ice cream with a chocolate drizzle.'),
  d('masala-chai', 'Masala Chai', 'drinks', [{ label: 'Cup', price: 49 }, { label: 'Kettle (3 cups)', price: 129 }], true, 4.5, 1560, 5, 0, 'Strong tea simmered with ginger, cardamom and milk.'),
];
