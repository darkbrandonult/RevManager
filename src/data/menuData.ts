export interface MenuItem {
  id: number
  name: string
  description: string
  price: string
  category: string
  is_available: boolean
  effective_availability: boolean
  eighty_six_reason?: string | null
  menu_type?: string
  addons?: string[]
  spice_level?: string
  dietary?: string
  kids_drink?: string
  special_day?: string
  ice_options?: string
  water_options?: string
  combo_includes?: string
  time_restriction?: string
}

export const menuItems: MenuItem[] = [
  // APPETIZERS
  { id: 1, name: 'Loaded Nachos Supreme', description: 'Crispy tortilla chips topped with melted cheese blend, jalapeños, diced tomatoes, green onions, sour cream, and guacamole. Add protein for extra flavor!', price: '14.99', category: 'Appetizers', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Grilled Chicken +$4', 'Ground Beef +$5', 'Pulled Pork +$6', 'Extra Cheese +$2', 'Extra Guacamole +$3'], spice_level: 'Medium' },
  { id: 2, name: 'Buffalo Chicken Wings', description: 'Eight crispy chicken wings tossed in your choice of sauce, served with celery sticks and blue cheese dip', price: '12.99', category: 'Appetizers', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Wings (4) +$6', 'Extra Sauce +$1', 'Ranch Dip +$1'], spice_level: 'Choose: Mild, Medium, Hot, Extra Hot, BBQ, Honey Garlic' },
  { id: 3, name: 'Mozzarella Sticks', description: 'Six golden-fried mozzarella sticks with a crispy coating, served with marinara sauce', price: '9.99', category: 'Appetizers', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Marinara +$1', 'Ranch Sauce +$1'] },
  { id: 4, name: 'Loaded Potato Skins', description: 'Crispy potato skins loaded with bacon bits, melted cheddar cheese, and green onions. Served with sour cream.', price: '11.99', category: 'Appetizers', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Bacon +$3', 'Jalapeños +$1', 'Extra Sour Cream +$1'] },

  // SALADS  
  { id: 5, name: 'Caesar Salad', description: 'Fresh romaine lettuce tossed with Caesar dressing, parmesan cheese, and homemade croutons', price: '10.99', category: 'Salads', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Grilled Chicken +$5', 'Grilled Shrimp +$7', 'Salmon +$8', 'Extra Parmesan +$2'] },
  { id: 6, name: 'Mediterranean Bowl (Vegan)', description: 'Quinoa base with chickpeas, cucumber, cherry tomatoes, red onion, olives, and tahini dressing. Completely plant-based and nutritious!', price: '13.99', category: 'Salads', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Avocado +$3', 'Hummus +$2', 'Extra Tahini +$1'], dietary: 'Vegan, Gluten-Free' },
  { id: 7, name: 'Garden Fresh Salad (Vegetarian)', description: 'Mixed greens, tomatoes, cucumbers, carrots, bell peppers, and your choice of dressing', price: '9.99', category: 'Salads', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Feta Cheese +$3', 'Avocado +$3', 'Hard-boiled Egg +$2'], dietary: 'Vegetarian' },

  // MAIN COURSES
  { id: 8, name: 'Grilled Salmon Teriyaki', description: 'Fresh Atlantic salmon grilled to perfection with teriyaki glaze, served with jasmine rice and steamed vegetables', price: '22.99', category: 'Main Courses', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Teriyaki Sauce +$1', 'Substitute Quinoa +$2', 'Side Salad +$4'] },
  { id: 9, name: 'Ribeye Steak', description: '12oz premium ribeye steak grilled to your preference, served with garlic mashed potatoes and asparagus', price: '28.99', category: 'Main Courses', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Mushroom Sauce +$3', 'Blue Cheese Crumbles +$3', 'Loaded Potato +$2'], spice_level: 'Preparation: Rare, Medium-Rare, Medium, Medium-Well, Well-Done' },
  { id: 10, name: 'Chicken Parmesan', description: 'Breaded chicken breast topped with marinara sauce and melted mozzarella, served with spaghetti', price: '18.99', category: 'Main Courses', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Cheese +$2', 'Side Caesar Salad +$4', 'Garlic Bread +$3'] },
  { id: 11, name: 'Vegan Buddha Bowl', description: 'Quinoa, roasted sweet potato, chickpeas, avocado, purple cabbage, edamame, and sesame-ginger dressing. A complete plant-based meal!', price: '16.99', category: 'Main Courses', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Tofu +$4', 'Extra Avocado +$3', 'Tahini Drizzle +$2'], dietary: 'Vegan, Gluten-Free' },
  { id: 12, name: 'Vegetarian Pasta Primavera', description: 'Fettuccine pasta with seasonal vegetables, garlic, and creamy alfredo sauce. Fresh and satisfying!', price: '15.99', category: 'Main Courses', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Grilled Vegetables +$3', 'Extra Parmesan +$2', 'Garlic Bread +$3'], dietary: 'Vegetarian' },

  // BURGERS & SANDWICHES
  { id: 13, name: 'Bacon Cheeseburger Deluxe', description: '8oz beef patty with cheddar cheese, crispy bacon, lettuce, tomato, onion, and special sauce on a brioche bun. Served with fries.', price: '16.99', category: 'Burgers & Sandwiches', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Patty +$6', 'Avocado +$3', 'Onion Rings +$2', 'Sweet Potato Fries +$3'], spice_level: 'Add Jalapeños for heat!' },
  { id: 14, name: 'Impossible Burger (Vegan)', description: 'Plant-based Impossible patty with vegan cheese, lettuce, tomato, onion, and vegan mayo on a vegan bun. Served with fries.', price: '17.99', category: 'Burgers & Sandwiches', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Avocado +$3', 'Vegan Bacon +$4', 'Sweet Potato Fries +$3'], dietary: 'Vegan' },
  { id: 15, name: 'Spicy Chicken Sandwich', description: 'Crispy fried chicken breast with spicy mayo, pickles, and coleslaw on a brioche bun', price: '14.99', category: 'Burgers & Sandwiches', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Spicy Mayo +$1', 'Cheese +$2', 'Bacon +$3'], spice_level: 'Medium-Hot (can be made milder)' },

  // PIZZA
  { id: 16, name: 'Margherita Pizza', description: 'Classic pizza with fresh mozzarella, San Marzano tomatoes, fresh basil, and olive oil on our hand-tossed dough', price: '18.99', category: 'Pizza', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Cheese +$3', 'Pepperoni +$3', 'Mushrooms +$2', 'Extra Basil +$1'] },
  { id: 17, name: 'Vegan Supreme Pizza', description: 'Vegan cheese, mushrooms, bell peppers, red onions, olives, and vegan sausage on our vegan-friendly crust', price: '21.99', category: 'Pizza', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Vegan Cheese +$3', 'Jalapeños +$1', 'Artichokes +$3'], dietary: 'Vegan' },
  { id: 18, name: 'Meat Lovers Pizza', description: 'Pepperoni, sausage, bacon, ham, and ground beef with mozzarella cheese', price: '24.99', category: 'Pizza', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Meat +$4', 'Extra Cheese +$3', 'Hot Peppers +$1'] },

  // KIDS MENU
  { id: 19, name: 'Kids Chicken Tenders', description: 'Three crispy chicken tenders served with fries and choice of dipping sauce. Includes apple slices and a drink.', price: '8.99', category: 'Kids Menu', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Tender +$2', 'Mac & Cheese instead of fries +$1'], kids_drink: 'Included: Milk, Apple Juice, or Chocolate Milk' },
  { id: 20, name: 'Kids Mac & Cheese', description: 'Creamy mac and cheese made with real cheddar. Served with steamed broccoli and apple slices. Includes a drink.', price: '7.99', category: 'Kids Menu', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Cheese +$1', 'Chicken Bites +$3'], kids_drink: 'Included: Milk, Apple Juice, or Chocolate Milk' },
  { id: 21, name: 'Kids Cheese Pizza', description: 'Personal 8" cheese pizza with mild tomato sauce. Served with apple slices and a drink.', price: '8.99', category: 'Kids Menu', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Pepperoni +$1', 'Extra Cheese +$1'], kids_drink: 'Included: Milk, Apple Juice, or Chocolate Milk' },
  { id: 22, name: 'Kids Grilled Cheese', description: 'Classic grilled cheese sandwich on white bread, served with fries and apple slices. Includes a drink.', price: '6.99', category: 'Kids Menu', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Ham +$2', 'Tomato +$1'], kids_drink: 'Included: Milk, Apple Juice, or Chocolate Milk' },

  // NIGHTLY SPECIALS
  { id: 23, name: 'Monday Night Fish & Chips', description: 'Beer-battered cod with crispy fries, coleslaw, and tartar sauce. Available Mondays only!', price: '15.00', category: 'Nightly Specials', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Fish +$5', 'Mushy Peas +$2'], special_day: 'Monday Only' },
  { id: 24, name: 'Taco Tuesday Platter', description: 'Three soft tacos with your choice of protein, rice, beans, and all the fixings. Tuesday special!', price: '15.00', category: 'Nightly Specials', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Taco +$4', 'Guacamole +$3', 'Queso +$2'], spice_level: 'Choose: Mild, Medium, Hot', special_day: 'Tuesday Only' },
  { id: 25, name: 'Wing Wednesday Feast', description: '12 wings with your choice of sauce, celery, and blue cheese. Wednesday only!', price: '15.00', category: 'Nightly Specials', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra 6 Wings +$7', 'Extra Sauce +$1'], spice_level: 'Choose: Mild, Medium, Hot, Extra Hot, BBQ, Honey Garlic', special_day: 'Wednesday Only' },
  { id: 26, name: 'Thursday Pasta Night', description: 'Choice of spaghetti, fettuccine, or penne with marinara, alfredo, or pesto sauce. Includes garlic bread.', price: '15.00', category: 'Nightly Specials', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Grilled Chicken +$4', 'Shrimp +$6', 'Meatballs +$4', 'Extra Garlic Bread +$2'], special_day: 'Thursday Only' },

  // DESSERTS
  { id: 27, name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center, served with vanilla ice cream and berry compote', price: '8.99', category: 'Desserts', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Ice Cream +$3', 'Whipped Cream +$1'] },
  { id: 28, name: 'Vegan Chocolate Mousse', description: 'Rich and creamy chocolate mousse made with coconut cream and dark chocolate. Topped with fresh berries.', price: '7.99', category: 'Desserts', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Berries +$2'], dietary: 'Vegan' },

  // BEVERAGES
  { id: 29, name: 'Craft Soda Selection', description: 'Choose from: Cola, Lemon-Lime, Orange, Root Beer, or Ginger Ale', price: '3.99', category: 'Beverages', is_available: true, effective_availability: true, menu_type: 'regular', ice_options: 'Regular Ice, Light Ice, No Ice, Extra Ice' },
  { id: 30, name: 'Fresh Lemonade', description: 'House-made fresh lemonade. Available regular or strawberry.', price: '4.99', category: 'Beverages', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Strawberry Flavor +$1'], ice_options: 'Regular Ice, Light Ice, No Ice, Extra Ice' },
  { id: 31, name: 'Premium Water', description: 'Still or sparkling water', price: '2.99', category: 'Beverages', is_available: true, effective_availability: true, menu_type: 'regular', water_options: 'Still or Sparkling, Room Temperature, Chilled, No Ice, Light Ice, Regular Ice, Extra Ice' },
  { id: 32, name: 'Coffee & Espresso', description: 'Freshly brewed coffee, espresso, cappuccino, or latte', price: '3.99', category: 'Beverages', is_available: true, effective_availability: true, menu_type: 'regular', addons: ['Extra Shot +$1', 'Oat Milk +$1', 'Almond Milk +$1', 'Extra Hot +$0', 'Iced +$0'] },
  { id: 33, name: 'Fresh Juice Bar', description: 'Fresh-squeezed orange, apple, cranberry, or mixed berry juice', price: '5.99', category: 'Beverages', is_available: true, effective_availability: true, menu_type: 'regular', ice_options: 'Regular Ice, Light Ice, No Ice, Extra Ice' },

  // COMBO DEALS
  { id: 34, name: 'Lunch Combo Deal', description: 'Choose any sandwich or burger with fries and a drink. Available 11am-3pm.', price: '12.99', category: 'Combo Deals', is_available: true, effective_availability: true, menu_type: 'regular', combo_includes: 'Sandwich/Burger + Fries + Drink', time_restriction: '11am-3pm only' },
  { id: 35, name: 'Family Pizza Deal', description: 'Large 16" pizza with up to 3 toppings, garlic bread, and 2-liter soda', price: '29.99', category: 'Combo Deals', is_available: true, effective_availability: true, menu_type: 'regular', combo_includes: 'Large Pizza + Garlic Bread + 2L Soda' },
  { id: 36, name: 'Date Night Special', description: 'Two entrees, shared appetizer, dessert, and bottle of wine', price: '45.99', category: 'Combo Deals', is_available: true, effective_availability: true, menu_type: 'regular', combo_includes: '2 Entrees + Appetizer + Dessert + Wine', time_restriction: 'After 5pm' },

  // NIGHT MENU
  { id: 37, name: 'Midnight Burger Deluxe', description: 'Double beef patty with bacon, cheese, and loaded fries. Perfect for late night cravings!', price: '18.99', category: 'Main Courses', is_available: true, effective_availability: true, menu_type: 'night', addons: ['Extra Patty +$6', 'Onion Rings +$3'], time_restriction: '10PM - 2AM' },
  { id: 38, name: 'Late Night Wings & Fries', description: '10 wings with your choice of sauce and seasoned fries', price: '16.99', category: 'Appetizers', is_available: true, effective_availability: true, menu_type: 'night', spice_level: 'Choose: Mild, Medium, Hot, Extra Hot', time_restriction: '10PM - 2AM' },

  // HOLIDAY MENU
  { id: 39, name: 'Holiday Stuffed Turkey', description: 'Traditional roasted turkey with sage stuffing, cranberry sauce, and seasonal vegetables', price: '28.99', category: 'Specials', is_available: true, effective_availability: true, menu_type: 'holiday', addons: ['Extra Stuffing +$3', 'Extra Cranberry Sauce +$2'] },
  { id: 40, name: 'Pumpkin Spice Cheesecake', description: 'Seasonal pumpkin spice cheesecake with whipped cream and cinnamon', price: '9.99', category: 'Desserts', is_available: true, effective_availability: true, menu_type: 'holiday', addons: ['Extra Whipped Cream +$1'] }
]
