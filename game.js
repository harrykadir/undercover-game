// ============================================================
// UNDERCOVER — Game logic
// ============================================================

const state = {
  playerCount: 4,
  themeKey: null,
  playerNames: [],
  order: [],          // ordre des joueurs qui vont choisir une carte, dans cet ordre (indices dans playerNames)
  revealIndex: 0,     // index courant dans "order" pendant la révélation
  cardPool: [],        // [{ word, isUndercover, takenByPlayerIdx: null|int }] — une entrée par position de carte
  assignments: [],    // rempli au fur et à mesure : { name, word, isUndercover } indexé par playerIdx
  votes: {},          // playerIndex(voter, dans order) -> playerIndex(cible, dans order)
  voteTurnIndex: 0,
  currentWordPair: null,
  themeLabel: "",
  selectedCardPos: null // position de carte actuellement sélectionnée par le joueur en cours, avant confirmation
};

// ---------- Helpers ----------
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function pickRandom(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

function undercoverCountFor(n){
  // 3 joueurs -> 1 undercover / 4 joueurs -> 1 undercover (toujours 1 seul, quel que soit 3 ou 4)
  return 1;
}

// Convertit un mot en nom de fichier attendu (slug)
// Ex: "Yoichi Isagi" -> "yoichi-isagi.png" / "Tetsuya (chien)" -> "tetsuya-chien.png"
function slugify(word){
  return word
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================
// SCREEN: HOME — player count stepper
// ============================================================
const countDisplay = document.getElementById('player-count-display');
const compHint = document.getElementById('composition-hint');

function updateCompositionHint(){
  const n = state.playerCount;
  const uc = undercoverCountFor(n);
  const civ = n - uc;
  compHint.textContent = `${civ} civils · ${uc} undercover`;
}

document.getElementById('btn-minus').addEventListener('click', ()=>{
  if(state.playerCount > 3){
    state.playerCount--;
    countDisplay.textContent = state.playerCount;
    updateCompositionHint();
  }
});
document.getElementById('btn-plus').addEventListener('click', ()=>{
  if(state.playerCount < 4){
    state.playerCount++;
    countDisplay.textContent = state.playerCount;
    updateCompositionHint();
  }
});
updateCompositionHint();

document.getElementById('btn-goto-theme').addEventListener('click', ()=>{
  buildThemeGrid();
  showScreen('screen-theme');
});

// ============================================================
// SCREEN: THEME
// ============================================================
function buildThemeGrid(){
  const grid = document.getElementById('theme-grid');
  grid.innerHTML = '';
  Object.entries(WORD_BANK).forEach(([key, theme])=>{
    const card = document.createElement('div');
    card.className = 'theme-card' + (state.themeKey === key ? ' selected' : '');
    card.innerHTML = `<div class="icon">${theme.icon}</div><div class="name">${theme.label}</div>`;
    card.addEventListener('click', ()=>{
      state.themeKey = key;
      document.querySelectorAll('.theme-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
    });
    grid.appendChild(card);
  });
}

document.getElementById('btn-back-home').addEventListener('click', ()=> showScreen('screen-home'));

document.getElementById('btn-goto-names').addEventListener('click', ()=>{
  if(!state.themeKey){
    alert('Choisis un thème pour continuer.');
    return;
  }
  buildNamesForm();
  showScreen('screen-names');
});

// ============================================================
// SCREEN: NAMES
// ============================================================
function buildNamesForm(){
  const form = document.getElementById('names-form');
  form.innerHTML = '';
  for(let i=0; i<state.playerCount; i++){
    const row = document.createElement('div');
    row.className = 'name-input-row';
    const existing = state.playerNames[i] || '';
    row.innerHTML = `
      <div class="num">${i+1}</div>
      <input type="text" placeholder="Joueur ${i+1}" maxlength="16" value="${existing}" data-idx="${i}">
    `;
    form.appendChild(row);
  }
}

document.getElementById('btn-back-theme').addEventListener('click', ()=>{
  buildThemeGrid();
  showScreen('screen-theme');
});

document.getElementById('btn-start-game').addEventListener('click', ()=>{
  const inputs = document.querySelectorAll('#names-form input');
  state.playerNames = Array.from(inputs).map((inp, i)=> inp.value.trim() || `Joueur ${i+1}`);
  startGame();
});

// ============================================================
// GAME SETUP — build the shuffled card pool
// ============================================================
function startGame(){
  const theme = WORD_BANK[state.themeKey];
  state.themeLabel = theme.label;
  const pair = pickRandom(theme.pairs);
  // Randomize which word is "civil" vs "undercover" so it's not always the same slot
  const flip = Math.random() < 0.5;
  const civilWord = flip ? pair[0] : pair[1];
  const undercoverWord = flip ? pair[1] : pair[0];
  state.currentWordPair = { civilWord, undercoverWord };

  const n = state.playerCount;
  const ucCount = undercoverCountFor(n);

  // Build role array: ucCount undercover, rest civils
  const roles = [];
  for(let i=0;i<ucCount;i++) roles.push('undercover');
  for(let i=0;i<n-ucCount;i++) roles.push('civil');
  const shuffledRoles = shuffle(roles);

  // Le pool de cartes : une entrée par position, mélangée aléatoirement.
  // Les joueurs ne savent pas quelle position contient quel mot.
  state.cardPool = shuffledRoles.map(role => ({
    word: role === 'undercover' ? undercoverWord : civilWord,
    isUndercover: role === 'undercover',
    takenByPlayerIdx: null
  }));

  // Ordre dans lequel les joueurs sont appelés à choisir une carte (aléatoire)
  state.order = shuffle([...Array(n).keys()]);
  state.revealIndex = 0;
  state.assignments = new Array(n).fill(null);
  state.selectedCardPos = null;

  buildRevealScreen();
  showScreen('screen-reveal');
}

// ============================================================
// SCREEN: REVEAL — le joueur choisit une carte parmi celles restantes
// ============================================================
const cardGridEl = document.getElementById('card-grid');
const nextBtn = document.getElementById('btn-next-player');

function buildRevealScreen(){
  nextBtn.disabled = true;
  nextBtn.textContent = "J'ai vu ma carte →";
  state.selectedCardPos = null;

  const playerIdx = state.order[state.revealIndex];
  const playerName = state.playerNames[playerIdx];

  document.getElementById('reveal-player-name').textContent = playerName;
  document.getElementById('reveal-instructions').textContent =
    "Choisissez une carte parmi celles restantes, regardez discrètement votre mot, puis retournez-la avant de continuer.";

  renderCardGrid();
}

function renderCardGrid(){
  cardGridEl.innerHTML = '';
  state.cardPool.forEach((card, pos)=>{
    const wrap = document.createElement('div');
    wrap.className = 'card-3d';
    if(card.takenByPlayerIdx !== null) wrap.classList.add('taken');
    const isSelected = state.selectedCardPos === pos;
    wrap.dataset.pos = pos;

    // Le mot n'est inséré dans le DOM que pour la carte sélectionnée
    // (évite de pouvoir inspecter le code source pour tricher sur les autres cartes).
    const themeTag = isSelected ? state.themeLabel : '';
    const word = isSelected ? card.word : '';

    wrap.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back">
          <div class="q">?</div>
          <div class="hint">${card.takenByPlayerIdx !== null ? 'Prise' : 'Choisir'}</div>
        </div>
        <div class="card-face card-front">
          <div class="theme-tag">${themeTag}</div>
          <div class="word">${word}</div>
        </div>
      </div>
    `;

    if(card.takenByPlayerIdx === null){
      wrap.addEventListener('click', ()=> onCardPositionClick(pos, wrap));
    }
    cardGridEl.appendChild(wrap);

    if(isSelected){
      const cardFrontEl = wrap.querySelector('.card-front');
      applyCardImage(cardFrontEl, card.word);

      // Déclenche le flip juste après l'insertion dans le DOM (taille toujours fixe,
      // donc l'animation de retournement est fluide immédiatement).
      requestAnimationFrame(()=>{
        wrap.classList.add('flipped');
      });
    }
  });
}

function applyCardImage(cardFrontEl, word){
  const slug = slugify(word);
  const extensions = ['jpg', 'png']; // ordre d'essai : jpg d'abord, puis png en repli

  cardFrontEl.classList.remove('has-image');
  cardFrontEl.style.backgroundImage = '';

  function tryExtension(index){
    if(index >= extensions.length) return; // aucune image trouvée -> reste en texte simple
    const imgPath = `images/${slug}.${extensions[index]}`;
    const testImg = new Image();
    testImg.onload = () => {
      cardFrontEl.style.backgroundImage = `url('${imgPath}')`;
      cardFrontEl.classList.add('has-image');
    };
    testImg.onerror = () => tryExtension(index + 1);
    testImg.src = imgPath;
  }

  tryExtension(0);
}

let cardClickLocked = false;
function onCardPositionClick(pos, wrapEl){
  if(cardClickLocked) return;
  if(state.selectedCardPos !== null) return; // une carte déjà choisie ce tour-ci, on attend la confirmation
  state.selectedCardPos = pos;
  renderCardGrid();
  nextBtn.disabled = false;
}

nextBtn.addEventListener('click', ()=>{
  if(state.selectedCardPos === null) return;
  cardClickLocked = true;

  const playerIdx = state.order[state.revealIndex];
  const card = state.cardPool[state.selectedCardPos];
  card.takenByPlayerIdx = playerIdx;
  state.assignments[playerIdx] = {
    name: state.playerNames[playerIdx],
    word: card.word,
    isUndercover: card.isUndercover
  };

  state.revealIndex++;
  if(state.revealIndex < state.order.length){
    buildRevealScreen();
    setTimeout(()=>{ cardClickLocked = false; }, 200);
  } else {
    buildOrderScreen();
    showScreen('screen-order');
    cardClickLocked = false;
  }
});

// ============================================================
// SCREEN: ORDER (discussion order — reuse a fresh random shuffle for speaking order)
// ============================================================
function buildOrderScreen(){
  // speaking order can be a new random shuffle, independent from reveal order
  state.speakingOrder = shuffle([...Array(state.playerCount).keys()]);
  const list = document.getElementById('order-list');
  list.innerHTML = '';
  state.speakingOrder.forEach((playerIdx, pos)=>{
    const item = document.createElement('div');
    item.className = 'order-item';
    item.innerHTML = `<div class="idx">${pos+1}</div><div class="pname">${state.assignments[playerIdx].name}</div>`;
    list.appendChild(item);
  });
}

document.getElementById('btn-goto-vote').addEventListener('click', ()=>{
  state.votes = {};
  state.voteTurnIndex = 0;
  buildVoteScreen();
  showScreen('screen-vote');
});

// ============================================================
// SCREEN: VOTE — each player votes in turn (pass the phone)
// ============================================================
let currentVoteSelection = null;

function buildVoteScreen(){
  currentVoteSelection = null;
  const voterPlayerIdx = state.order[state.voteTurnIndex] !== undefined
    ? state.order[state.voteTurnIndex]
    : null;

  const voterName = state.assignments[voterPlayerIdx].name;
  document.getElementById('vote-turn-label').textContent = `Vote de ${voterName}`;

  const grid = document.getElementById('vote-grid');
  grid.innerHTML = '';
  state.assignments.forEach((a, idx)=>{
    if(idx === voterPlayerIdx) return; // can't vote for yourself
    const card = document.createElement('div');
    card.className = 'vote-card';
    card.innerHTML = `<div class="pname">${a.name}</div><div class="radio"></div>`;
    card.addEventListener('click', ()=>{
      document.querySelectorAll('.vote-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      currentVoteSelection = idx;
      document.getElementById('btn-confirm-vote').disabled = false;
    });
    grid.appendChild(card);
  });

  document.getElementById('btn-confirm-vote').disabled = true;
  document.getElementById('btn-confirm-vote').textContent =
    state.voteTurnIndex === state.playerCount - 1 ? "Valider et voir le résultat →" : "Valider le vote →";
}

document.getElementById('btn-confirm-vote').addEventListener('click', ()=>{
  const voterPlayerIdx = state.order[state.voteTurnIndex];
  state.votes[voterPlayerIdx] = currentVoteSelection;

  state.voteTurnIndex++;
  if(state.voteTurnIndex < state.playerCount){
    buildVoteScreen();
  } else {
    computeResult();
    showScreen('screen-result');
  }
});

// ============================================================
// SCREEN: RESULT
// ============================================================
function computeResult(){
  // Tally votes
  const tally = {};
  Object.values(state.votes).forEach(targetIdx=>{
    tally[targetIdx] = (tally[targetIdx]||0) + 1;
  });

  // Find max votes
  let maxVotes = -1;
  let topTargets = [];
  Object.entries(tally).forEach(([idx, count])=>{
    idx = parseInt(idx);
    if(count > maxVotes){
      maxVotes = count;
      topTargets = [idx];
    } else if(count === maxVotes){
      topTargets.push(idx);
    }
  });

  const undercoverIdx = state.assignments.findIndex(a=>a.isUndercover);
  const isUniqueMajority = topTargets.length === 1;
  const civilsWin = isUniqueMajority && topTargets[0] === undercoverIdx;

  const badge = document.getElementById('result-badge');
  const title = document.getElementById('result-title');
  const sub = document.getElementById('result-sub');

  if(civilsWin){
    badge.className = 'result-badge badge-win';
    badge.textContent = '✓ Civils victorieux';
    title.textContent = `${state.assignments[undercoverIdx].name} était l'undercover !`;
    sub.textContent = 'Démasqué à la majorité des votes.';
  } else {
    badge.className = 'result-badge badge-lose';
    badge.textContent = '✕ Undercover victorieux';
    if(!isUniqueMajority){
      title.textContent = 'Égalité des votes — personne n\'est démasqué';
    } else {
      title.textContent = `${state.assignments[topTargets[0]].name} n'était pas l'undercover`;
    }
    sub.textContent = `En réalité, ${state.assignments[undercoverIdx].name} était l'undercover.`;
  }

  // Role reveal list
  const roleList = document.getElementById('reveal-role-list');
  roleList.innerHTML = '';
  state.assignments.forEach(a=>{
    const item = document.createElement('div');
    item.className = 'role-item' + (a.isUndercover ? ' is-undercover' : '');
    item.innerHTML = `
      <div class="pname">${a.name}</div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:13px; color:var(--text-dim);">${a.word}</span>
        <span class="role-tag ${a.isUndercover ? 'tag-undercover' : 'tag-civil'}">${a.isUndercover ? 'Undercover' : 'Civil'}</span>
      </div>
    `;
    roleList.appendChild(item);
  });
}

document.getElementById('btn-same-players').addEventListener('click', ()=>{
  // Keep names & theme, reshuffle roles/words
  buildThemeGrid();
  startGame();
});

document.getElementById('btn-new-game').addEventListener('click', ()=>{
  state.themeKey = null;
  state.playerNames = [];
  showScreen('screen-home');
});
