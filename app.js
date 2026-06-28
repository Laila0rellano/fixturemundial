// ---------- DATOS: Mundial 2026 - 12 grupos confirmados (sorteo dic. 2025) ----------
const GROUPS = {
  A: [["México","MEX"],["Sudáfrica","RSA"],["Corea del Sur","KOR"],["República Checa","CZE"]],
  B: [["Canadá","CAN"],["Bosnia y Herzegovina","BIH"],["Qatar","QAT"],["Suiza","SUI"]],
  C: [["Brasil","BRA"],["Marruecos","MAR"],["Haití","HAI"],["Escocia","SCO"]],
  D: [["Estados Unidos","USA"],["Paraguay","PAR"],["Australia","AUS"],["Turquía","TUR"]],
  E: [["Alemania","GER"],["Curazao","CUW"],["Costa de Marfil","CIV"],["Ecuador","ECU"]],
  F: [["Países Bajos","NED"],["Japón","JPN"],["Suecia","SWE"],["Túnez","TUN"]],
  G: [["Bélgica","BEL"],["Egipto","EGY"],["Irán","IRN"],["Nueva Zelanda","NZL"]],
  H: [["España","ESP"],["Cabo Verde","CPV"],["Arabia Saudita","KSA"],["Uruguay","URU"]],
  I: [["Francia","FRA"],["Senegal","SEN"],["Irak","IRQ"],["Noruega","NOR"]],
  J: [["Argentina","ARG"],["Argelia","ALG"],["Austria","AUT"],["Jordania","JOR"]],
  K: [["Portugal","POR"],["RD Congo","COD"],["Uzbekistán","UZB"],["Colombia","COL"]],
  L: [["Inglaterra","ENG"],["Croacia","CRO"],["Ghana","GHA"],["Panamá","PAN"]],
};

// cada grupo de 4 equipos juega 3 jornadas (round robin)
const PAIRINGS = [[0,1],[2,3]].concat([[0,2],[1,3]]).concat([[0,3],[1,2]]);
// reorganizado en jornadas:
const JORNADAS = [
  [[0,1],[2,3]],
  [[0,2],[1,3]],
  [[0,3],[1,2]],
];

const STORAGE_KEY = 'mundial2026_fixture_v1';
const ACCENTS = ['verde','oro','rojo','azul'];

let state = loadState();

function defaultState(){
  const s = { groups:{}, knockout:{} };
  Object.keys(GROUPS).forEach(g=>{
    s.groups[g] = { scores:{} }; // scores["0-1"] = {a:2,b:1}
  });
  return s;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const def = defaultState();
    return Object.assign(def, parsed, {
      groups: Object.assign(def.groups, parsed.groups||{}),
      knockout: parsed.knockout || {}
    });
  }catch(e){
    console.warn('No se pudo leer el guardado local, empiezo de cero.', e);
    return defaultState();
  }
}

let saveTimer = null;
function saveState(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e){ console.warn('No se pudo guardar localmente', e); }
  }, 150);
}

// ---------- RENDER: FASE DE GRUPOS ----------
function matchKey(i,j){ return i+'-'+j; }

function getScore(groupKey,i,j){
  const sc = state.groups[groupKey].scores[matchKey(i,j)];
  return sc || {a:'',b:''};
}
function setScore(groupKey,i,j,side,val){
  const scores = state.groups[groupKey].scores;
  const key = matchKey(i,j);
  if(!scores[key]) scores[key] = {a:'',b:''};
  scores[key][side] = val;
  saveState();
}

function computeStandings(groupKey){
  const teams = GROUPS[groupKey];
  const table = teams.map((t,idx)=>({
    idx, name:t[0], code:t[1],
    pj:0, g:0, e:0, p:0, gf:0, gc:0, pts:0
  }));
  JORNADAS.forEach(jornada=>{
    jornada.forEach(([i,j])=>{
      const sc = getScore(groupKey,i,j);
      if(sc.a===''||sc.b===''||sc.a===undefined||sc.b===undefined) return;
      const a = parseInt(sc.a,10), b = parseInt(sc.b,10);
      if(isNaN(a)||isNaN(b)) return;
      const ti = table[i], tj = table[j];
      ti.pj++; tj.pj++;
      ti.gf += a; ti.gc += b;
      tj.gf += b; tj.gc += a;
      if(a>b){ ti.g++; ti.pts+=3; tj.p++; }
      else if(a<b){ tj.g++; tj.pts+=3; ti.p++; }
      else { ti.e++; tj.e++; ti.pts++; tj.pts++; }
    });
  });
  table.forEach(t=> t.dg = t.gf - t.gc );
  table.sort((x,y)=> y.pts-x.pts || y.dg-x.dg || y.gf-x.gf || x.name.localeCompare(y.name));
  return table;
}

