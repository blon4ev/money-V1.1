let db = JSON.parse(localStorage.getItem('ledger_v31')) || [];
let budget = JSON.parse(localStorage.getItem('budget_v31')) || { total: 0, cats: {} };
let cats = JSON.parse(localStorage.getItem('ledger_cats_v39')) || { 
    ex: [{n:'식비',i:'🍔'},{n:'카페',i:'☕'},{n:'교통',i:'🚌'},{n:'쇼핑',i:'🛍️'},{n:'주거',i:'🏠'},{n:'기타',i:'🎸'}], 
    in: [{n:'월급',i:'💰'},{n:'용돈',i:'💵'},{n:'보너스',i:'🎉'}] 
};

let viewDate = new Date();
let selectedDateStr = getTodayDateStr();
let inputMode = 'ex', inputAmt = '0', selectedCat = null, editingId = null;
let filterType = 'all', filterCategories = []; 
let pieChart, scrollTimeout;
let newCatEmoji = '✨';
let multiSelectedDates = []; 

let inputPaymentMethod = 'cash'; 
let isDutch = false; let dutchPeople = 2;

let isWeeklyExpanded = false; 

const emojiList = ['✨','🍔','☕','🍺','💊','📚','🎮','✈️','🎁','🐶','👶','💻','👗','👠','🏋️','🎬','🚗','📱','🥖','🥩','🍭','🎫','💸','🏦','🎉'];

function getTodayDateStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function formatDateWithDay(dateStr) { const date = new Date(dateStr); const days = ['일', '월', '화', '수', '목', '금', '토']; return `${days[date.getDay()]}요일 · ${date.getMonth() + 1}월 ${date.getDate()}일`; }
function getMostRecentMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

const catColorCache = {};
function initCatColors() {
    const allCats = [...new Set([...cats.ex.map(c=>c.n), ...cats.in.map(c=>c.n)])];
    allCats.forEach((name, i) => { 
        const h = (i * 137.5) % 360; 
        catColorCache[name] = { bg: `hsl(${h}, 80%, 45%)`, text: `#FFFFFF`, border: `none` }; 
    });
}
initCatColors();

function getCatColor(name) {
    if(!name) return { bg: '#404040', text: '#FFFFFF', border: 'none' };
    if(!catColorCache[name]) { 
        const count = Object.keys(catColorCache).length; 
        const h = (count * 137.5) % 360; 
        catColorCache[name] = { bg: `hsl(${h}, 80%, 45%)`, text: `#FFFFFF`, border: `none` }; 
    }
    return catColorCache[name];
}

function getEffectiveAmt(x) { return (x.dutch && x.dutch.active) ? Math.round(x.amt / x.dutch.people) : x.amt; }

const POKEMON_KEY = 'pokemon_state_v68';
const defaultPokemonState = {
    name: '알', nameChanged: false, candies: 0, xp: 0, level: 0, currentPokemonId: null, basePokemonId: null, eggHatchCount: 0, isFirstEgg: true, 
    streak: 0, lastRecordDate: getTodayDateStr(), lastLoginDate: '',
    lastStreakDate: '', dailyRewards: {}, lastBudgetRewardDate: '',
    pokedex: [] 
};

let tamaState = { ...defaultPokemonState };
try { 
    const saved = localStorage.getItem(POKEMON_KEY); 
    if (saved && saved !== "undefined") {
        tamaState = { ...defaultPokemonState, ...JSON.parse(saved) }; 
        if (!tamaState.dailyRewards) tamaState.dailyRewards = {};
        if (!tamaState.pokedex) tamaState.pokedex = [];
    } 
} catch(e) {}
function saveTamaState() { localStorage.setItem(POKEMON_KEY, JSON.stringify(tamaState)); }

function checkStreakBreakAndCleanup() {
    const today = getTodayDateStr();
    if (tamaState.lastStreakDate && tamaState.lastStreakDate !== today) {
        const yesterdayObj = new Date(); yesterdayObj.setDate(yesterdayObj.getDate() - 1);
        const yesterday = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth()+1).padStart(2,'0')}-${String(yesterdayObj.getDate()).padStart(2,'0')}`;
        if (tamaState.lastStreakDate !== yesterday) {
            tamaState.streak = 0; 
        }
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth()+1).padStart(2,'0')}-${String(thirtyDaysAgo.getDate()).padStart(2,'0')}`;
    for (const dateKey in tamaState.dailyRewards) {
        if (dateKey < cutoffStr) delete tamaState.dailyRewards[dateKey];
    }
    saveTamaState();
}

const evoMap = {
    1: [2, 3], 4: [5, 6], 7: [8, 9], 10: [11, 12], 13: [14, 15], 16: [17, 18], 29: [30, 31], 32: [33, 34], 43: [44, 45], 60: [61, 62], 63: [64, 65], 66: [67, 68], 69: [70, 71], 74: [75, 76], 92: [93, 94], 147: [148, 149],
    19:[20,20], 21:[22,22], 23:[24,24], 25:[26,26], 27:[28,28], 35:[36,36], 37:[38,38], 39:[40,40], 41:[42,42], 46:[47,47], 48:[49,49], 50:[51,51], 52:[53,53], 54:[55,55], 56:[57,57], 58:[59,59], 72:[73,73], 77:[78,78], 79:[80,80], 81:[82,82], 84:[85,85], 86:[87,87], 88:[89,89], 90:[91,91], 96:[97,97], 98:[99,99], 100:[101,101], 102:[103,103], 104:[105,105], 109:[110,110], 111:[112,112], 116:[117,117], 118:[119,119], 120:[121,121], 129:[130,130], 138:[139,139], 140:[141,141]
};
const groupD = [83, 95, 106, 107, 108, 113, 114, 115, 122, 123, 124, 125, 126, 127, 128, 131, 132, 137, 142, 143]; 
const groupE = [144, 145, 146, 150, 151]; 

const basePool = [
    1, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48, 
    50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 84, 86, 88, 90, 92, 
    96, 98, 100, 102, 104, 109, 111, 116, 118, 120, 129, 133, 138, 140, 147,
    ...groupD 
];

