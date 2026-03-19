const SPOONACULAR_BASE_URL = "https://api.spoonacular.com";

const state = {
  userIngredients: [],
  detectedIngredients: [],
  ratings: loadJson("recipeRatings", {}),
  savedIds: loadJson("savedRecipeIds", []),
  apiKey: loadApiKey(),
  liveRecipes: [],
  datasetRecipes: [],
  lastResults: [],
  compareIds: loadJson("compareIds", []),
  preferApi: loadJson("preferApi", true),
  localOnly: loadJson("localOnly", false)
};

const substitutions = {
  egg: ["flaxseed", "applesauce"],
  milk: ["oat milk", "soy milk"],
  butter: ["olive oil", "ghee"],
  flour: ["oat flour", "rice flour"],
  yogurt: ["coconut yogurt", "silken tofu"],
  chicken: ["tofu", "chickpeas"],
  cheese: ["nutritional yeast", "vegan cheese"]
};

const stockImages = [
  "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80"
];

const localRecipes = buildLocalRecipes();

window.addEventListener("DOMContentLoaded", () => {
  const dom = getDom();
  if (!dom) return;
  state.dom = dom;
  if (dom.apiKeyInput) {
    dom.apiKeyInput.value = state.apiKey;
  }
  dom.preferApiToggle.checked = state.preferApi;
  dom.localOnlyToggle.checked = state.localOnly;
  bindEvents(dom);
  renderChips();
  loadDatasetRecipes().finally(() => {
    renderIngredientOptions();
    refreshAll();
  });
});

function getDom() {
  const d = {
    chips: document.getElementById("ingredient-chips"),
    ingredientText: document.getElementById("ingredient-text"),
    addIngredientBtn: document.getElementById("add-ingredient"),
    imageUploadArea: document.getElementById("image-upload-area"),
    imageUpload: document.getElementById("image-upload"),
    cameraUpload: document.getElementById("camera-upload"),
    uploadFileBtn: document.getElementById("upload-file-btn"),
    openCameraBtn: document.getElementById("open-camera-btn"),
    imagePreview: document.getElementById("image-preview"),
    detectedWrap: document.getElementById("detected-ingredients"),
    detectedList: document.getElementById("detected-list"),
    findBtn: document.getElementById("find-recipes"),
    clearBtn: document.getElementById("clear-all"),
    loading: document.getElementById("loading"),
    recipesContainer: document.getElementById("recipes-container"),
    savedContainer: document.getElementById("saved-recipes-container"),
    suggestionsContainer: document.getElementById("suggestion-recipes-container"),
    modal: document.getElementById("recipe-modal"),
    modalBody: document.getElementById("modal-body"),
    modalTitle: document.getElementById("modal-title"),
    modalClose: document.getElementById("modal-close"),
    alertContainer: document.getElementById("alert-container"),
    ingredientOptions: document.getElementById("ingredient-options"),
    apiKeyInput: document.getElementById("api-key-input"),
    saveApiKeyBtn: document.getElementById("save-api-key"),
    preferApiToggle: document.getElementById("prefer-api"),
    localOnlyToggle: document.getElementById("local-only"),
    insightIngredients: document.getElementById("insight-ingredients"),
    insightDetected: document.getElementById("insight-detected"),
    insightLastSearch: document.getElementById("insight-last-search"),
    insightFilters: document.getElementById("insight-filters"),
    compareTray: document.getElementById("compare-tray"),
    compareCount: document.getElementById("compare-count"),
    compareItems: document.getElementById("compare-items"),
    compareClear: document.getElementById("compare-clear"),
    shoppingList: document.getElementById("shopping-list"),
    copyShopping: document.getElementById("copy-shopping"),
    sortBy: document.getElementById("sort-by"),
    blogRecipesContainer: document.getElementById("blog-recipes-container")
  };
  return d.chips && d.ingredientText && d.addIngredientBtn ? d : null;
}

function bindEvents(dom) {
  dom.addIngredientBtn.addEventListener("click", addIngredientFromInput);
  dom.ingredientText.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredientFromInput();
    }
  });

  dom.uploadFileBtn.addEventListener("click", () => dom.imageUpload.click());
  dom.openCameraBtn.addEventListener("click", () => dom.cameraUpload.click());

  dom.imageUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dom.imageUploadArea.classList.add("drag-active");
  });
  dom.imageUploadArea.addEventListener("dragleave", () => dom.imageUploadArea.classList.remove("drag-active"));
  dom.imageUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dom.imageUploadArea.classList.remove("drag-active");
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });

  dom.imageUpload.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleImageFile(file);
  });
  dom.cameraUpload.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleImageFile(file);
  });

  dom.findBtn.addEventListener("click", refreshAll);
  dom.clearBtn.addEventListener("click", clearAll);
  if (dom.saveApiKeyBtn) {
    dom.saveApiKeyBtn.addEventListener("click", saveApiKey);
  }
  dom.preferApiToggle.addEventListener("change", () => {
    state.preferApi = dom.preferApiToggle.checked;
    saveJson("preferApi", state.preferApi);
    refreshAll();
  });
  dom.localOnlyToggle.addEventListener("change", () => {
    state.localOnly = dom.localOnlyToggle.checked;
    saveJson("localOnly", state.localOnly);
    refreshAll();
  });
  dom.compareClear.addEventListener("click", () => {
    state.compareIds = [];
    saveJson("compareIds", state.compareIds);
    renderCompareTray();
  });
  dom.copyShopping.addEventListener("click", () => copyShoppingList());

  dom.modalClose.addEventListener("click", () => (dom.modal.style.display = "none"));
  dom.modal.addEventListener("click", (e) => {
    if (e.target === dom.modal) dom.modal.style.display = "none";
  });
}

