export type DietaryTag = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free'
export type Difficulty = 'Easy' | 'Intermediate' | 'Advanced'
export type Collection =
  | 'Culinary Journeys'
  | 'Seasonal Sensations'
  | 'Gourmet Guerillas'
  | 'Quick & Creative'
  | 'Baking Alchemy'

export interface IngredientGroup {
  group: string
  items: string[]
}

export interface Step {
  title: string
  body: string
}

export interface Recipe {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  collection: Collection
  cuisine: string
  moodTags: string[]
  dietaryTags: DietaryTag[]
  difficulty: Difficulty
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  ingredients: IngredientGroup[]
  steps: Step[]
  nutrition: { calories: number; protein: string; carbs: string; fat: string; fiber: string }
  originStory: string
  gradient: string
  aiGenerated: boolean
}

export const RECIPES: Recipe[] = [
  {
    id: '1',
    slug: 'miso-glazed-salmon',
    title: 'Miso-Glazed Salmon',
    subtitle: 'A weeknight hero',
    description: 'Sweet, savory, and done in 20 minutes. The miso glaze caramelizes under the broiler into something that feels far more impressive than the effort involved.',
    collection: 'Quick & Creative',
    cuisine: 'Japanese-inspired',
    moodTags: ['quick', 'weeknight', 'umami', 'healthy'],
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'Easy',
    prepTime: '5 min',
    cookTime: '15 min',
    totalTime: '20 min',
    servings: '2',
    gradient: 'from-orange-800 to-amber-600',
    aiGenerated: false,
    ingredients: [
      {
        group: 'Salmon',
        items: [
          '2 salmon fillets (about 6 oz each)',
          'Salt and white pepper to taste',
        ],
      },
      {
        group: 'Miso glaze',
        items: [
          '2 tbsp white miso paste',
          '1 tbsp mirin',
          '1 tbsp sake (or dry sherry)',
          '1 tsp sesame oil',
          '1 tsp honey',
        ],
      },
      {
        group: 'To serve',
        items: [
          'Steamed rice',
          '2 scallions, thinly sliced',
          '1 tsp toasted sesame seeds',
        ],
      },
    ],
    steps: [
      {
        title: 'Make the glaze',
        body: 'Whisk together the miso, mirin, sake, sesame oil, and honey in a small bowl until smooth. Taste — it should be intensely savory with a hint of sweetness.',
      },
      {
        title: 'Prep the salmon',
        body: 'Pat the salmon dry with paper towels. Season lightly with salt and white pepper. Place skin-side down on a foil-lined baking sheet.',
      },
      {
        title: 'Glaze and broil',
        body: 'Spread a generous layer of glaze over the top of each fillet. Broil on the top rack for 10 to 12 minutes, watching carefully. The glaze should darken and caramelize at the edges — that is where all the flavor is.',
      },
      {
        title: 'Rest and serve',
        body: 'Let the salmon rest for 2 minutes before serving over steamed rice. Scatter sliced scallions and sesame seeds over the top.',
      },
    ],
    nutrition: { calories: 420, protein: '38g', carbs: '12g', fat: '22g', fiber: '0g' },
    originStory: 'Miso-marinated fish is a cornerstone of Kyoto cuisine, where the technique of preserving fish in miso — known as misozuke — dates back centuries. This fast weeknight version captures the same depth of flavor in a fraction of the time, using the broiler to mimic the caramelization of a traditional Japanese grill.',
  },
  {
    id: '2',
    slug: 'lamb-kofta-with-tahini',
    title: 'Lamb Kofta with Tahini',
    subtitle: 'Street-food flavors at home',
    description: 'Fragrant with warm spices, charred at the edges, and served with a silky tahini sauce that ties it all together. This is the kind of food that makes you eat standing at the counter.',
    collection: 'Culinary Journeys',
    cuisine: 'Middle Eastern',
    moodTags: ['smoky', 'spiced', 'weekend', 'crowd-pleaser'],
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'Intermediate',
    prepTime: '15 min',
    cookTime: '20 min',
    totalTime: '35 min',
    servings: '4',
    gradient: 'from-stone-700 to-amber-800',
    aiGenerated: false,
    ingredients: [
      {
        group: 'Kofta',
        items: [
          '500g ground lamb',
          '1 small onion, grated',
          '3 garlic cloves, minced',
          '2 tsp ground cumin',
          '1 tsp ground coriander',
          '1 tsp smoked paprika',
          '1/2 tsp cinnamon',
          '1/4 tsp cayenne',
          'Handful fresh parsley, finely chopped',
          'Salt and black pepper',
        ],
      },
      {
        group: 'Tahini sauce',
        items: [
          '4 tbsp tahini',
          '2 tbsp lemon juice',
          '1 garlic clove, grated',
          '4 tbsp cold water',
          'Salt to taste',
        ],
      },
      {
        group: 'To serve',
        items: [
          'Warm flatbreads or pita',
          'Sliced cucumber and tomato',
          'Fresh herbs (parsley, mint)',
          'Lemon wedges',
        ],
      },
    ],
    steps: [
      {
        title: 'Mix the kofta',
        body: 'Combine the lamb with the grated onion, garlic, spices, parsley, and a generous pinch of salt. Mix well with your hands — the warmth helps the fat emulsify into the mix. Refrigerate for at least 10 minutes if you have time.',
      },
      {
        title: 'Shape',
        body: 'Divide the mixture into 8 equal portions. Shape each into a long oval around a skewer or freehand into a sausage shape. Press firmly so they hold together on the grill.',
      },
      {
        title: 'Make the tahini sauce',
        body: 'Whisk tahini with lemon juice and grated garlic. The mixture will seize and look broken at first — keep whisking while adding cold water a spoonful at a time until silky and pourable. Season with salt.',
      },
      {
        title: 'Grill',
        body: 'Grill on high heat for 4 to 5 minutes per side. You want a deep, slightly charred crust — do not move them until they release naturally from the grill. Rest for 2 minutes.',
      },
      {
        title: 'Serve',
        body: 'Lay the kofta over warm flatbreads, drizzle generously with tahini sauce, and top with cucumber, tomato, herbs, and a squeeze of lemon.',
      },
    ],
    nutrition: { calories: 520, protein: '32g', carbs: '18g', fat: '36g', fiber: '2g' },
    originStory: 'Kofta appears across a vast arc of the world, from the Balkans through the Middle East to South Asia, with each culture claiming its own origin. The word itself comes from the Persian word for "pounded." This version draws from Levantine tradition, where lamb kofta on skewers over charcoal is a street-food staple and a fixture of weekend gatherings.',
  },
  {
    id: '3',
    slug: 'brown-butter-financiers',
    title: 'Brown Butter Financiers',
    subtitle: 'The French bakery classic',
    description: 'A perfect financier has crisp, dark edges, a tender, slightly sticky center, and a deep hazelnut perfume from the brown butter. They are made in minutes and somehow taste like a patisserie.',
    collection: 'Baking Alchemy',
    cuisine: 'French',
    moodTags: ['baking', 'elegant', 'sweet', 'afternoon'],
    dietaryTags: ['vegetarian'],
    difficulty: 'Intermediate',
    prepTime: '15 min',
    cookTime: '30 min',
    totalTime: '45 min',
    servings: '12',
    gradient: 'from-yellow-700 to-amber-500',
    aiGenerated: false,
    ingredients: [
      {
        group: 'Batter',
        items: [
          '150g unsalted butter, plus extra for greasing',
          '150g powdered sugar, sifted',
          '60g almond flour',
          '50g all-purpose flour',
          '1/4 tsp fine sea salt',
          '4 egg whites (about 150g)',
          '1 tsp vanilla extract',
        ],
      },
    ],
    steps: [
      {
        title: 'Brown the butter',
        body: 'Melt the butter in a light-colored saucepan over medium heat. Once it starts foaming, lower the heat and watch it carefully. It will go golden, then develop dark speckles at the bottom and smell intensely nutty. Pour immediately into a cool bowl to stop the cooking. Cool until just warm.',
      },
      {
        title: 'Mix the dry ingredients',
        body: 'Whisk together the powdered sugar, almond flour, all-purpose flour, and salt in a bowl.',
      },
      {
        title: 'Combine',
        body: 'Add the egg whites and vanilla to the dry ingredients and stir until just combined. Pour in the brown butter (including all the dark speckles — that is the flavor) and stir to combine. The batter will be loose.',
      },
      {
        title: 'Rest the batter',
        body: 'Cover and refrigerate for at least 30 minutes, or overnight. This rest develops flavor and gives you a better rise.',
      },
      {
        title: 'Bake',
        body: 'Preheat oven to 200C (400F). Grease a financier or mini muffin tin generously. Fill each mold about three-quarters full. Bake for 12 to 14 minutes until the edges are deeply golden and the tops spring back when pressed. Cool in the tin for 5 minutes, then unmold.',
      },
    ],
    nutrition: { calories: 185, protein: '3g', carbs: '18g', fat: '12g', fiber: '0g' },
    originStory: 'Financiers were created in 19th-century Paris near the financial district, hence the name — their compact rectangular shape was designed to be eaten without getting crumbs on a suit. The use of almond flour and brown butter predates the financier though; the cakes share DNA with the older visitandine, made by nuns who used surplus egg whites to create something extraordinary from very little.',
  },
  {
    id: '4',
    slug: 'slow-roasted-lamb-shoulder',
    title: 'Slow-Roasted Lamb Shoulder',
    subtitle: 'With pomegranate and herbs',
    description: 'Six hours in the oven, a lifetime on the table. The kind of recipe people remember long after the meal is over.',
    collection: 'Culinary Journeys',
    cuisine: 'Middle Eastern',
    moodTags: ['slow-cook', 'celebration', 'weekend', 'crowd-pleaser'],
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'Advanced',
    prepTime: '30 min',
    cookTime: '6 hrs',
    totalTime: '6 hrs 30 min',
    servings: '6 to 8',
    gradient: 'from-stone-600 to-amber-700',
    aiGenerated: false,
    ingredients: [
      {
        group: 'Lamb',
        items: [
          '1 bone-in lamb shoulder (about 2.5 kg)',
          '6 garlic cloves',
          '2 tsp cumin seeds',
          '2 tsp coriander seeds',
          '1 tsp smoked paprika',
          '1 tsp ground cinnamon',
          'Handful fresh rosemary and thyme',
          '4 tbsp olive oil',
          'Salt and black pepper',
        ],
      },
      {
        group: 'Braising liquid',
        items: [
          '1 cup pomegranate juice',
          '1 cup chicken stock',
          '1 large onion, quartered',
          '400g can whole tomatoes',
        ],
      },
      {
        group: 'To finish',
        items: [
          'Seeds of 1 pomegranate',
          'Large handful fresh mint and parsley',
          '1 lemon, zested',
        ],
      },
    ],
    steps: [
      {
        title: 'Spice and score',
        body: 'Score the lamb all over with a knife, making cuts about 2cm deep. Toast the cumin and coriander seeds in a dry pan until fragrant, then grind. Mix with paprika, cinnamon, olive oil, salt, and pepper. Rub this all over the lamb, pressing it into the cuts. Stuff garlic cloves and herb sprigs into the cuts. Refrigerate overnight if possible.',
      },
      {
        title: 'Build the braise',
        body: 'Preheat oven to 160C (325F). Place the onion, tomatoes, pomegranate juice, and stock in a deep roasting pan. Season the liquid. Lay the lamb on top, fat side up.',
      },
      {
        title: 'Slow roast',
        body: 'Cover tightly with foil and roast for 5 hours. The lamb is done when the meat is completely yielding and falling from the bone. Remove the foil and increase heat to 200C (400F) for 30 to 45 minutes to caramelize the top.',
      },
      {
        title: 'Rest',
        body: 'Remove from the oven and rest, loosely covered, for 20 minutes. Skim excess fat from the pan juices — these become your sauce.',
      },
      {
        title: 'Serve',
        body: 'Pull the lamb apart directly in the pan. Strain and reduce the pan juices if you like a more concentrated sauce. Pile onto a platter and finish with pomegranate seeds, torn herbs, and lemon zest.',
      },
    ],
    nutrition: { calories: 680, protein: '52g', carbs: '14g', fat: '44g', fiber: '2g' },
    originStory: 'Slow-roasted lamb shoulder appears in some form across the entire Mediterranean and Middle East. This version draws from Persian and Levantine traditions of braising lamb with pomegranate — a combination that appears in manuscripts going back to the Abbasid caliphate. The long, unmolested cooking time is what distinguishes it from any weeknight dish; the patience is the recipe.',
  },
  {
    id: '5',
    slug: 'pasta-e-fagioli',
    title: 'Pasta e Fagioli',
    subtitle: 'The classic Italian peasant soup',
    description: 'Not really a soup, not quite a pasta. Somewhere in between — thick, starchy, richly flavored, impossibly cheap to make, and somehow more satisfying than most things that cost ten times as much.',
    collection: 'Seasonal Sensations',
    cuisine: 'Italian',
    moodTags: ['cozy', 'winter', 'comfort', 'budget-friendly'],
    dietaryTags: ['vegan', 'vegetarian'],
    difficulty: 'Easy',
    prepTime: '15 min',
    cookTime: '40 min',
    totalTime: '55 min',
    servings: '4 to 6',
    gradient: 'from-amber-700 to-orange-600',
    aiGenerated: false,
    ingredients: [
      {
        group: 'Base',
        items: [
          '4 tbsp olive oil, plus more to finish',
          '1 large onion, finely diced',
          '3 celery stalks, finely diced',
          '2 medium carrots, finely diced',
          '6 garlic cloves, sliced',
          '1 sprig fresh rosemary',
          '2 dried bay leaves',
          '1/2 tsp chili flakes',
        ],
      },
      {
        group: 'Beans and pasta',
        items: [
          '2 x 400g cans cannellini beans',
          '400g can whole peeled tomatoes',
          '1.2 liters vegetable stock',
          '200g ditalini or small tubular pasta',
        ],
      },
      {
        group: 'To finish',
        items: [
          'Good olive oil',
          'Freshly grated Parmesan or pecorino (optional)',
          'Black pepper',
        ],
      },
    ],
    steps: [
      {
        title: 'Build the soffritto',
        body: 'Warm the olive oil over low heat in a heavy pot. Add the onion, celery, and carrot with a pinch of salt. Cook very slowly for 20 minutes until completely soft, sweet, and golden. Do not rush this — it is the foundation of the whole dish.',
      },
      {
        title: 'Add aromatics',
        body: 'Add the garlic, rosemary, bay leaves, and chili flakes. Cook for 2 minutes until the garlic is fragrant but not colored.',
      },
      {
        title: 'Add beans and tomatoes',
        body: 'Drain one can of beans. Add to the pot along with the second can, liquid included. Add the tomatoes, crushing them by hand as they go in. Pour in the stock. Simmer for 20 minutes.',
      },
      {
        title: 'Blend partially',
        body: 'Remove the rosemary and bay. Use a stick blender to blend about a third of the soup directly in the pot — this makes it thick and starchy without losing the whole beans. Adjust consistency with water or stock if needed.',
      },
      {
        title: 'Cook the pasta',
        body: 'Bring the soup to a rolling simmer and add the pasta. Cook until al dente, stirring frequently — it will absorb liquid quickly. Adjust salt.',
      },
      {
        title: 'Finish and serve',
        body: 'Ladle into bowls and finish with a generous pour of good olive oil and a few cracks of black pepper. Parmesan if you are using it. Eat immediately — the pasta continues to absorb as it sits.',
      },
    ],
    nutrition: { calories: 420, protein: '16g', carbs: '58g', fat: '14g', fiber: '10g' },
    originStory: 'Pasta e fagioli is one of Italy\'s oldest continuous recipes, appearing in Roman texts under variations of the name. For most of Italian history it was peasant food — dried beans and pasta were what you had when you had nothing. The version that matters is always the one your grandmother made, and every family in Italy has a different grandmother.',
  },
  {
    id: '6',
    slug: 'sourdough-country-loaf',
    title: 'Sourdough Country Loaf',
    subtitle: 'The weekend project',
    description: 'A proper open-crumb sourdough with a shatteringly crisp crust and deeply tangy flavor. This one takes two days and rewards every minute of it.',
    collection: 'Baking Alchemy',
    cuisine: 'French',
    moodTags: ['baking', 'weekend-project', 'artisan', 'slow'],
    dietaryTags: ['vegan', 'vegetarian'],
    difficulty: 'Advanced',
    prepTime: '30 min',
    cookTime: '45 min',
    totalTime: '2 days (with fermentation)',
    servings: '1 loaf',
    gradient: 'from-amber-900 to-yellow-600',
    aiGenerated: false,
    ingredients: [
      {
        group: 'Dough',
        items: [
          '450g bread flour (high protein)',
          '50g whole wheat flour',
          '375g water (~75% hydration)',
          '100g active starter (mature, at peak)',
          '10g fine sea salt',
        ],
      },
    ],
    steps: [
      {
        title: 'Autolyse',
        body: 'Mix the flours and 350g of the water until no dry flour remains. Cover and rest 45 minutes. The gluten will start developing on its own.',
      },
      {
        title: 'Add starter and salt',
        body: 'Add the starter to the dough and work it in by squeezing through your fingers. Then add the salt dissolved in the remaining 25g water. Mix well. Rest 30 minutes.',
      },
      {
        title: 'Bulk fermentation',
        body: 'Over the next 4 to 5 hours, perform 4 sets of stretch and folds every 30 minutes, then leave undisturbed. The dough should grow by around 50 to 60 percent and feel alive with bubbles.',
      },
      {
        title: 'Shape',
        body: 'Turn the dough out onto an unfloured surface. Pre-shape into a round, rest 20 minutes uncovered. Then do your final shaping — build tension across the surface by dragging the dough toward you.',
      },
      {
        title: 'Cold proof',
        body: 'Place seam-side up in a well-floured banneton or bowl lined with a floured cloth. Cover and refrigerate overnight (8 to 16 hours).',
      },
      {
        title: 'Score and bake',
        body: 'Preheat your oven to 250C (480F) with a Dutch oven inside for at least 45 minutes. Turn the cold dough out onto parchment, score decisively with a razor blade. Lower into the Dutch oven, cover, and bake 20 minutes. Remove the lid and bake a further 20 to 25 minutes until deeply dark brown. Cool completely — at least 1 hour — before cutting.',
      },
    ],
    nutrition: { calories: 2400, protein: '80g', carbs: '480g', fat: '8g', fiber: '20g' },
    originStory: 'Sourdough is the oldest form of leavened bread, with evidence of fermented grain starters going back 14,000 years. The country loaf — a miche or pain de campagne — has its spiritual home in French artisan baking, but the techniques that brought it to home kitchens worldwide were largely popularized in the early 2000s by American bakers like Chad Robertson, whose Tartine Bakery in San Francisco sparked a global revival.',
  },
]

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return RECIPES.find((r) => r.slug === slug)
}

export function getRecipesByCollection(collection: Collection): Recipe[] {
  return RECIPES.filter((r) => r.collection === collection)
}

export const COLLECTION_META: Record<Collection, { description: string; gradient: string }> = {
  'Culinary Journeys': {
    description: 'Global recipes. Cultural deep-dives. The food that tells a story about where it came from.',
    gradient: 'from-amber-700 to-orange-600',
  },
  'Seasonal Sensations': {
    description: 'Time-of-year cooking. What is good right now, at the peak of its moment.',
    gradient: 'from-green-700 to-emerald-500',
  },
  'Gourmet Guerillas': {
    description: 'Elevated technique, home kitchen access. Restaurant-quality results without the pretense.',
    gradient: 'from-neutral-700 to-stone-500',
  },
  'Quick & Creative': {
    description: 'Fast, clever, minimal fuss. The weeknight recipes that actually get made.',
    gradient: 'from-blue-700 to-cyan-500',
  },
  'Baking Alchemy': {
    description: 'Bread, pastry, and sweets. The meditative, rewarding side of the kitchen.',
    gradient: 'from-yellow-700 to-amber-500',
  },
}