const pokeNames = {
    1:"이상해씨", 2:"이상해풀", 3:"이상해꽃", 4:"파이리", 5:"리자드", 6:"리자몽", 7:"꼬부기", 8:"어니부기", 9:"거북왕", 10:"캐터피", 11:"단데기", 12:"버터플", 13:"뿔충이", 14:"딱충이", 15:"독침붕", 16:"구구", 17:"피죤", 18:"피죤투", 19:"꼬렛", 20:"레트라", 21:"깨비참", 22:"깨비드릴조", 23:"아보", 24:"아보크", 25:"피카츄", 26:"라이츄", 27:"모래두지", 28:"고지", 29:"니드란♀", 30:"니드리나", 31:"니드퀸", 32:"니드란♂", 33:"니드리노", 34:"니드킹", 35:"삐삐", 36:"픽시", 37:"식스테일", 38:"나인테일", 39:"푸린", 40:"푸크린", 41:"주뱃", 42:"골뱃", 43:"뚜벅쵸", 44:"냄새꼬", 45:"라플레시아", 46:"파라스", 47:"파라섹트", 48:"콘팡", 49:"도나리", 50:"디그다", 51:"닥트리오", 52:"나옹", 53:"페르시온", 54:"고라파덕", 55:"골덕", 56:"망키", 57:"성원숭", 58:"가디", 59:"윈디", 60:"발챙이", 61:"슈륙챙이", 62:"강챙이", 63:"캐이시", 64:"윤겔라", 65:"후딘", 66:"알통몬", 67:"근육몬", 68:"괴력몬", 69:"모다피", 70:"우츠동", 71:"우츠보트", 72:"왕눈해", 73:"독파리", 74:"꼬마돌", 75:"데구리", 76:"딱구리", 77:"포니타", 78:"날쌩마", 79:"야돈", 80:"야도란", 81:"코일", 82:"레어코일", 83:"파오리", 84:"두두", 85:"두트리오", 86:"쥬쥬", 87:"쥬레곤", 88:"질퍽이", 89:"질뻐기", 90:"셀러", 91:"파르셀", 92:"고오스", 93:"고우스트", 94:"팬텀", 95:"롱스톤", 96:"슬리프", 97:"슬리퍼", 98:"크랩", 99:"킹크랩", 100:"찌리리공", 101:"붐볼", 102:"아라리", 103:"나시", 104:"탕구리", 105:"텅구리", 106:"시라소몬", 107:"홍수몬", 108:"내루미", 109:"또가스", 110:"또도가스", 111:"뿔카노", 112:"코뿌리", 113:"럭키", 114:"덩쿠리", 115:"캥카", 116:"쏘드라", 117:"시드라", 118:"콘치", 119:"왕콘치", 120:"별가사리", 121:"아쿠스타", 122:"마임맨", 123:"스라크", 124:"루주라", 125:"에레브", 126:"마그마", 127:"쁘사이저", 128:"켄타로스", 129:"잉어킹", 130:"갸라도스", 131:"라프라스", 132:"메타몽", 133:"이브이", 134:"샤미드", 135:"쥬피썬더", 136:"부스터", 137:"폴리곤", 138:"암나이트", 139:"암스타", 140:"투구", 141:"투구푸스", 142:"프테라", 143:"잠만보", 144:"프리져", 145:"썬더", 146:"파이어", 147:"미뇽", 148:"신뇽", 149:"망나뇽", 150:"뮤츠", 151:"뮤"
};

let toastTimeout;
function updateBattleMessage(msg) {
    const toastWrapper = document.getElementById('battle-toast');
    const msgEl = document.getElementById('battle-toast-msg');
    msgEl.innerHTML = msg;
    toastWrapper.style.display = 'flex';
    void toastWrapper.offsetWidth; 
    toastWrapper.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastWrapper.classList.remove('show');
        setTimeout(() => { if(!toastWrapper.classList.contains('show')) toastWrapper.style.display = 'none'; }, 200); 
    }, 2500); 
}

function checkDailyCandy() {
    const today = getTodayDateStr();
    if (tamaState.lastLoginDate !== today) {
        tamaState.candies += 15;
        tamaState.lastLoginDate = today;
        saveTamaState();
        setTimeout(() => { updateBattleMessage("일일 접속 보상으로 사탕 15개를 받았다!"); }, 500); 
    }
}

function updatePokemonImage() {
    const imgEl = document.getElementById('pokemon-img');
    const eggEl = document.getElementById('pokemon-egg');
    
    if (tamaState.level === 0) {
        imgEl.style.display = 'none'; 
        eggEl.style.display = 'block';
        document.getElementById('pokemon-stage').classList.remove('legendary-glow');
    } else {
        imgEl.style.display = 'block'; 
        eggEl.style.display = 'none';
        
        const isLegendary = (tamaState.eggHatchCount % 7 === 0);
        if(isLegendary && !isWeeklyExpanded) document.getElementById('pokemon-stage').classList.add('legendary-glow');
        else document.getElementById('pokemon-stage').classList.remove('legendary-glow');

        if (isWeeklyExpanded) {
            imgEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${tamaState.currentPokemonId}.png`;
        } else {
            imgEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${isLegendary?'shiny/':''}${tamaState.currentPokemonId}.gif`;
        }
    }
}

function checkEvolution() {
    let evolved = false;
    let msg = "";

    if (tamaState.level === 0 && tamaState.xp >= 30) {
        tamaState.level = 1;
        tamaState.eggHatchCount++;
        if (tamaState.eggHatchCount % 7 === 0) { tamaState.basePokemonId = groupE[Math.floor(Math.random() * groupE.length)]; } 
        else if (tamaState.isFirstEgg) { const starters = [1, 4, 7]; tamaState.basePokemonId = starters[Math.floor(Math.random() * starters.length)]; tamaState.isFirstEgg = false; } 
        else { tamaState.basePokemonId = basePool[Math.floor(Math.random() * basePool.length)]; }
        tamaState.currentPokemonId = tamaState.basePokemonId;
        evolved = true;
        msg = `오앗!? 알에서 포켓몬이 부화했다!`;
    } 
    else if (tamaState.level === 1 && tamaState.xp >= 100) {
        tamaState.level = 2;
        if(tamaState.basePokemonId === 133) { const eeveelutions = [134, 135, 136]; tamaState.currentPokemonId = eeveelutions[Math.floor(Math.random() * eeveelutions.length)]; } 
        else if (evoMap[tamaState.basePokemonId]) { tamaState.currentPokemonId = evoMap[tamaState.basePokemonId][0]; }
        evolved = true;
        msg = `어라!? 포켓몬의 모습이...!`;
    } 
    else if (tamaState.level === 2 && tamaState.xp >= 300) {
        tamaState.level = 3;
        if(tamaState.basePokemonId !== 133 && evoMap[tamaState.basePokemonId]) { tamaState.currentPokemonId = evoMap[tamaState.basePokemonId][1]; }
        evolved = true;
        msg = `어라!? 포켓몬의 모습이...!`;
    }

    if (evolved) {
        const newName = pokeNames[tamaState.currentPokemonId];
        if (!tamaState.nameChanged) tamaState.name = newName; 
        
        if (!tamaState.pokedex) tamaState.pokedex = [];
        if (!tamaState.pokedex.includes(tamaState.currentPokemonId)) {
            tamaState.pokedex.push(tamaState.currentPokemonId);
        }

        updateBattleMessage(msg);
    }
}