function saveApiKey() {
  if (!state.dom.apiKeyInput) {
    alertMsg("API key input removed from UI.", "error");
    return;
  }
  state.apiKey = state.dom.apiKeyInput.value.trim();
  saveJson("spoonacularApiKey", state.apiKey);
  alertMsg(state.apiKey ? "API key saved." : "API key removed.", "success");
  refreshAll();
}

function addIngredientFromInput() {
  const text = state.dom.ingredientText.value.trim();
  if (!text) return alertMsg("Please type an ingredient first.", "error");
  addIngredient(text);
  state.dom.ingredientText.value = "";
  refreshAll();
}

function addIngredient(name) {
  const n = normalize(name);
  if (!n || state.userIngredients.includes(n)) return;
  state.userIngredients.push(n);
  renderChips();
}

function renderChips() {
  const box = state.dom.chips;
  box.innerHTML = "";
  if (!state.userIngredients.length) {
    box.innerHTML = '<span class="empty-chip">No ingredients added yet.</span>';
    return;
  }
  state.userIngredients.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${item}<span class="remove" role="button">&times;</span>`;
    chip.querySelector(".remove").addEventListener("click", () => {
      state.userIngredients = state.userIngredients.filter((x) => x !== item);
      renderChips();
      refreshAll();
    });
    box.appendChild(chip);
  });
}

function renderIngredientOptions() {
  const known = new Set();
  const baseLocal = state.datasetRecipes.length ? state.datasetRecipes : localRecipes;
  baseLocal.forEach((r) => r.ingredients.forEach((i) => known.add(i.canonical)));
  state.dom.ingredientOptions.innerHTML = Array.from(known)
    .sort((a, b) => a.localeCompare(b))
    .map((n) => `<option value="${n}"></option>`)
    .join("");
}

function handleImageFile(file) {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!ok.includes(file.type)) return alertMsg("Unsupported image format.", "error");
  if (file.size > 5 * 1024 * 1024) return alertMsg("Image exceeds 5MB.", "error");

  state.dom.imagePreview.src = URL.createObjectURL(file);
  state.dom.imagePreview.style.display = "block";
  setLoading(true, "Recognizing ingredients from your image...");

  recognizeIngredients(file)
    .then((detected) => {
      state.detectedIngredients = detected;
      renderDetected();
      detected.forEach((d) => addIngredient(d.name));
      alertMsg(`Detected ${detected.length} ingredient(s).`, "success");
      refreshAll();
    })
    .catch(() => alertMsg("Could not detect ingredients from this image.", "error"))
    .finally(() => setLoading(false));
}


async function recognizeIngredients(file) {
  const url = (window.APP_CONFIG && window.APP_CONFIG.OPENVISION_API_URL) || "";
  if (url) {
    try {
      const imageUrl = await fileToDataUrl(file);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageUrl })
      });
      const data = await response.json();
      const items = extractOpenVisionIngredients(data);
      if (items.length) {
        return items.map((name) => ({ name, confidence: 0.85 }));
      }
    } catch {
      // fall through to local heuristic
    }
  }

  await delay(600);
  const name = normalize(file.name.replace(/\.[^/.]+$/, ""));
  const known = new Set(localRecipes.flatMap((r) => r.ingredients.map((i) => i.canonical)));
  const direct = name
    .split(/[^a-z0-9]+/)
    .map((x) => normalize(x))
    .filter((x) => known.has(x))
    .slice(0, 4)
    .map((x) => ({ name: x, confidence: 0.75 + Math.random() * 0.2 }));
  if (direct.length) return direct;
  return ["tomato", "onion", "garlic"].map((x) => ({ name: x, confidence: 0.62 + Math.random() * 0.15 }));
}

function renderDetected() {
  state.dom.detectedList.innerHTML = "";
  state.dom.detectedWrap.style.display = state.detectedIngredients.length ? "block" : "none";
  state.detectedIngredients.forEach((item) => {
    const el = document.createElement("div");
    el.className = "detected-item";
    el.innerHTML = `
      <span>${item.name}</span>
      <span class="confidence">${Math.round(item.confidence * 100)}%</span>
      <button class="remove-detected" type="button" aria-label="Remove ${item.name}">&times;</button>
    `;
    el.querySelector(".remove-detected").addEventListener("click", () => {
      state.detectedIngredients = state.detectedIngredients.filter((ing) => ing.name !== item.name);
      state.userIngredients = state.userIngredients.filter((ing) => ing !== normalize(item.name));
      renderDetected();
      renderChips();
      refreshAll();
    });
    state.dom.detectedList.appendChild(el);
  });
}

async function refreshAll() {
  await findRecipes();
  renderSaved();
  renderSuggestions();
  renderCompareTray();
  renderInsights();
  renderShoppingList();
  renderBlogRecipes();
}

async function findRecipes() {
  const filters = readFilters();
  setLoading(true, "Finding the best recipes for your ingredients...");

  try {
    const ingredients = allIngredients();
    if (state.apiKey && state.preferApi && !state.localOnly && ingredients.length) {
      state.liveRecipes = await fetchSpoonacularRecipes(ingredients, filters);
    } else {
      state.liveRecipes = [];
    }

    const baseLocal = state.datasetRecipes.length ? state.datasetRecipes : localRecipes;
    const base = state.liveRecipes.length ? state.liveRecipes : baseLocal;
    let ranked = base
      .map((recipe) => scoreRecipe(recipe, filters))
      .filter((entry) => entry.passes)
      .slice(0, 20);

    ranked = sortResults(ranked, filters.sortBy).slice(0, 12);

    renderRecipeCards(state.dom.recipesContainer, ranked, "No recipes match the current filters.");
    state.lastResults = ranked;
  } catch {
    const baseLocal = state.datasetRecipes.length ? state.datasetRecipes : localRecipes;
    const fallback = baseLocal
      .map((recipe) => scoreRecipe(recipe, filters))
      .filter((entry) => entry.passes)
      .slice(0, 20);
    const sorted = sortResults(fallback, filters.sortBy).slice(0, 12);
    renderRecipeCards(state.dom.recipesContainer, sorted, "No recipes match the current filters.");
    state.lastResults = sorted;
    alertMsg("Spoonacular failed. Showing local recipes.", "error");
  } finally {
    setLoading(false);
  }
}

function readFilters() {
  return {
    dietary: Array.from(document.querySelectorAll('input[name="preference"]:checked')).map((x) => x.value),
    allergens: Array.from(document.querySelectorAll('input[name="allergen"]:checked')).map((x) => x.value),
    maxTime: document.getElementById("cooking-time").value,
    difficulty: document.getElementById("difficulty").value,
    cuisine: document.getElementById("cuisine").value,
    servings: Number(document.getElementById("servings").value),
    sortBy: state.dom.sortBy.value
  };
}

function scoreRecipe(recipe, filters) {
  const input = new Set(allIngredients());
  const required = recipe.ingredients.map((i) => i.canonical);
  const matched = required.filter((i) => ingredientMatches(i, input));
  const missing = required.filter((i) => !input.has(i));
  const ratio = required.length ? matched.length / required.length : 0;

  const dietaryPass = filters.dietary.every((tag) => recipe.dietaryTags.includes(tag));
  const allergenPass = !filters.allergens.some((allergen) => recipe.allergens.includes(allergen));
  const timePass = filters.maxTime === "any" || recipe.cookingTime <= Number(filters.maxTime);
  const difficultyPass = filters.difficulty === "any" || recipe.difficulty === filters.difficulty;
  const cuisinePass = filters.cuisine === "any" || recipe.cuisine === filters.cuisine;

  let score = Math.round(ratio * 70);
  score += dietaryPass ? 15 : -30;
  score += timePass ? 8 : -8;
  score += cuisinePass ? 5 : 0;
  score += (state.ratings[recipe.id] || 0) * 2;

  return {
    recipe,
    matched,
    missing,
    ratio,
    score,
    passes: dietaryPass && allergenPass && timePass && difficultyPass && cuisinePass,
    servingMultiplier: filters.servings / recipe.servings,
    requestedServings: filters.servings
  };
}

function renderRecipeCards(container, entries, emptyText) {
  container.innerHTML = "";
  if (!entries.length) {
    container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
    return;
  }

  entries.forEach((entry) => {
    const r = entry.recipe;
    const saved = state.savedIds.includes(r.id);
    const rating = state.ratings[r.id] || 0;

    const card = document.createElement("article");
    card.className = "recipe-card";
    card.innerHTML = `
      <div class="recipe-image" style="background-image:url('${r.image}')"></div>
      <div class="recipe-content">
        <h3 class="recipe-title">${r.title}</h3>
        <div class="recipe-meta">
          <span><i class="fas fa-globe"></i> Cuisine: ${cap(r.cuisine)}</span>
          <span><i class="fas fa-clock"></i> ${r.cookingTime} min</span>
        </div>
        <div class="match-bar"><span style="width:${Math.round(entry.ratio * 100)}%"></span></div>
        <p class="recipe-ingredients">Allergens: ${r.allergens.length ? r.allergens.join(", ") : "None"}</p>
        <p class="match-line">Match: ${Math.round(entry.ratio * 100)}% | Score: ${entry.score}</p>
        <p class="recipe-ingredients">Uses: ${entry.matched.slice(0, 4).join(", ") || "No direct ingredient match"}</p>
        <div class="recipe-actions">
          <button class="btn btn-small view-btn">View Details</button>
          <button class="btn btn-small ghost compare-btn" type="button">Compare</button>
          <button class="icon-btn save-btn ${saved ? "active" : ""}" type="button"><i class="fas fa-bookmark"></i></button>
        </div>
        <div class="rating-row">${starMarkup(r.id, rating)}</div>
      </div>
    `;

    card.querySelector(".view-btn").addEventListener("click", () => openModal(entry));
    card.querySelector(".compare-btn").addEventListener("click", () => toggleCompare(r.id));
    card.querySelector(".save-btn").addEventListener("click", () => {
      toggleSave(r.id);
      refreshAll();
    });
    card.querySelectorAll(".star").forEach((star) => {
      star.addEventListener("click", () => {
        state.ratings[r.id] = Number(star.dataset.rating);
        saveJson("recipeRatings", state.ratings);
        refreshAll();
      });
    });

    container.appendChild(card);
  });
}

function starMarkup(id, rating) {
  return `<div class="stars">${[1,2,3,4,5].map((v) => `<button class="star ${v <= rating ? "active" : ""}" data-rating="${v}" type="button"><i class="fas fa-star"></i></button>`).join("")}</div>`;
}

async function openModal(entry) {
  const { recipe, missing, servingMultiplier, requestedServings } = entry;
  state.dom.modalTitle.textContent = recipe.title;

  let subs = suggestSubstitutions(missing);
  if (state.apiKey && recipe.source === "spoonacular" && missing.length) {
    const apiSubs = await fetchSubstitutions(missing.slice(0, 3));
    subs = [...apiSubs, ...subs];
  }

  const ingredientsHtml = recipe.ingredients
    .map((i) => `<li>${fmt(i.quantity * servingMultiplier)} ${i.unit || ""} ${i.name}</li>`)
    .join("");

  const stepsHtml = recipe.steps
    .map((step, idx) => `<div class="step"><div class="step-number">${idx + 1}</div><p>${step}</p></div>`)
    .join("");

  const missingHtml = missing.length
    ? `<p><strong>Missing ingredients:</strong> ${missing.join(", ")}</p>`
    : "<p><strong>You have everything needed.</strong></p>";
  const allergenHtml = recipe.allergens.length ? recipe.allergens.join(", ") : "None";

  const subsHtml = subs.length
    ? subs.map((s) => `<div class="substitution-suggestion"><strong>${s.ingredient}:</strong> ${s.options.join(", ")}</div>`).join("")
    : "<p class='small-note'>No substitutions needed.</p>";

  state.dom.modalBody.innerHTML = `
    <div class="recipe-detail">
      <div>
        <p><strong>Cuisine Type:</strong> ${cap(recipe.cuisine)}</p>
        <p><strong>Allergens:</strong> ${allergenHtml}</p>
        <h3>Ingredients (${requestedServings} servings)</h3>
        <ul>${ingredientsHtml}</ul>
        ${missingHtml}
        <h3>Substitution Suggestions</h3>
        ${subsHtml}
      </div>
      <div>
        <h3>Instructions</h3>
        ${stepsHtml}
      </div>
    </div>
    <div class="nutrition-info">
      <div class="nutrition-item"><div class="nutrition-value">${Math.round(recipe.nutrition.calories * servingMultiplier)}</div><div class="nutrition-label">Calories</div></div>
      <div class="nutrition-item"><div class="nutrition-value">${Math.round(recipe.nutrition.protein * servingMultiplier)}g</div><div class="nutrition-label">Protein</div></div>
      <div class="nutrition-item"><div class="nutrition-value">${Math.round(recipe.nutrition.carbs * servingMultiplier)}g</div><div class="nutrition-label">Carbs</div></div>
      <div class="nutrition-item"><div class="nutrition-value">${Math.round(recipe.nutrition.fat * servingMultiplier)}g</div><div class="nutrition-label">Fat</div></div>
    </div>
  `;

  state.dom.modal.style.display = "block";
}

function renderSaved() {
  const baseLocal = state.datasetRecipes.length ? state.datasetRecipes : localRecipes;
  const src = state.liveRecipes.length ? state.liveRecipes : baseLocal;
  const rows = src.filter((r) => state.savedIds.includes(r.id)).map((r) => ({
    recipe: r,
    matched: r.ingredients.map((i) => i.canonical).slice(0, 3),
    missing: [],
    ratio: 1,
    score: 100,
    servingMultiplier: 1,
    requestedServings: r.servings,
    passes: true
  }));
  renderRecipeCards(state.dom.savedContainer, rows, "No saved recipes yet.");
}

function renderSuggestions() {
  const baseLocal = state.datasetRecipes.length ? state.datasetRecipes : localRecipes;
  const src = state.liveRecipes.length ? state.liveRecipes : baseLocal;
  const topRated = Object.entries(state.ratings).filter(([, v]) => v >= 4).map(([id]) => Number(id));
  const seeds = src.filter((r) => topRated.includes(r.id));
  const cuisines = new Set(seeds.map((r) => r.cuisine));
  const tags = new Set(seeds.flatMap((r) => r.dietaryTags));

  const rows = src
    .filter((r) => !state.savedIds.includes(r.id))
    .map((r) => {
      let score = state.ratings[r.id] || 0;
      if (cuisines.has(r.cuisine)) score += 4;
      score += r.dietaryTags.filter((t) => tags.has(t)).length;
      return {
        recipe: r,
        matched: r.ingredients.map((i) => i.canonical).slice(0, 2),
        missing: [],
        ratio: 0,
        score,
        servingMultiplier: 1,
        requestedServings: r.servings,
        passes: true
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  renderRecipeCards(state.dom.suggestionsContainer, rows, "Rate recipes to unlock personalized suggestions.");
}

function renderCompareTray() {
  const dom = state.dom;
  const baseLocal = state.datasetRecipes.length ? state.datasetRecipes : localRecipes;
  const source = state.liveRecipes.length ? state.liveRecipes : baseLocal;
  const selected = source.filter((r) => state.compareIds.includes(r.id)).slice(0, 2);
  dom.compareCount.textContent = `${selected.length} selected`;
  dom.compareItems.innerHTML = "";
  selected.forEach((r) => {
    const pill = document.createElement("span");
    pill.className = "compare-pill";
    pill.textContent = `${r.title} • ${r.cookingTime}m • ${r.nutrition.calories} cal`;
    dom.compareItems.appendChild(pill);
  });
}

function toggleCompare(id) {
  if (state.compareIds.includes(id)) {
    state.compareIds = state.compareIds.filter((x) => x !== id);
  } else if (state.compareIds.length < 2) {
    state.compareIds.push(id);
  } else {
    state.compareIds = [state.compareIds[1], id];
  }
  saveJson("compareIds", state.compareIds);
  renderCompareTray();
}

function renderInsights() {
  const dom = state.dom;
  const filters = readFilters();
  const active = [
    ...filters.dietary,
    ...filters.allergens.map((a) => `no ${a}`),
    filters.maxTime !== "any" ? `≤${filters.maxTime}m` : "",
    filters.difficulty !== "any" ? filters.difficulty : "",
    filters.cuisine !== "any" ? filters.cuisine : ""
  ].filter(Boolean);
  dom.insightIngredients.textContent = String(state.userIngredients.length);
  dom.insightDetected.textContent = String(state.detectedIngredients.length);
  dom.insightLastSearch.textContent = new Date().toLocaleTimeString();
  dom.insightFilters.textContent = active.length ? active.join(", ") : "None";
}

function renderShoppingList() {
  const list = new Set();
  state.lastResults.forEach((entry) => {
    entry.missing.slice(0, 4).forEach((item) => list.add(item));
  });
  state.dom.shoppingList.value = list.size ? Array.from(list).join("\n") : "No missing ingredients found.";
}

function copyShoppingList() {
  const text = state.dom.shoppingList.value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(
    () => alertMsg("Shopping list copied.", "success"),
    () => alertMsg("Copy failed.", "error")
  );
}

function sortResults(results, sortBy) {
  if (sortBy === "time") {
    return results.slice().sort((a, b) => a.recipe.cookingTime - b.recipe.cookingTime);
  }
  if (sortBy === "calories") {
    return results.slice().sort((a, b) => a.recipe.nutrition.calories - b.recipe.nutrition.calories);
  }
  return results.slice().sort((a, b) => b.score - a.score);
}

function toggleSave(id) {
  if (state.savedIds.includes(id)) state.savedIds = state.savedIds.filter((x) => x !== id);
  else state.savedIds.push(id);
  saveJson("savedRecipeIds", state.savedIds);
}

function renderBlogRecipes() {
  const container = state.dom.blogRecipesContainer;
  if (!container) return;
  const blogRecipes = loadBlogRecipes();
  container.innerHTML = "";
  if (!blogRecipes.length) {
    container.innerHTML = `<p class="empty-state">No external recipes configured.</p>`;
    return;
  }
  const ingredients = new Set(state.userIngredients);
  blogRecipes.forEach((item) => {
    const matches = ingredientsMatchTitle(ingredients, item.title);
    const card = document.createElement("article");
    card.className = "blog-card";
    card.innerHTML = `
      <h4>${item.title}</h4>
      <p class="small-note">${matches ? "Matches your ingredients." : "External recipe link."}</p>
      <a href="${item.url}" target="_blank" rel="noopener noreferrer">Open recipe</a>
    `;
    container.appendChild(card);
  });
}

function loadBlogRecipes() {
  if (window.APP_CONFIG && Array.isArray(window.APP_CONFIG.BLOG_RECIPES)) {
    return window.APP_CONFIG.BLOG_RECIPES;
  }
  return [];
}

function ingredientsMatchTitle(ingredients, title) {
  const tokens = normalize(title).split(" ");
  return Array.from(ingredients).some((ing) => tokens.includes(ing));
}

function suggestSubstitutions(missing) {
  return missing.map((name) => ({ ingredient: name, options: substitutions[name] || [] })).filter((x) => x.options.length);
}

function allIngredients() {
  return [...state.userIngredients, ...state.detectedIngredients.map((x) => normalize(x.name))];
}

function ingredientMatches(required, inputSet) {
  if (inputSet.has(required)) return true;
  for (const item of inputSet) {
    if (required.includes(item) || item.includes(required)) {
      return true;
    }
  }
  return false;
}

async function fetchSpoonacularRecipes(ingredients, filters) {
  const params = new URLSearchParams({
    ingredients: ingredients.join(","),
    number: "8",
    ranking: "2",
    ignorePantry: "true",
    apiKey: state.apiKey
  });

  const basic = await fetchJson(`${SPOONACULAR_BASE_URL}/recipes/findByIngredients?${params.toString()}`);
  if (!Array.isArray(basic) || !basic.length) return [];

  const info = await Promise.all(
    basic.slice(0, 8).map((row) =>
      fetchJson(`${SPOONACULAR_BASE_URL}/recipes/${row.id}/information?includeNutrition=true&apiKey=${encodeURIComponent(state.apiKey)}`)
    )
  );

  return info
    .map(mapSpoonacular)
    .filter((r) => {
      const t = filters.maxTime === "any" || r.cookingTime <= Number(filters.maxTime);
      const d = filters.difficulty === "any" || r.difficulty === filters.difficulty;
      const c = filters.cuisine === "any" || r.cuisine === filters.cuisine;
      const q = filters.dietary.every((tag) => r.dietaryTags.includes(tag));
      const a = !filters.allergens.some((allergen) => r.allergens.includes(allergen));
      return t && d && c && q && a;
    });
}

async function fetchSubstitutions(ingredients) {
  const rows = await Promise.all(
    ingredients.map(async (name) => {
      try {
        const url = `${SPOONACULAR_BASE_URL}/food/ingredients/substitutes?ingredientName=${encodeURIComponent(name)}&apiKey=${encodeURIComponent(state.apiKey)}`;
        const data = await fetchJson(url);
        if (data && data.status === "success" && Array.isArray(data.substitutes) && data.substitutes.length) {
          return { ingredient: name, options: data.substitutes.slice(0, 3) };
        }
      } catch {
        return null;
      }
      return null;
    })
  );
  return rows.filter(Boolean);
}

function mapSpoonacular(item) {
  const nutrients = Array.isArray(item.nutrition && item.nutrition.nutrients) ? item.nutrition.nutrients : [];
  const byName = (n) => {
    const f = nutrients.find((x) => x.name === n);
    return f ? Math.round(Number(f.amount) || 0) : 0;
  };

  return {
    id: Number(item.id),
    title: item.title || "Untitled Recipe",
    cuisine: normalizeCuisine(item.cuisines && item.cuisines[0]),
    difficulty: (Number(item.readyInMinutes) || 30) <= 20 ? "easy" : (Number(item.readyInMinutes) || 30) <= 40 ? "medium" : "hard",
    cookingTime: Number(item.readyInMinutes) || 30,
    servings: Number(item.servings) || 2,
    ingredients: (item.extendedIngredients || []).map((x) => makeIng(x.name || "ingredient", Number(x.amount) || 1, x.unit || "")),
    steps: extractSteps(item),
    nutrition: { calories: byName("Calories"), protein: byName("Protein"), carbs: byName("Carbohydrates"), fat: byName("Fat") },
    dietaryTags: extractDietTags(item),
    allergens: extractAllergens(item),
    image: item.image || stockImages[item.id % stockImages.length],
    source: "spoonacular"
  };
}

function extractSteps(item) {
  if (Array.isArray(item.analyzedInstructions) && item.analyzedInstructions[0] && Array.isArray(item.analyzedInstructions[0].steps) && item.analyzedInstructions[0].steps.length) {
    return item.analyzedInstructions[0].steps.map((s) => s.step).filter(Boolean);
  }
  return item.instructions ? [stripHtml(item.instructions)] : ["Follow ingredient order and cook until done."];
}

function extractDietTags(item) {
  const tags = [];
  if (item.vegetarian) tags.push("vegetarian");
  if (item.vegan) tags.push("vegan");
  if (item.glutenFree) tags.push("gluten-free");
  if (item.dairyFree) tags.push("dairy-free");
  if (item.veryHealthy) tags.push("low-carb");
  return tags;
}

function normalizeCuisine(c) {
  const value = normalize(c || "american");
  if (["italian", "mexican", "asian", "indian", "american", "mediterranean"].includes(value)) return value;
  if (["thai", "chinese", "japanese", "korean", "vietnamese"].includes(value)) return "asian";
  return "american";
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function setLoading(on, msg) {
  state.dom.loading.style.display = on ? "block" : "none";
  if (msg) {
    const p = state.dom.loading.querySelector("p");
    if (p) p.textContent = msg;
  }
}

function alertMsg(text, kind) {
  const el = document.createElement("div");
  el.className = `alert ${kind === "error" ? "alert-error" : "alert-success"}`;
  el.textContent = text;
  state.dom.alertContainer.innerHTML = "";
  state.dom.alertContainer.appendChild(el);
  setTimeout(() => {
    if (state.dom.alertContainer.contains(el)) state.dom.alertContainer.innerHTML = "";
  }, 2600);
}

function clearAll() {
  state.userIngredients = [];
  state.detectedIngredients = [];
  state.dom.imageUpload.value = "";
  state.dom.cameraUpload.value = "";
  state.dom.imagePreview.src = "";
  state.dom.imagePreview.style.display = "none";
  document.querySelectorAll('input[name="preference"]').forEach((c) => (c.checked = false));
  document.querySelectorAll('input[name="allergen"]').forEach((c) => (c.checked = false));
  document.getElementById("cooking-time").value = "any";
  document.getElementById("difficulty").value = "any";
  document.getElementById("cuisine").value = "any";
  document.getElementById("servings").value = "2";
  renderChips();
  renderDetected();
  refreshAll();
}

function makeIng(name, qty, unit = "") {
  return { name, canonical: normalize(name), quantity: qty, unit };
}

function makeRecipe(id, title, cuisine, difficulty, time, servings, ingredients, steps, nutrition, tags) {
  return {
    id,
    title,
    cuisine,
    difficulty,
    cookingTime: time,
    servings,
    ingredients,
    steps,
    nutrition,
    dietaryTags: tags,
    allergens: deriveAllergens(ingredients),
    image: stockImages[id % stockImages.length],
    source: "local"
  };
}

function buildLocalRecipes() {
  const rows = [
    makeRecipe(1, "Mediterranean Chickpea Bowl", "mediterranean", "easy", 20, 2, [makeIng("chickpeas",1,"can"),makeIng("cucumber",1),makeIng("tomato",2),makeIng("lemon",1)], ["Chop veggies.","Mix with chickpeas and lemon.","Season and serve."], {calories:420,protein:17,carbs:40,fat:21}, ["vegetarian","nut-free"]),
    makeRecipe(2, "Avocado Egg Toast", "american", "easy", 12, 1, [makeIng("bread",2,"slices"),makeIng("avocado",1),makeIng("egg",1)], ["Toast bread.","Mash avocado.","Top with egg."], {calories:390,protein:15,carbs:34,fat:22}, ["vegetarian","nut-free"]),
    makeRecipe(3, "Tofu Stir Fry", "asian", "easy", 25, 2, [makeIng("tofu",200,"g"),makeIng("broccoli",1,"cup"),makeIng("soy sauce",2,"tbsp")], ["Cook tofu.","Add veggies.","Stir soy sauce."], {calories:355,protein:21,carbs:18,fat:20}, ["vegan","dairy-free"]),
    makeRecipe(4, "Paneer Wrap", "indian", "medium", 35, 2, [makeIng("paneer",200,"g"),makeIng("yogurt",0.5,"cup"),makeIng("tortilla",4)], ["Marinate paneer.","Cook with onion.","Wrap and serve."], {calories:510,protein:24,carbs:39,fat:28}, ["vegetarian"]),
    makeRecipe(5, "Chicken Fajitas", "mexican", "easy", 30, 3, [makeIng("chicken",350,"g"),makeIng("bell pepper",2),makeIng("tortilla",6)], ["Slice chicken.","Cook with peppers.","Serve in tortillas."], {calories:460,protein:33,carbs:36,fat:18}, ["nut-free"]),
    makeRecipe(6, "Quinoa Salad", "mediterranean", "easy", 18, 2, [makeIng("quinoa",1,"cup"),makeIng("cucumber",1),makeIng("tomato",1)], ["Cook quinoa.","Chop vegetables.","Mix and season."], {calories:340,protein:11,carbs:46,fat:12}, ["gluten-free","vegan","dairy-free","nut-free"]),
    makeRecipe(7, "Zucchini Pesto Noodles", "italian", "easy", 20, 2, [makeIng("zucchini",3),makeIng("basil",1,"cup"),makeIng("garlic",1,"clove")], ["Spiralize zucchini.","Blend pesto.","Toss together."], {calories:310,protein:10,carbs:12,fat:25}, ["vegetarian","low-carb"]),
    makeRecipe(8, "Lentil Soup", "mediterranean", "easy", 40, 4, [makeIng("lentils",1.5,"cup"),makeIng("onion",1),makeIng("garlic",2,"cloves")], ["Saute onion.","Add lentils.","Simmer 30 min."], {calories:280,protein:14,carbs:42,fat:6}, ["vegan","dairy-free","nut-free"]),
    makeRecipe(9, "Shakshuka", "mediterranean", "medium", 30, 3, [makeIng("egg",6),makeIng("tomato",4),makeIng("bell pepper",1)], ["Cook tomato base.","Add eggs.","Cover until set."], {calories:290,protein:16,carbs:12,fat:18}, ["vegetarian","gluten-free","low-carb"]),
    makeRecipe(10, "Thai Peanut Noodles", "asian", "medium", 25, 2, [makeIng("rice noodles",200,"g"),makeIng("peanut butter",3,"tbsp"),makeIng("soy sauce",2,"tbsp")], ["Cook noodles.","Make sauce.","Mix and serve."], {calories:520,protein:16,carbs:63,fat:23}, ["vegetarian","dairy-free"]),
    makeRecipe(11, "Grilled Salmon", "american", "medium", 28, 2, [makeIng("salmon",2,"fillets"),makeIng("asparagus",1,"bunch")], ["Season fish.","Grill salmon.","Serve with asparagus."], {calories:480,protein:37,carbs:10,fat:32}, ["gluten-free","low-carb"]),
    makeRecipe(12, "Mushroom Risotto", "italian", "hard", 45, 3, [makeIng("arborio rice",1.5,"cup"),makeIng("mushroom",2,"cup"),makeIng("parmesan",0.5,"cup")], ["Cook mushrooms.","Add rice slowly with stock.","Finish with parmesan."], {calories:510,protein:14,carbs:64,fat:20}, ["vegetarian"]),
    makeRecipe(13, "Chana Masala", "indian", "easy", 30, 3, [makeIng("chickpeas",2,"can"),makeIng("tomato",2),makeIng("onion",1)], ["Saute onion.","Add tomato/spices.","Simmer chickpeas."], {calories:360,protein:15,carbs:50,fat:8}, ["vegan","dairy-free"]),
    makeRecipe(14, "Yogurt Parfait", "american", "easy", 10, 1, [makeIng("yogurt",1,"cup"),makeIng("berries",0.75,"cup"),makeIng("granola",0.5,"cup")], ["Layer ingredients.","Add honey.","Serve."], {calories:320,protein:18,carbs:42,fat:9}, ["vegetarian"]),
    makeRecipe(15, "Baked Falafel Pita", "mediterranean", "medium", 40, 4, [makeIng("chickpeas",2,"can"),makeIng("parsley",0.5,"cup"),makeIng("pita",4)], ["Blend mix.","Bake patties.","Serve in pita."], {calories:430,protein:16,carbs:58,fat:14}, ["vegan","dairy-free"]),
    makeRecipe(16, "Turkey Lettuce Wraps", "asian", "easy", 22, 2, [makeIng("turkey",300,"g"),makeIng("lettuce",1,"head"),makeIng("soy sauce",2,"tbsp")], ["Cook turkey.","Add sauce.","Serve in lettuce."], {calories:350,protein:31,carbs:14,fat:17}, ["dairy-free","low-carb"]),
    makeRecipe(17, "Veggie Burrito Bowl", "mexican", "easy", 25, 2, [makeIng("rice",1,"cup"),makeIng("black beans",1,"can"),makeIng("corn",1,"cup")], ["Cook rice.","Warm beans/corn.","Assemble bowl."], {calories:490,protein:14,carbs:78,fat:13}, ["vegan","gluten-free"]),
    makeRecipe(18, "Cauliflower Fried Rice", "asian", "easy", 20, 2, [makeIng("cauliflower",1,"head"),makeIng("egg",2),makeIng("peas",0.5,"cup")], ["Pulse cauliflower.","Cook egg and veg.","Stir-fry together."], {calories:260,protein:13,carbs:18,fat:14}, ["gluten-free","low-carb"]),
    makeRecipe(19, "Stuffed Bell Peppers", "american", "medium", 50, 4, [makeIng("bell pepper",4),makeIng("ground beef",400,"g"),makeIng("rice",1,"cup")], ["Prep peppers.","Cook filling.","Stuff and bake."], {calories:560,protein:29,carbs:42,fat:30}, ["nut-free"]),
    makeRecipe(20, "Palak Paneer", "indian", "medium", 35, 3, [makeIng("spinach",300,"g"),makeIng("paneer",220,"g"),makeIng("cream",0.25,"cup")], ["Blanch spinach.","Cook masala.","Add paneer and cream."], {calories:470,protein:22,carbs:17,fat:34}, ["vegetarian","gluten-free"])
  ];
  return rows;
}

function normalize(v) { return String(v || "").trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " "); }
function fmt(v) { return Number.isInteger(v) ? v : Math.round(v * 100) / 100; }
function cap(v) { return v ? v.charAt(0).toUpperCase() + v.slice(1) : ""; }
function stripHtml(v) { return String(v || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { return; }
}

function loadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function loadApiKey() {
  const saved = loadJson("spoonacularApiKey", "");
  if (saved) return saved;
  if (window.APP_CONFIG && typeof window.APP_CONFIG.SPOONACULAR_API_KEY === "string") {
    return window.APP_CONFIG.SPOONACULAR_API_KEY.trim();
  }
  return "";
}

async function loadDatasetRecipes() {
  try {
    const response = await fetch("recipes_data.csv");
    if (!response.ok) {
      return;
    }
    const text = await response.text();
    const rows = parseCsv(text);
    if (!rows.length) return;
    const recipes = rows.slice(0, 500).map((row, index) => {
      const title = row.title || "Recipe";
      const ner = safeJsonArray(row.NER);
      const ingredients = ner.length ? ner : safeJsonArray(row.ingredients);
      const directions = safeJsonArray(row.directions);
      const normalizedIngredients = ingredients.map((name) => makeIng(String(name), 1, ""));
      const steps = directions.length ? directions.map((d) => String(d)) : ["Follow recipe steps from source."];
      const nutrition = estimateNutrition(normalizedIngredients.length);
      return {
        id: 100000 + index,
        title,
        cuisine: "american",
        difficulty: "medium",
        cookingTime: 30,
        servings: 2,
        ingredients: normalizedIngredients,
        steps,
        nutrition,
        dietaryTags: [],
        allergens: deriveAllergens(normalizedIngredients),
        image: stockImages[index % stockImages.length],
        source: "dataset"
      };
    });
    state.datasetRecipes = recipes;
  } catch {
    state.datasetRecipes = [];
  }
}

function parseCsv(text) {
  const rows = [];
  let headers = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" && !inQuotes) {
      row.push(field);
      field = "";
      if (!headers.length) {
        headers = row;
      } else if (row.length) {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx] || "";
        });
        rows.push(obj);
      }
      row = [];
      continue;
    }
    field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    if (!headers.length) {
      headers = row;
    } else {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] || "";
      });
      rows.push(obj);
    }
  }
  return rows;
}

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function estimateNutrition(count) {
  const base = 250 + count * 20;
  return { calories: base, protein: Math.round(count * 3), carbs: Math.round(count * 8), fat: Math.round(count * 2) };
}

function deriveAllergens(ingredients) {
  const names = ingredients.map((i) => normalize(i.name));
  const has = (list) => list.some((term) => names.some((n) => n.includes(term)));
  const allergens = [];
  if (has(["milk", "cheese", "butter", "cream", "yogurt", "paneer", "parmesan", "mozzarella"])) allergens.push("dairy");
  if (has(["wheat", "bread", "pasta", "flour", "tortilla", "noodles", "pita", "arborio"])) allergens.push("gluten");
  if (has(["egg"])) allergens.push("egg");
  if (has(["soy", "tofu", "tempeh"])) allergens.push("soy");
  if (has(["nut", "peanut", "almond", "cashew", "walnut", "pine nut"])) allergens.push("nuts");
  if (has(["shrimp", "prawn", "crab", "lobster", "shellfish"])) allergens.push("shellfish");
  return allergens;
}

function extractAllergens(item) {
  const allergens = [];
  if (item.dairyFree === false) allergens.push("dairy");
  if (item.glutenFree === false) allergens.push("gluten");
  const ingredientNames = (item.extendedIngredients || []).map((x) => normalize(x.name || ""));
  const has = (list) => list.some((term) => ingredientNames.some((n) => n.includes(term)));
  if (has(["egg"])) allergens.push("egg");
  if (has(["soy", "tofu", "tempeh"])) allergens.push("soy");
  if (has(["nut", "peanut", "almond", "cashew", "walnut", "pine nut"])) allergens.push("nuts");
  if (has(["shrimp", "prawn", "crab", "lobster", "shellfish"])) allergens.push("shellfish");
  return Array.from(new Set(allergens));
}

function extractOpenVisionIngredients(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.ingredients)) {
    return data.ingredients.map((x) => normalize(String(x))).filter(Boolean);
  }
  if (Array.isArray(data.labels)) {
    return data.labels.map((x) => normalize(String(x))).filter(Boolean);
  }
  if (Array.isArray(data.objects)) {
    return data.objects.map((x) => normalize(String(x))).filter(Boolean);
  }
  return [];
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
