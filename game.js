// ============================================================
// UNDERCOVER — Game logic
// ============================================================

const state = {
  playerCount: 4,
  themeKey: null,
  playerNames: [],
  order: [],          // ordre de jeu (indices dans playerNames)
  revealIndex: 0,     // index courant dans "order" pendant la révélation
  assignments: [],    // { name, word, isUndercover }
  votes: {},          // playerIndex(voter, dans order) -> playerIndex(cible, dans order)
  voteTurnIndex: 0,
  currentWordPair: null,
  themeLabel: ""
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
// GAME SETUP — assign roles & words
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

  // Random reveal order (order in which players look at cards) — independent shuffle of player indices
  const revealOrderIdx = shuffle([...Array(n).keys()]);

  // Assignments indexed by player index (0..n-1) matching state.playerNames
  state.assignments = state.playerNames.map((name, i)=>({
    name,
    isUndercover: shuffledRoles[i] === 'undercover',
    word: shuffledRoles[i] === 'undercover' ? undercoverWord : civilWord
  }));

  // Reveal order = array of player indices in the order they'll view their card
  state.order = revealOrderIdx;
  state.revealIndex = 0;

  buildRevealScreen();
  showScreen('screen-reveal');
}

// ============================================================
// SCREEN: REVEAL
// ============================================================
const cardEl = document.getElementById('reveal-card');
const nextBtn = document.getElementById('btn-next-player');

function buildRevealScreen(){
  cardEl.classList.remove('flipped');
  nextBtn.disabled = true;
  nextBtn.textContent = "J'ai vu ma carte →";

  const playerIdx = state.order[state.revealIndex];
  const assignment = state.assignments[playerIdx];

  document.getElementById('reveal-player-name').textContent = assignment.name;
  document.getElementById('reveal-theme-tag').textContent = state.themeLabel;
  document.getElementById('reveal-word').textContent = assignment.word;

  const isLast = state.revealIndex === state.order.length - 1;
  document.getElementById('reveal-instructions').textContent =
    "Regardez discrètement votre mot, puis retournez la carte avant de la transmettre.";
}

let cardClickLocked = false;
cardEl.addEventListener('click', ()=>{
  if(cardClickLocked) return;
  if(!cardEl.classList.contains('flipped')){
    cardEl.classList.add('flipped');
    nextBtn.disabled = false;
  } else {
    // allow flipping back to hide before passing phone
    cardEl.classList.remove('flipped');
  }
});

nextBtn.addEventListener('click', ()=>{
  cardClickLocked = true;
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