function feedCandy() {
    if (tamaState.candies <= 0) return;
    if (tamaState.level === 3) { updateBattleMessage("이미 최종 진화 단계입니다!"); return; }
    tamaState.candies--;
    tamaState.xp += 10;
    
    updateBattleMessage(`${tamaState.name}에게 이상한 사탕을 먹였다!`);

    const imgElement = document.getElementById(tamaState.level === 0 ? 'pokemon-egg' : 'pokemon-img');
    imgElement.classList.add('jump-anim');
    createParticles(document.getElementById('pokemon-wrapper'));
    setTimeout(() => { imgElement.classList.remove('jump-anim'); }, 200);

    checkEvolution();
    saveTamaState();
    renderTama(); 
}

function createParticles(container) {
    for(let i=0; i<5; i++) {
        const p = document.createElement('div'); p.className = 'particle'; p.innerText = '🍬';
        p.style.setProperty('--tx', `${(Math.random() - 0.5) * 60}px`); p.style.left = '50%'; p.style.top = '50%';
        p.style.animation = `floatUp 0.6s ease-out forwards`;
        container.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }
}

function buyNewEgg() {
    if (tamaState.candies < 2) { updateBattleMessage("사탕이 2개 필요합니다."); return; }
    if (confirm("새로운 알을 받을까요? (사탕 2개 소모)")) {
        tamaState.candies -= 2;
        tamaState.level = 0; tamaState.xp = 0; tamaState.currentPokemonId = null; tamaState.basePokemonId = null;
        tamaState.name = "알"; tamaState.nameChanged = false; 
        
        document.getElementById('pokemon-stage').classList.remove('legendary-glow');
        updateBattleMessage(`새로운 알을 건네받았다!`);
        saveTamaState(); renderTama();
    }
}

function changeName() {
    if (tamaState.nameChanged) { updateBattleMessage("이름은 한 번만 지어줄 수 있습니다!"); return; }
    const newName = prompt("포켓몬에게 예쁜 이름을 지어주세요", tamaState.name);
    if (newName && newName.trim().length > 0) { 
        tamaState.name = newName.trim().substring(0, 10); 
        tamaState.nameChanged = true; 
        saveTamaState(); renderTama(); 
    }
}

function setPaymentMethod(m) {
    inputPaymentMethod = m;
    document.getElementById('pay-card').classList.remove('active'); document.getElementById('pay-cash').classList.remove('active'); document.getElementById(`pay-${m}`).classList.add('active');
}

function toggleDutch() {
    isDutch = !isDutch;
    document.getElementById('dutch-toggle').classList.toggle('on', isDutch);
    document.getElementById('dutch-people-row').style.display = isDutch ? 'flex' : 'none';
}
function changeDutchPeople(delta) {
    dutchPeople = Math.max(2, dutchPeople + delta);
    document.getElementById('dutch-people-count').innerText = dutchPeople;
}

function toggleWeeklyList() {
    isWeeklyExpanded = !isWeeklyExpanded;
    const chevron = document.getElementById('weekly-chevron');
    const list = document.getElementById('tama-weekly-list');
    const wrapper = document.getElementById('pokemon-wrapper');
    const imgEl = document.getElementById('pokemon-img');
    const eggEl = document.getElementById('pokemon-egg');

    if (isWeeklyExpanded) {
        chevron.style.transform = 'rotate(180deg)';
        list.style.display = 'block';
        wrapper.classList.add('small-mode');
        imgEl.classList.add('small-mode');
        eggEl.classList.add('small-mode');
    } else {
        chevron.style.transform = 'rotate(0deg)';
        list.style.display = 'none';
        wrapper.classList.remove('small-mode');
        imgEl.classList.remove('small-mode');
        eggEl.classList.remove('small-mode');
    }
    updatePokemonImage(); 
}

function renderWeeklyList() {
    const listContainer = document.getElementById('tama-weekly-list');
    const today = new Date(); const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); 
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth()+1).padStart(2,'0')}-${String(startOfWeek.getDate()).padStart(2,'0')}`;
    const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth()+1).padStart(2,'0')}-${String(endOfWeek.getDate()).padStart(2,'0')}`;
    
    const weeklyItems = db.filter(x => x.date >= startStr && x.date <= endStr).sort((a,b) => { if (a.date !== b.date) return new Date(b.date) - new Date(a.date); return b.id - a.id; });
    const hasTodayRecord = db.some(x => x.date === getTodayDateStr());
    
    let html = '';
    if (!hasTodayRecord) html += `<button class="retro-btn" onclick="openInputScreen()" style="background:var(--text-main); color:white; width:calc(100% - 6px); height:46px; font-size:15px; margin: 3px 3px 12px 3px; font-weight:bold;">+ 오늘 지출 등록하기</button>`;
    
    if(weeklyItems.length === 0) html += '<div style="text-align:center; color:var(--text-dim); margin-top:30px; font-size:14px;">이번 주 내역이 없습니다.</div>';
    else {
        weeklyItems.forEach(x => {
            const c = getCatColor(x.cat);
            const isGrouped = x.groupId && db.filter(i => i.groupId === x.groupId).length > 1;
            const iconStr = (isGrouped ? ' 🔗' : '') + (x.repeat ? ' ↺' : '') + (x.dutch && x.dutch.active ? ' 🤝' : '');
            const effAmt = getEffectiveAmt(x);

            html += `
                <div class="list-item" onclick="showItemDetail(${x.id})">
                    <div class="list-left">
                        <div class="list-icon">${x.icon}</div>
                        <div class="list-details">
                            <div class="cat-badge" style="background:${c.bg}; color:${c.text};">${x.cat}${iconStr}</div>
                        </div>
                    </div>
                    <div class="list-amt" style="color:${x.type==='in'?'var(--accent-green)':'var(--text-main)'};">${x.type==='in'?'+':'-'} ${effAmt.toLocaleString()}원</div>
                </div>`;
        });
    }
    listContainer.innerHTML = html;
}

