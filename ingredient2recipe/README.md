# Smart Recipe Generator

A mobile-responsive frontend app that generates recipe recommendations from typed ingredients and ingredient photos.

## What is implemented

- Ingredient input
- Manual input with chips
- Autocomplete ingredient list sourced from recipe database
- Image upload with ingredient recognition hook (`recognizeIngredientsFromImage`)
- Dietary preferences: vegetarian, vegan, gluten-free, dairy-free, nut-free, low-carb

- Recipe generation
- Local recipe database with **20 recipes** (multiple cuisines)
- Matching score based on available ingredients + user preferences + ratings
- Multiple recipe suggestions with steps and nutrition
- Substitution suggestions for missing ingredients

- Filters and customization
- Cooking time, difficulty, cuisine filters
- Serving-size adjustment with ingredient and nutrition scaling

- User feedback
- Star ratings (persisted via `localStorage`)
- Save/unsave favorites (persisted via `localStorage`)
- Personalized suggestion section based on rating history and saved items

- UX and reliability
- Loading states for image recognition and recipe generation
- Input validation + basic error alerts
- Responsive layout for mobile and desktop

## Ingredient recognition approach

Current implementation is a lightweight local heuristic:
- Reads image filename tokens
- Matches tokens to known ingredients in the recipe DB
- Falls back to a common-ingredient shortlist

This keeps the project runnable without backend/API keys. To use real classification, replace `recognizeIngredientsFromImage(file)` with a call to an AI vision API and map model labels to ingredient names.

## Spoonacular API key setup

You can set the key in either place:

1. `frontend/config.js`
   - Set `window.APP_CONFIG.SPOONACULAR_API_KEY = "YOUR_KEY_HERE"`
2. In-app field:
   - Use the `Spoonacular API Key` input at the top of the page and click `Save Key`
   - It is stored in `localStorage` as `spoonacularApiKey`

When a valid key exists, recipes are fetched from Spoonacular (`findByIngredients` + recipe nutrition details). If it fails/no key is provided, the app falls back to the local recipe DB.

## Recipe matching logic

Each recipe is scored using:
- Ingredient match ratio (`matched / required`)
- Dietary filter pass/fail
- Time/difficulty/cuisine filter pass/fail
- User rating bonus

Recipes that fail active filters are excluded.

## Deploy (free hosting)

### Netlify
1. Push this repo to GitHub.
2. In Netlify: "Add new site" -> "Import from Git".
3. Build command: *(none)*
4. Publish directory: `frontend`

### Vercel
1. Import GitHub repo in Vercel.
2. Framework preset: Other
3. Output directory: `frontend`

No backend is required for the current version.

## Files

- `frontend/index.html` - App markup
- `frontend/style.css` - Responsive UI styles
- `frontend/app.js` - Recipe DB, matching, filtering, state, interactions