function renderGroupCard(groupKey, accent){
  const teams = GROUPS[groupKey];
  const card = document.createElement('div');
  card.className = 'group-card';

  const accentBar = document.createElement('div');
  accentBar.className = 'accent';
  accentBar.style.background = `var(--${accent})`;
  card.appendChild(accentBar);

  const header = document.createElement('div');
  header.className = 'group-header';
  header.innerHTML = `<span class="letter">GRUPO ${groupKey}</span><span class="label">Fase de grupos</span>`;
  card.appendChild(header);

  const standingsWrap = document.createElement('div');
  standingsWrap.className = 'standings-wrap';
  const table = document.createElement('table');
  table.className = 'standings';
  table.innerHTML = `<thead><tr>
      <th></th><th style="text-align:left">Equipo</th>
      <th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th>
    </tr></thead><tbody></tbody>`;
  standingsWrap.appendChild(table);
  card.appendChild(standingsWrap);

  const matchesWrap = document.createElement('div');
  matchesWrap.className = 'matches';
  JORNADAS.forEach((jornada, jIdx)=>{
    const label = document.createElement('div');
    label.className = 'jornada-label';
    label.textContent = `Jornada ${jIdx+1}`;
    matchesWrap.appendChild(label);
    jornada.forEach(([i,j])=>{
      const row = document.createElement('div');
      row.className = 'match-row';
      const sc = getScore(groupKey,i,j);
      row.innerHTML = `
        <span class="team-name">${teams[i][0]}</span>
        <input class="score-input" type="number" min="0" max="20" inputmode="numeric" data-g="${groupKey}" data-i="${i}" data-j="${j}" data-side="a" value="${sc.a}">
        <span class="vs">–</span>
        <input class="score-input" type="number" min="0" max="20" inputmode="numeric" data-g="${groupKey}" data-i="${i}" data-j="${j}" data-side="b" value="${sc.b}">
        <span class="team-name right">${teams[j][0]}</span>
      `;
      matchesWrap.appendChild(row);
    });
  });
  card.appendChild(matchesWrap);

  card.querySelectorAll('.score-input').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const {g,i,j,side} = e.target.dataset;
      setScore(g, parseInt(i), parseInt(j), side, e.target.value);
      refreshStandings(g, table);
    });
  });

  refreshStandings(groupKey, table);
  return card;
}