function renderTama() {
    document.getElementById('tamaName').innerText = tamaState.name;
    document.getElementById('tamaNameEditIcon').style.display = tamaState.nameChanged ? 'none' : 'inline';
    
    let stageText = ""; let requiredXP; let baseXP = 0;
    if (tamaState.level === 0) { stageText = "Lv.1"; requiredXP = 30; baseXP = 0; } 
    else if (tamaState.level === 1) { stageText = `Lv.2`; requiredXP = 100; baseXP = 30; } 
    else if (tamaState.level === 2) { stageText = `Lv.3`; requiredXP = 300; baseXP = 100; } 
    else { stageText = `Lv.MAX`; requiredXP = 'MAX'; baseXP = 300; }

    document.getElementById('tamaLevel').innerText = stageText;
    
    let pct = requiredXP === 'MAX' ? 100 : ((tamaState.xp - baseXP) / (requiredXP - baseXP)) * 100; pct = Math.max(0, Math.min(100, pct)); 
    document.getElementById('tamaExpFill').style.width = `${pct}%`;
    
    document.getElementById('candy-count-display').innerText = tamaState.candies;
    const feedBtn = document.getElementById('feed-candy-btn');
    feedBtn.disabled = (tamaState.candies <= 0 || tamaState.level === 3);

    const streakMsg = tamaState.streak >= 3 ? `🔥 ${tamaState.streak}일 연속 (보상 2배!)` : (tamaState.streak > 0 ? `🔥 ${tamaState.streak}일 연속` : '🌱 당일 기록 시작!');
    document.getElementById('tamaStreak').innerText = streakMsg;

    updatePokemonImage();
    renderWeeklyList();
}

function renderLedger() {
    const y = viewDate.getFullYear(), m = viewDate.getMonth(), prefix = `${y}-${String(m+1).padStart(2,'0')}`;
    document.getElementById('month-name').innerText = `${y}년 ${m+1}월`; document.getElementById('selected-date-text').innerText = `${selectedDateStr} 내역`;
    
    let baseItems = db.filter(x => x.date.startsWith(prefix));
    
    let currentCats = [];
    if (filterType === 'all') { currentCats = [...cats.ex.map(c=>c.n), ...cats.in.map(c=>c.n)]; } 
    else if (filterType === 'ex') { currentCats = cats.ex.map(c=>c.n); baseItems = baseItems.filter(x => x.type === 'ex'); } 
    else if (filterType === 'in') { currentCats = cats.in.map(c=>c.n); baseItems = baseItems.filter(x => x.type === 'in'); }
    
    const fCat = document.getElementById('filter-bar');
    let fHtml = `
        <div class="filter-segment-container">
            <button class="filter-segment-btn ${filterType==='all'?'active':''}" onclick="setFilterType('all')">전체</button>
            <button class="filter-segment-btn ${filterType==='ex'?'active':''}" onclick="setFilterType('ex')">지출</button>
            <button class="filter-segment-btn ${filterType==='in'?'active':''}" onclick="setFilterType('in')">수입</button>
        </div>
        <div class="filter-divider"></div>
    `;
    
    const avCats = [...new Set(currentCats)]; 
    avCats.forEach(c => { 
        const isActive = filterCategories.includes(c);
        const activeClass = isActive ? 'active' : '';
        fHtml += `<button class="filter-chip ${activeClass}" onclick="toggleFilterCat('${c}')">${c}</button>`; 
    });
    fCat.innerHTML = fHtml;

    let filteredItems = baseItems;
    if(filterCategories.length > 0) filteredItems = baseItems.filter(x => filterCategories.includes(x.cat));

    const inS = filteredItems.filter(x => x.type === 'in').reduce((s, x) => s + x.amt, 0); 
    const exS = filteredItems.filter(x => x.type === 'ex').reduce((s, x) => s + getEffectiveAmt(x), 0);
    
    const sumInEl = document.getElementById('sum-in');
    const sumExEl = document.getElementById('sum-ex');
    if (sumInEl) sumInEl.innerText = `+${(inS/10000).toFixed(1)}만`; 
    if (sumExEl) sumExEl.innerText = `-${(exS/10000).toFixed(1)}만`; 

    const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate(); 
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '<div class="weekday">일</div><div class="weekday">월</div><div class="weekday">화</div><div class="weekday">수</div><div class="weekday">목</div><div class="weekday">금</div><div class="weekday">토</div>';
    for(let i=0; i<first; i++) grid.innerHTML += '<div></div>';
    for(let d=1; d<=last; d++) {
        const dStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; 
        const dItems = filteredItems.filter(x => x.date === dStr);
        const dNet = dItems.reduce((s, x) => s + (x.type === 'in' ? x.amt : -getEffectiveAmt(x)), 0);
        let amtH = dNet !== 0 ? `<div class="day-amount" style="color:${dNet>0?'var(--accent-green)':'var(--text-dim)'}">${dNet>0?'+':''}${Math.abs(dNet)>=10000?(dNet/10000).toFixed(0)+'만':dNet.toLocaleString()}</div>` : '';
        grid.innerHTML += `<div class="day ${dStr===selectedDateStr?'selected':''} ${dStr===getTodayDateStr()?'today':''}" onclick="selectDay('${dStr}')">${d}${amtH}</div>`;
    }

    const fd = filteredItems.filter(x => x.date === selectedDateStr);
    const list = document.getElementById('list-area');
    list.innerHTML = fd.length ? '' : '<div style="text-align:center; color:var(--text-dim); margin-top:40px; font-size:14px;">내역이 없습니다.</div>';
    
    fd.sort((a,b) => { if(a.date !== b.date) return new Date(b.date) - new Date(a.date); return b.id - a.id; }).forEach(x => {
        const c = getCatColor(x.cat);
        const isGrouped = x.groupId && db.filter(i => i.groupId === x.groupId).length > 1;
        const iconStr = (isGrouped ? ' 🔗' : '') + (x.repeat ? ' ↺' : '') + (x.dutch && x.dutch.active ? ' 🤝' : '');
        const effAmt = getEffectiveAmt(x);

        list.innerHTML += `
            <div class="list-item" onclick="showItemDetail(${x.id})">
                <div class="list-left">
                    <div class="list-icon">${x.icon}</div>
                    <div class="list-details">
                        <div class="cat-badge" style="background:${c.bg}; color:${c.text};">${x.cat}${iconStr}</div>
                        <div class="list-memo">${x.memo || '메모 없음'}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div class="list-amt" style="color:${x.type==='in'?'var(--accent-green)':'var(--text-main)'};">${x.type==='in'?'+':'-'} ${effAmt.toLocaleString()}원</div>
                </div>
            </div>`;
    });
    updateBudgetLogic();
}

function setFilterType(t) { filterType = t; filterCategories = []; renderLedger(); }
function toggleFilterCat(c) { if(filterCategories.includes(c)) filterCategories = filterCategories.filter(cat => cat !== c); else filterCategories.push(c); renderLedger(); }

function toggleFilterBar() { 
    const filterBar = document.getElementById('filter-bar'); 
    const filterBtn = document.getElementById('filter-btn'); 
    if (filterBar.style.display === 'flex') {
        filterBar.style.display = 'none';
        if(filterBtn) filterBtn.classList.remove('active'); 
        filterType='all'; filterCategories=[]; renderLedger(); 
    } else {
        filterBar.style.display = 'flex';
        if(filterBtn) filterBtn.classList.add('active'); 
    }
}

function renderStatsModal() {
    const y = viewDate.getFullYear(), m = viewDate.getMonth(), prefix = `${y}-${String(m+1).padStart(2,'0')}`;
    document.getElementById('stats-month-name').innerText = `${y}년 ${m+1}월 분석`;
    const exData = db.filter(x => x.date.startsWith(prefix) && x.type === 'ex');
    
    const monthEx = exData.reduce((s,x)=>s+getEffectiveAmt(x),0);
    const cardBill = exData.filter(x => x.payment === 'card').reduce((s,x)=>s+getEffectiveAmt(x), 0);
    document.getElementById('stats-card-bill').innerText = `${cardBill.toLocaleString()}원`;

    const catMap = {}; exData.forEach(x => { catMap[x.cat] = (catMap[x.cat] || 0) + getEffectiveAmt(x); });
    const sortedCats = Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a]); const bgColors = sortedCats.map(c => getCatColor(c).bg); 
    
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    if(pieChart) pieChart.destroy();
    pieChart = new Chart(ctxPie, { type: 'doughnut', data: { labels: sortedCats, datasets: [{ data: sortedCats.map(c=>catMap[c]), backgroundColor: bgColors, borderWidth: 2, borderColor: '#FFF' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } } });

    const legendContainer = document.getElementById('pie-legend'); legendContainer.innerHTML = '';
    sortedCats.forEach(c => {
        const color = getCatColor(c); const share = monthEx > 0 ? ((catMap[c]/monthEx)*100).toFixed(1) : 0;
        legendContainer.innerHTML += `<div class="stats-legend-row"><div style="display:flex; align-items:center; gap:8px;"><div style="width:16px; height:16px; border-radius:0; background:${color.bg}; box-shadow:var(--shadow-2px);"></div><span style="font-size:16px; color:var(--text-main); font-weight:bold;">${c}</span><span style="font-size:14px; color:var(--text-dim);">${share}%</span></div><div style="font-size:18px; font-weight:bold;">${catMap[c].toLocaleString()}원</div></div>`;
    });
}

function updateBudgetLogic() {
    const y=viewDate.getFullYear(), m=viewDate.getMonth(), prefix=`${y}-${String(m+1).padStart(2,'0')}`;
    const monthEx = db.filter(x => x.date.startsWith(prefix) && x.type === 'ex').reduce((s,x)=>s+getEffectiveAmt(x),0);
    const total = budget.total || 0; const remain = total - monthEx; const pct = total > 0 ? Math.min((monthEx/total)*100, 100) : 0;
    
    if(document.getElementById('screen-goal').classList.contains('active')) {
        document.getElementById('budget-remain-amt-goal').innerText = `${remain.toLocaleString()}원`; document.getElementById('budget-percent-goal').innerText = `${pct.toFixed(0)}% 사용`; document.getElementById('budget-progress-goal').style.width = `${pct}%`;
    }
}

function renderGoalScreen() {
    updateBudgetLogic(); document.getElementById('total-budget-input').innerText = (budget.total || 0).toLocaleString() + '원';
    const list = document.getElementById('cat-budget-list'); list.innerHTML = '';
    const y=viewDate.getFullYear(), m=viewDate.getMonth(), prefix=`${y}-${String(m+1).padStart(2,'0')}`; const monthExData = db.filter(x => x.date.startsWith(prefix) && x.type === 'ex');
    cats.ex.forEach(c => {
        const bAmt = budget.cats[c.n] || 0; const spent = monthExData.filter(x=>x.cat===c.n).reduce((s,x)=>s+getEffectiveAmt(x),0); const pct = bAmt > 0 ? Math.min((spent/bAmt)*100, 100) : 0;
        list.innerHTML += `<div class="cat-budget-item"><div style="display:flex; align-items:center; gap:12px;"><span style="font-size:24px;">${c.i}</span><div><div style="font-size:16px; color:var(--text-main); font-weight:bold;">${c.n}</div><div style="font-size:13px; color:var(--text-dim); margin-top:4px;">사용: ${spent.toLocaleString()}원</div></div></div><div style="text-align:right;"><div class="cat-budget-input" onclick="openBudgetNumpad('${c.n}', ${bAmt})">${bAmt.toLocaleString()}원</div><div class="budget-bar-mini"><div class="budget-fill-mini" style="width:${pct}%; background:${pct>90?'var(--accent-red)':'var(--accent-green)'}"></div></div></div></div>`;
    });
}

let budgetTarget = null; let budgetInputAmt = '0';
function openBudgetNumpad(target, currentAmt = 0) { budgetTarget = target; budgetInputAmt = String(target === 'total' ? budget.total || 0 : currentAmt); document.getElementById('budget-numpad-title').innerText = target === 'total' ? '총 예산 설정' : `${target} 예산 설정`; document.getElementById('budget-amt-display').innerText = Number(budgetInputAmt).toLocaleString() + '원'; showScreen('screen-budget-input'); }
function closeBudgetNumpad() { showScreen('screen-goal'); }
function pressBudgetNum(n) { if(n === 'C') budgetInputAmt = '0'; else budgetInputAmt = budgetInputAmt === '0' ? String(n) : (budgetInputAmt.length < 10 ? budgetInputAmt + String(n) : budgetInputAmt); document.getElementById('budget-amt-display').innerText = Number(budgetInputAmt).toLocaleString() + '원'; }

function confirmBudget() { 
    const val = Number(budgetInputAmt); 
    if (budgetTarget === 'total') budget.total = val; else { if(!budget.cats) budget.cats = {}; budget.cats[budgetTarget] = val; } 
    localStorage.setItem('budget_v31', JSON.stringify(budget)); 
    renderGoalScreen(); 
    closeBudgetNumpad(); 
}

function validateAndSaveBudget() {
    const today = getTodayDateStr();
    const lastReward = tamaState.lastBudgetRewardDate;
    const recentMonday = getMostRecentMonday(new Date());

    let msg = '예산 설정이 저장되었습니다!';

    if (budget.total > 0) {
        if (!lastReward || lastReward < recentMonday) {
            tamaState.candies += 10;
            tamaState.lastBudgetRewardDate = today;
            saveTamaState();
            renderTama();
            msg = '주간 예산 설정 완료! 사탕 10개를 얻었다!';
        }
    } else {
        msg = '총 예산을 먼저 설정해주세요!';
    }
    updateBattleMessage(msg);
}

function openMultiPicker() { document.getElementById('multi-picker').style.display = 'flex'; renderMultiCalendar(); }
function closeMultiPicker() { document.getElementById('multi-picker').style.display = 'none'; const countLabel = document.getElementById('multi-date-count'); if(multiSelectedDates.length > 0) { countLabel.style.display = 'block'; countLabel.innerText = `${multiSelectedDates.length}개 날짜 추가됨`; } else countLabel.style.display = 'none'; }