function refreshStandings(groupKey, tableEl){
  const standings = computeStandings(groupKey);
  const tbody = tableEl.querySelector('tbody');
  tbody.innerHTML = '';
  standings.forEach((t,pos)=>{
    const tr = document.createElement('tr');
    if(pos < 2) tr.className = 'qualified';
    tr.innerHTML = `
      <td class="pos">${pos+1}</td>
      <td class="team"><span class="code">${t.code}</span>${t.name}</td>
      <td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td>
      <td>${t.dg>0?'+':''}${t.dg}</td><td class="pts">${t.pts}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderGroups(){
  const grid = document.getElementById('group-grid');
  grid.innerHTML = '';
  Object.keys(GROUPS).forEach((g, idx)=>{
    grid.appendChild(renderGroupCard(g, ACCENTS[idx % ACCENTS.length]));
  });
}

// ---------- RENDER: ELIMINACIÓN DIRECTA ----------
const ROUNDS = [
  {id:'r32', title:'Dieciseisavos · 32', count:16},
  {id:'r16', title:'Octavos · 16', count:8},
  {id:'qf',  title:'Cuartos de final', count:4},
  {id:'sf',  title:'Semifinal', count:2},
  {id:'f',   title:'Final', count:1},
];

function koGet(matchId){
  if(!state.knockout[matchId]) state.knockout[matchId] = {teamA:'',teamB:'',scoreA:'',scoreB:''};
  return state.knockout[matchId];
}
function koSet(matchId, field, val){
  const m = koGet(matchId);
  m[field] = val;
  saveState();
}

function winnerOf(matchId){
  const m = koGet(matchId);
  if(m.scoreA==='' || m.scoreB==='') return null;
  const a = parseInt(m.scoreA,10), b = parseInt(m.scoreB,10);
  if(isNaN(a)||isNaN(b)||a===b) return null;
  return a>b ? m.teamA : m.teamB;
}

function renderKnockout(){
  const wrap = document.getElementById('bracket-wrap');
  wrap.innerHTML = '';

  ROUNDS.forEach((round, rIdx)=>{
    const col = document.createElement('div');
    col.className = 'round-col' + (round.count<=2 ? ' spaced-2':'');
    const title = document.createElement('div');
    title.className = 'round-title';
    title.textContent = round.title;
    col.appendChild(title);

    for(let m=0; m<round.count; m++){
      const matchId = `${round.id}-${m}`;
      const data = koGet(matchId);
      const box = document.createElement('div');
      box.className = 'ko-match' + (round.id==='f' ? ' ko-final':'');

      ['A','B'].forEach(side=>{
        const slot = document.createElement('div');
        const team = data['team'+side];
        const isWinner = winnerOf(matchId) === team && team;
        slot.className = 'ko-slot' + (isWinner ? ' winner':'');
        const locked = rIdx>0; // las rondas después de la primera se completan automáticamente
        slot.innerHTML = `
          <input class="team-input" type="text" placeholder="Equipo" maxlength="22"
            value="${escapeHtml(team)}" data-match="${matchId}" data-field="team${side}" ${locked?'readonly':''}>
          <input class="ko-score" type="number" min="0" max="20" inputmode="numeric"
            value="${escapeHtml(data['score'+side])}" data-match="${matchId}" data-field="score${side}">
        `;
        box.appendChild(slot);
        if(side==='A'){
          const div = document.createElement('div');
          div.className = 'ko-divider';
          box.appendChild(div);
        }
      });
      col.appendChild(box);
    }
    wrap.appendChild(col);
  });

  wrap.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const {match, field} = e.target.dataset;
      koSet(match, field, e.target.value);

      if(field === 'teamA' || field === 'teamB'){
        // solo guardamos: no hace falta redibujar todo el bracket mientras se escribe
        // un nombre, así el campo no pierde el foco (y no se cierra el teclado en el celu)
        return;
      }

      // los puntajes sí necesitan recalcular ganador y propagar a la siguiente ronda
      const selStart = e.target.selectionStart;
      propagateWinners();
      renderKnockout();
      const restored = wrap.querySelector(`input[data-match="${match}"][data-field="${field}"]`);
      if(restored){
        restored.focus();
        try{ restored.setSelectionRange(selStart, selStart); }catch(_){}
      }
    });
  });

  const champ = document.getElementById('champion-banner');
  const w = winnerOf('f-0');
  champ.textContent = w ? `🏆 Campeón: ${w}` : '';
}

function propagateWinners(){
  for(let r=0; r<ROUNDS.length-1; r++){
    const round = ROUNDS[r];
    const nextRound = ROUNDS[r+1];
    for(let m=0; m<round.count; m++){
      const matchId = `${round.id}-${m}`;
      const w = winnerOf(matchId);
      if(!w) continue;
      const nextMatchIndex = Math.floor(m/2);
      const slot = (m%2===0) ? 'teamA' : 'teamB';
      const nextId = `${nextRound.id}-${nextMatchIndex}`;
      const next = koGet(nextId);
      if(next[slot] !== w){
        next[slot] = w;
        // si cambia el equipo, limpiamos el resultado que ya estaba puesto
        next['score'+(slot==='teamA'?'A':'B')] = '';
      }
    }
  }
  saveState();
}

function loadGroupQualifiers(){
  const slots = [];
  Object.keys(GROUPS).forEach(g=>{
    const standings = computeStandings(g);
    slots.push(standings[0] ? standings[0].name : '');
    slots.push(standings[1] ? standings[1].name : '');
  });
  // 24 primeros/segundos + 8 lugares para mejores terceros (manual)
  for(let m=0; m<16; m++){
    const matchId = `r32-${m}`;
    const data = koGet(matchId);
    data.teamA = slots[m*2] !== undefined ? (slots[m*2] || data.teamA) : data.teamA;
    data.teamB = slots[m*2+1] !== undefined ? (slots[m*2+1] || data.teamB) : data.teamB;
  }
  // Los 8 últimos cruces (índices 12-15 ya usados arriba con grupos 11 y 12... en realidad
  // con 12 grupos hay 24 clasificados directos: llenan 12 partidos completos.
  // Dejamos 4 partidos restantes (12,13,14,15) con un slot libre para "Mejor 3°".
  for(let m=12; m<16; m++){
    const matchId = `r32-${m}`;
    const data = koGet(matchId);
    if(!data.teamB) data.teamB = '';
  }
  saveState();
  renderKnockout();
}

function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- TABS ----------
function setupTabs(){
  const buttons = document.querySelectorAll('.tab-btn[data-view]');
  buttons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      buttons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('section.view').forEach(s=>s.classList.remove('active'));
      document.getElementById(btn.dataset.view).classList.add('active');
    });
  });
}

// ---------- EXPORTAR / IMPORTAR / RESET ----------
function setupDataButtons(){
  document.getElementById('btn-export').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mundial2026-mis-resultados.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById('file-import').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const imported = JSON.parse(reader.result);
        state = Object.assign(defaultState(), imported, {
          groups: Object.assign(defaultState().groups, imported.groups||{}),
          knockout: imported.knockout || {}
        });
        saveState();
        renderGroups();
        renderKnockout();
        alert('Resultados importados correctamente.');
      }catch(err){
        alert('Ese archivo no se pudo leer. ¿Es un JSON exportado desde este mismo fixture?');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btn-reset').addEventListener('click', ()=>{
    if(confirm('Esto borra todos los resultados guardados en este dispositivo. ¿Seguís?')){
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      renderGroups();
      renderKnockout();
    }
  });

  document.getElementById('btn-load-qualifiers').addEventListener('click', loadGroupQualifiers);
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', ()=>{
  setupTabs();
  setupDataButtons();
  renderGroups();
  renderKnockout();
});