function renderMultiCalendar() { 
    const y=viewDate.getFullYear(), m=viewDate.getMonth(), f=new Date(y,m,1).getDay(), l=new Date(y,m+1,0).getDate(), g=document.getElementById('multi-cal-grid'); 
    g.innerHTML='<div class="multi-weekday">일</div><div class="multi-weekday">월</div><div class="multi-weekday">화</div><div class="multi-weekday">수</div><div class="multi-weekday">목</div><div class="multi-weekday">금</div><div class="multi-weekday">토</div>'; 
    for(let i=0; i<f; i++) g.innerHTML+='<div></div>'; 
    for(let d=1; d<=l; d++) { 
        const dStr=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; 
        g.innerHTML+=`<div class="day-pick ${multiSelectedDates.includes(dStr)?'picked':''}" onclick="toggleMultiDate('${dStr}')">${d}</div>`; 
    } 
}
function toggleMultiDate(d) { if(multiSelectedDates.includes(d)) multiSelectedDates = multiSelectedDates.filter(x=>x!==d); else multiSelectedDates.push(d); renderMultiCalendar(); }

function executeSave() {
    const amt = Number(inputAmt); if(amt <= 0 || !selectedCat) return alert('금액과 카테고리를 확인하세요');
    const primaryDate = document.getElementById('date-input').value; const memo = document.getElementById('memo-input').value; const isRepeat = document.getElementById('repeat-toggle').classList.contains('on');
    const dutchData = isDutch ? { active: true, people: dutchPeople, settled: Array(dutchPeople - 1).fill(false) } : null;
    const datesToSave = [primaryDate, ...multiSelectedDates]; const groupId = (datesToSave.length > 1 || isRepeat) ? Date.now() : null;

    if (editingId) {
        const idx = db.findIndex(x => x.id === editingId);
        if(idx > -1) {
            const oldItem = db[idx]; if(oldItem.dutch && isDutch && oldItem.dutch.people === dutchPeople) { dutchData.settled = oldItem.dutch.settled; }
            db[idx] = { ...db[idx], amt, cat: selectedCat.n, icon: selectedCat.i, memo, date: primaryDate, type: inputMode, repeat: isRepeat, payment: inputPaymentMethod, dutch: dutchData };
        }
        updateBattleMessage('수정되었습니다.');
    } else {
        datesToSave.forEach((d, i) => { db.push({ id: Date.now() + i, groupId: groupId, date: d, amt, type: inputMode, cat: selectedCat.n, icon: selectedCat.i, memo, repeat: isRepeat, payment: inputPaymentMethod, dutch: dutchData ? JSON.parse(JSON.stringify(dutchData)) : null }); });
        
        const today = getTodayDateStr();
        let totalCandiesGained = 0;
        let streakUpdated = false;

        datesToSave.forEach(d => {
            if (d === today && !streakUpdated) {
                if (tamaState.lastStreakDate !== today) {
                    const yesterdayObj = new Date(); yesterdayObj.setDate(yesterdayObj.getDate() - 1);
                    const yesterday = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth()+1).padStart(2,'0')}-${String(yesterdayObj.getDate()).padStart(2,'0')}`;
                    if (tamaState.lastStreakDate === yesterday) tamaState.streak++;
                    else tamaState.streak = 1;
                    
                    tamaState.lastStreakDate = today;
                }
                streakUpdated = true;
            }

            if (!tamaState.dailyRewards[d]) tamaState.dailyRewards[d] = 0;

            if (tamaState.dailyRewards[d] < 5) {
                tamaState.dailyRewards[d]++;
                const candyAmount = (tamaState.streak >= 3) ? 2 : 1;
                tamaState.candies += candyAmount;
                totalCandiesGained += candyAmount;
            }
        });

        if (totalCandiesGained > 0) updateBattleMessage(`가계부 기록 보상으로 사탕 ${totalCandiesGained}개를 얻었다!`);
        else updateBattleMessage(`가계부에 기록을 남겼다!`);
    }
    
    localStorage.setItem('ledger_v31', JSON.stringify(db)); 
    saveTamaState();
    closeInputScreen(); 
    if(document.getElementById('screen-ledger').classList.contains('active')) renderLedger(); 
    renderTama(); 
}

function openAddCat() { document.getElementById('add-cat-overlay').style.display='flex'; renderEmojis(); }
function closeAddCat() { document.getElementById('add-cat-overlay').style.display='none'; document.getElementById('new-cat-name').value = ''; }
function renderEmojis() { const eg = document.getElementById('emoji-grid'); eg.innerHTML = ''; emojiList.forEach(e => { eg.innerHTML += `<div class="emoji-item ${newCatEmoji === e ? 'selected' : ''}" onclick="selectEmoji('${e}')">${e}</div>`; }); }
function selectEmoji(e) { newCatEmoji = e; renderEmojis(); }
function saveNewCategory() { const n = document.getElementById('new-cat-name').value.trim(); if(!n) return alert('카테고리 이름을 입력하세요'); cats[inputMode].push({n, i: newCatEmoji}); localStorage.setItem('ledger_cats_v39', JSON.stringify(cats)); closeAddCat(); renderCats(); selectCat(n, newCatEmoji); }

function switchTab(tab) { 
    document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active')); 
    document.getElementById(`tab-${tab}`).classList.add('active'); 
    showScreen(`screen-${tab}`); 
    
    if(tab === 'ledger') renderLedger(); 
    if(tab === 'goal') renderGoalScreen(); 
    if(tab === 'tama') renderTama(); 
    if(tab === 'pokedex') renderPokedex(); 
}

function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function openStatsModal() { document.getElementById('stats-modal').classList.add('active'); renderStatsModal(); }
function closeStatsModal() { document.getElementById('stats-modal').classList.remove('active'); }
function moveMonth(dir) { viewDate.setMonth(viewDate.getMonth() + dir); selectedDateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-01`; renderLedger(); }
function selectDay(dateStr) { selectedDateStr = dateStr; renderLedger(); }

function openInputScreen() { 
    inputAmt = '0'; selectedCat = null; editingId = null; multiSelectedDates = []; 
    document.getElementById('multi-date-count').style.display = 'none';
    document.getElementById('repeat-toggle').className = 'switch';
    isDutch = false; dutchPeople = 2; document.getElementById('dutch-toggle').className = 'switch'; document.getElementById('dutch-people-row').style.display = 'none'; document.getElementById('dutch-people-count').innerText = '2';
    document.getElementById('memo-input').value=''; document.getElementById('amt-display').innerText='0원'; 
    inputPaymentMethod = 'cash'; setPaymentMethod('cash');
    setInputMode('ex'); document.getElementById('date-input').value = selectedDateStr; 
    showScreen('screen-input'); focusAmount(); 
}

function closeInputScreen() { if(document.getElementById('tab-tama').classList.contains('active')) showScreen('screen-tama'); else if(document.getElementById('tab-ledger').classList.contains('active')) showScreen('screen-ledger'); else showScreen('screen-goal'); }
function focusAmount() { document.getElementById('keypad-layer').style.display = 'flex'; document.getElementById('details-layer').style.display = 'none'; }
function blurAmount() { if(inputAmt === '0') return; document.getElementById('keypad-layer').style.display = 'none'; document.getElementById('details-layer').style.display = 'flex'; }
function pressNum(n) { if(n === 'C') inputAmt = '0'; else inputAmt = inputAmt==='0'?String(n):(inputAmt.length<10?inputAmt+String(n):inputAmt); document.getElementById('amt-display').innerText = Number(inputAmt).toLocaleString() + '원'; }

function setInputMode(m) { 
    inputMode = m; 
    document.getElementById('seg-ex').style.background = m==='ex'?'var(--text-main)':'transparent'; document.getElementById('seg-ex').style.color = m==='ex'?'white':'var(--text-main)'; 
    document.getElementById('seg-in').style.background = m==='in'?'var(--text-main)':'transparent'; document.getElementById('seg-in').style.color = m==='in'?'white':'var(--text-main)'; 
    
    if(m === 'in') { document.getElementById('payment-method-row').style.display = 'none'; document.getElementById('dutch-main-row').style.display = 'none'; document.getElementById('dutch-people-row').style.display = 'none'; }
    else { document.getElementById('payment-method-row').style.display = 'flex'; document.getElementById('dutch-main-row').style.display = 'flex'; if(isDutch) document.getElementById('dutch-people-row').style.display = 'flex'; }
    renderCats(); 
}

function renderCats() { 
    const g = document.getElementById('cat-grid'); g.innerHTML=''; 
    cats[inputMode].forEach(c=>{ 
        const isSelected = selectedCat && selectedCat.n === c.n;
        const border = isSelected ? 'none' : 'none'; const bg = isSelected ? 'var(--text-main)' : 'white'; const color = isSelected ? 'white' : 'var(--text-main)'; const transform = isSelected ? 'translate(3px,3px)' : 'none'; const shadow = isSelected ? 'none' : 'var(--shadow-3px)';
        g.innerHTML+=`<div class="cat-box" style="border:${border}; background:${bg}; transform:${transform}; box-shadow:${shadow};" onclick="selectCat('${c.n}', '${c.i}')"><div style="font-size:14px; font-weight:bold; color:${color}; padding: 10px 0;">${c.n}</div></div>`; 
    }); 
    g.innerHTML += `<div class="cat-box" style="border:none; background:transparent; box-shadow:var(--shadow-3px);" onclick="openAddCat()"><div style="font-size:14px; font-weight:bold; color:var(--text-dim); padding: 10px 0;">+ 추가</div></div>`;
}
function selectCat(n, i) { selectedCat = {n, i}; renderCats(); }

function showItemDetail(id) {
    const item = db.find(x => x.id === id); if(!item) return; editingId = id; const c = getCatColor(item.cat); const effAmt = getEffectiveAmt(item);
    document.getElementById('det-icon').innerText = item.icon;
    if(item.dutch && item.dutch.active) {
        document.getElementById('det-amt').innerText = `${(item.type==='in'?'+':'-')} ${effAmt.toLocaleString()}원`; document.getElementById('det-amt-sub').innerText = `(총 결제: ${item.amt.toLocaleString()}원)`; document.getElementById('det-amt-sub').style.display = 'block';
        let dHtml = `<div style="margin-top:20px; background:white; border:none; padding:16px; border-radius:0; text-align:left; box-shadow:var(--pokemon-dialog-shadow); margin:4px;"><div style="font-size:14px; color:var(--text-dim); margin-bottom:12px; font-weight:bold;">정산 현황 (1인당 ${effAmt.toLocaleString()}원)</div>`;
        item.dutch.settled.forEach((isSettled, i) => { dHtml += `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:3px dashed var(--border-heavy);" onclick="toggleDutchSettled(${item.id}, ${i})"><span style="font-size:18px; color:${isSettled?'var(--text-dim)':'var(--text-main)'}; font-weight:bold; text-decoration:${isSettled?'line-through':'none'};">친구 ${i+1}</span><div style="width:28px; height:28px; border-radius:0; border:none; background:${isSettled?'var(--text-main)':'white'}; display:flex; align-items:center; justify-content:center; color:white; font-size:18px; box-shadow:${isSettled?'none':'var(--shadow-3px)'}; margin:3px;">${isSettled?'✔':''}</div></div>`; });
        dHtml += `</div>`; document.getElementById('det-dutch-area').innerHTML = dHtml;
    } else { document.getElementById('det-amt').innerText = `${(item.type==='in'?'+':'-')} ${item.amt.toLocaleString()}원`; document.getElementById('det-amt-sub').style.display = 'none'; document.getElementById('det-dutch-area').innerHTML = ''; }
    document.getElementById('det-amt').style.color = item.type==='in'?'var(--accent-green)':'var(--text-main)'; document.getElementById('det-cat').innerText = item.cat; document.getElementById('det-cat').style.background = c.bg; document.getElementById('det-cat').style.color = c.text; document.getElementById('det-date').innerText = formatDateWithDay(item.date); document.getElementById('det-memo').innerText = item.memo || '메모 없음';
    
    if(item.type === 'ex') { const payStr = (item.payment === 'card') ? '신용 카드 💳' : '현금 (체크) 💵'; document.getElementById('det-payment').innerText = `결제 수단: ${payStr}`; document.getElementById('det-payment').style.display = 'block'; } else { document.getElementById('det-payment').style.display = 'none'; }
    showScreen('screen-detail');
}

function toggleDutchSettled(id, index) { const idx = db.findIndex(x => x.id === id); if(idx > -1) { db[idx].dutch.settled[index] = !db[idx].dutch.settled[index]; localStorage.setItem('ledger_v31', JSON.stringify(db)); showItemDetail(id); } }

function initiateEdit() {
    const item = db.find(x => x.id === editingId); if(!item) return; inputMode = item.type; inputAmt = String(item.amt); selectedCat = {n: item.cat, i: item.icon}; document.getElementById('memo-input').value = item.memo || ''; document.getElementById('date-input').value = item.date; document.getElementById('repeat-toggle').className = 'switch' + (item.repeat ? ' on' : ''); 
    inputPaymentMethod = item.payment || 'card'; setPaymentMethod(inputPaymentMethod);
    if(item.dutch && item.dutch.active) { isDutch = true; dutchPeople = item.dutch.people; document.getElementById('dutch-toggle').className = 'switch on'; document.getElementById('dutch-people-row').style.display = 'flex'; document.getElementById('dutch-people-count').innerText = dutchPeople; }
    setInputMode(inputMode); document.getElementById('amt-display').innerText = Number(inputAmt).toLocaleString() + '원'; showScreen('screen-input'); blurAmount(); 
}

function handleDeleteRequest() { 
    const item = db.find(x => x.id === editingId);
    if(item && item.groupId) { const modal = document.getElementById('modal-overlay'); modal.style.display = 'flex'; document.getElementById('btn-only-one').onclick = (e) => { e.stopPropagation(); deleteItem(editingId, false); hideModal(); }; document.getElementById('btn-all-future').onclick = (e) => { e.stopPropagation(); deleteItem(editingId, true); hideModal(); }; } 
    else { if(confirm("정말 이 내역을 삭제하시겠습니까?")) { deleteItem(editingId, false); } }
}
function hideModal() { document.getElementById('modal-overlay').style.display = 'none'; }
function deleteItem(id, allGroup) { if(allGroup) { const item = db.find(x => x.id === id); db = db.filter(x => x.groupId !== item.groupId); } else { db = db.filter(x => x.id !== id); } localStorage.setItem('ledger_v31', JSON.stringify(db)); if(document.getElementById('tab-ledger').classList.contains('active')) { showScreen('screen-ledger'); renderLedger(); } else { showScreen('screen-tama'); } renderTama(); }

function openSettings() { document.getElementById('settings-overlay').style.display = 'flex'; }
function closeSettings() { document.getElementById('settings-overlay').style.display = 'none'; }

function exportData() {
    const backupData = {
        ledger_v31: db,
        budget_v31: budget,
        ledger_cats_v39: cats,
        pokemon_state_v68: tamaState
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `가계부_데이터백업_${getTodayDateStr()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    closeSettings();
    updateBattleMessage('데이터 백업이 완료되었습니다.');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if(imported.ledger_v31) localStorage.setItem('ledger_v31', JSON.stringify(imported.ledger_v31));
            if(imported.budget_v31) localStorage.setItem('budget_v31', JSON.stringify(imported.budget_v31));
            if(imported.ledger_cats_v39) localStorage.setItem('ledger_cats_v39', JSON.stringify(imported.ledger_cats_v39));
            if(imported.pokemon_state_v68) localStorage.setItem('pokemon_state_v68', JSON.stringify(imported.pokemon_state_v68));
            
            alert('데이터가 성공적으로 복원되었습니다. 앱을 새로고침합니다.');
            location.reload(); 
        } catch (error) {
            alert('잘못된 백업 파일입니다.');
        }
    };
    reader.readAsText(file);
}

let selectedPokedexId = null;

function getPokemonInfo(id) {
    if (basePool.includes(id)) return { level: 1, base: id, xp: 30 };
    if ([134, 135, 136].includes(id)) return { level: 2, base: 133, xp: 100 }; 
    for (let base in evoMap) {
        const evos = evoMap[base];
        if (evos[0] === id) return { level: 2, base: Number(base), xp: 100 };
        if (evos[1] === id) return { level: 3, base: Number(base), xp: 300 };
    }
    return { level: 1, base: id, xp: 30 }; 
}

function openPokedexModal(id) {
    selectedPokedexId = id;
    const info = getPokemonInfo(id);
    const isLegendary = groupE.includes(id) || (tamaState.eggHatchCount > 0 && tamaState.eggHatchCount % 7 === 0);
    
    document.getElementById('pd-modal-name').innerText = pokeNames[id];
    document.getElementById('pd-modal-level').innerText = `진화 단계 : Lv.${info.level}`;
    
    const gifSrc = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${isLegendary?'shiny/':''}${id}.gif`;
    document.getElementById('pd-modal-img').src = gifSrc;
    
    document.getElementById('pokedex-modal').style.display = 'flex';
}

function closePokedexModal() {
    document.getElementById('pokedex-modal').style.display = 'none';
}

function changeActivePokemon() {
    if(!selectedPokedexId) return;
    
    const info = getPokemonInfo(selectedPokedexId);
    
    tamaState.currentPokemonId = selectedPokedexId;
    tamaState.basePokemonId = info.base;
    tamaState.level = info.level;
    tamaState.xp = info.xp; 
    tamaState.name = pokeNames[selectedPokedexId];
    tamaState.nameChanged = false; 
    
    saveTamaState();
    closePokedexModal();
    
    switchTab('tama');
    updateBattleMessage(`가라! ${tamaState.name}, 널(를) 정했다!`);
}

function renderPokedex() {
    const grid = document.getElementById('pokedex-grid');
    grid.innerHTML = '';
    const unlockedList = tamaState.pokedex || [];
    
    document.getElementById('dex-count').innerText = unlockedList.length;

    for (let i = 1; i <= 151; i++) {
        const isUnlocked = unlockedList.includes(i);
        const imgClass = isUnlocked ? 'dex-img' : 'dex-img dex-unknown';
        const nameText = isUnlocked ? pokeNames[i] : '???';
        
        const imgSrc = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${i}.png`;
        
        grid.innerHTML += `
            <div class="dex-item" style="cursor: ${isUnlocked ? 'pointer' : 'default'};" ${isUnlocked ? `onclick="openPokedexModal(${i})"` : ''}>
                <span class="dex-num">No.${String(i).padStart(3, '0')}</span>
                <img src="${imgSrc}" class="${imgClass}" loading="lazy">
                ${isUnlocked ? `<div class="dex-name">${nameText}</div>` : ''}
            </div>
        `;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (tamaState.currentPokemonId && (!tamaState.pokedex || !tamaState.pokedex.includes(tamaState.currentPokemonId))) {
        if (!tamaState.pokedex) tamaState.pokedex = [];
        tamaState.pokedex.push(tamaState.currentPokemonId);
        saveTamaState();
    }
});

window.onload = () => { 
    checkStreakBreakAndCleanup();
    checkDailyCandy(); 
    renderTama(); 
    renderLedger(); 
    setInterval(renderTama, 60000); 
    document.querySelectorAll('.scroll-container').forEach(container => { 
        container.addEventListener('scroll', function() { 
            this.classList.add('is-scrolling'); 
            clearTimeout(scrollTimeout); 
            scrollTimeout = setTimeout(() => { this.classList.remove('is-scrolling'); }, 2000); 
        }); 
    });
    const ledgerScreen = document.getElementById('screen-ledger'); 
    let touchStartX = 0; let touchStartY = 0;
    ledgerScreen.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, {passive: true});
    ledgerScreen.addEventListener('touchend', e => { 
        if(e.target.closest('.filter-bar')) return; 
        const deltaX = e.changedTouches[0].screenX - touchStartX; 
        const deltaY = e.changedTouches[0].screenY - touchStartY; 
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) { 
            if (deltaX > 0) moveMonth(-1); else moveMonth(1); 
        } 
    });
};
