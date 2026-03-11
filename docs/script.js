
// データ保持用グローバル変数
let allSubsidies = [];
let idxMap = {};

// ログ用変数
let log = {
    startTime: new Date(),
    transitions: 0,
    viewedNames: [],
    matchedCount: 0,
    needs: []
};

// UI状態
let currentTab = 0;
let userData = {};
let categoryHierarchy = {};
let selectedBigCategory = "";

// ページ読み込み時にCSVを取得
window.onload = async function () {
    try {
        await loadCsvData();
        console.log("Data Loaded:", allSubsidies.length, "rows");
    } catch (e) {
        console.error("Failed to load CSV", e);
        document.getElementById('subsidy-list').innerHTML = '<p style="color:red">データの読み込みに失敗しました。</p>';
    }
};

async function loadCsvData() {
    const response = await fetch('./data.csv');
    const text = await response.text();
    parseCsv(text);
}

function parseCsv(text) {
    const lines = text.trim().split(/\r\n|\n/);
    if (lines.length === 0) return;

    // ヘッダー解析
    const headers = lines[0].split(',').map(h => h.trim());
    headers.forEach((h, i) => idxMap[h] = i);

    // データ解析
    // CSVのパースは簡易的にカンマ区切りで行いますが、
    // 本来はダブルクォート内のカンマなどを考慮する必要があります。
    // 今回は簡易実装とします。
    // もしデータにカンマが含まれる場合は、ちゃんとしたCSVパーサライブラリが必要です。
    // ここではダブルクォートで囲まれたセルのカンマ対策を含む簡易パーサを使います。

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (row.length < headers.length) continue;
        allSubsidies.push(row);
    }
}

// 堅牢なCSV行パーサ
function parseCsvLine(line) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = "";
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}

// --- 以下、Code.jsからの移植ロジック ---

function getVirtualBigCategory_(row) {
    const big = String(row[idxMap['大項目']] || '');
    const middle = String(row[idxMap['中項目']] || '');
    const small = String(row[idxMap['小項目']] || '');
    const overview = String(row[idxMap['事業の概要等']] || '');

    if (big === '新規就農' || middle.includes('研修') || middle.includes('体験') || middle.includes('相談')) {
        return "1. 農業を始めたい・学びたい";
    }
    if (middle.includes('機械') || small.includes('機械') || middle.includes('施設') || small.includes('施設') || small.includes('ハウス') || overview.includes('設備') || overview.includes('スマート')) {
        return "2. 機械や施設をそろえたい";
    }
    if (middle.includes('資金') || small.includes('資金') || big.includes('融資') || overview.includes('融資') || middle.includes('利子')) {
        return "3. 資金確保・融資";
    }
    if (big.includes('6次産業化') || big.includes('加工') || big.includes('販路') || big.includes('地産地消') || big.includes('輸出')) {
        return "4. 売る場所や新商品を作りたい";
    }
    if (big === '担い手' || big === '経営安定' || middle.includes('雇用') || middle.includes('法人化')) {
        return "5. 今の経営を強く・安定させたい";
    }
    if (['野菜', '果樹', '畜産', '水田営農', '園芸等', '家畜衛生'].some(t => big.includes(t))) {
        return "6. 作目（育てるもの）を極めたい";
    }
    return "7. 自然や地域を守りたい";
}

// キーワード検索をサポートするマッチング実行
function getMatchedSubsidies(query, user) {
    const results = [];
    const q = query ? query.toLowerCase() : "";

    allSubsidies.forEach((row, i) => {
        // 除外処理
        const ageText = String(row[idxMap['対象年齢']] || '');
        if (ageText.includes('50歳未満') && user.age >= 50) return;
        if (ageText.includes('45歳未満') && user.age >= 45) return;

        const incomeText = String(row[idxMap['対象世帯所得']] || '');
        if (incomeText.includes('以下')) {
            const limit = parseInt(incomeText.replace(/[^0-9]/g, '')) || 9999;
            if (user.income > limit) return;
        }

        let score = 0;
        let matchReason = "";

        // キーワード検索 (高優先度)
        const name = String(row[idxMap['事業名']] || "").toLowerCase();
        const overview = String(row[idxMap['事業の概要等']] || "").toLowerCase();
        const keywordCol = String(row[idxMap['キーワード']] || "").toLowerCase();

        if (q) {
            if (name.includes(q)) {
                score += 100;
                matchReason = "事業名に一致";
            } else if (keywordCol.includes(q)) {
                score += 80;
                matchReason = "キーワードに一致";
            } else if (overview.includes(q)) {
                score += 50;
                matchReason = "概要に一致";
            }
        }

        // ニーズによるマッチング
        const virtualCat = getVirtualBigCategory_(row);
        const needToCatMap = {
            'training': "1. 農業を始めたい・学びたい",
            'machinery': "2. 機械や施設をそろえたい",
            'funding': "3. 資金確保・融資",
            'expansion': "5. 今の経営を強く・安定させたい",
            'crops': "6. 作目（育てるもの）を極めたい",
            'environment': "7. 自然や地域を守りたい"
        };

        if (user.needs) {
            user.needs.forEach(need => {
                if (virtualCat === needToCatMap[need]) {
                    score += 30;
                    if (!matchReason) matchReason = "ニーズに合致";
                }
            });
        }

        if (score > 0 || !q) {
            results.push({
                id: row[idxMap['補助金ID']] || row[idxMap['ID']] || (i + 2),
                name: row[idxMap['事業名']],
                matchScore: score,
                matchReason: matchReason,
                overview: String(row[idxMap['事業の概要等']] || '').substring(0, 100) + '...'
            });
        }
    });

    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 15);
}

// 階層データ取得
function getHierarchicalCategories(user) {
    const hierarchy = {};

    allSubsidies.forEach(row => {
        // 除外
        const ageText = String(row[idxMap['対象年齢']] || '');
        if (ageText.includes('50歳未満') && user.age >= 50) return;

        const big = getVirtualBigCategory_(row);
        const mid = String(row[idxMap['中項目']] || 'その他').trim();

        if (!hierarchy[big]) hierarchy[big] = new Set();
        hierarchy[big].add(mid);
    });

    const result = {};
    Object.keys(hierarchy).sort().forEach(big => {
        result[big] = Array.from(hierarchy[big]).sort();
    });
    return result;
}

function getSubsidiesByHierarchicalCategory(big, mid, user) {
    const results = [];

    allSubsidies.forEach((row, i) => {
        if (getVirtualBigCategory_(row) !== big) return;
        if (String(row[idxMap['中項目']]).trim() !== mid) return;

        const ageText = String(row[idxMap['対象年齢']] || '');
        if (ageText.includes('50歳未満') && user.age >= 50) return;

        results.push({
            id: row[idxMap['補助金ID']] || (i + 2),
            name: row[idxMap['事業名']],
            amountText: row[idxMap['補助金額']] || ''
        });
    });

    return results;
}

function getSubsidyDetailById(id) {
    const targetId = String(id);
    for (let i = 0; i < allSubsidies.length; i++) {
        const row = allSubsidies[i];
        const rowId = String(row[idxMap['補助金ID']] || (i + 2));
        if (rowId === targetId) {
            return {
                name: row[idxMap['事業名']],
                amountText: row[idxMap['補助金額']],
                targetAge: row[idxMap['対象年齢']],
                overview: row[idxMap['事業の概要等']],
                dept: row[idxMap['担当部所']],
                tel: row[idxMap['電話番号']],
                bigCategory: getVirtualBigCategory_(row),
                pdfPage: row[idxMap['PDFページ']]
            };
        }
    }
    return null;
}

// --- UI操作関数（index.htmlから呼ばれる） ---

function switchTab(index) {
    currentTab = index;
    const container = document.getElementById('tabs-container');
    container.style.transform = `translateX(-${index * 25}%)`;
    document.querySelectorAll('.tab-button').forEach((b, i) => b.classList.toggle('active', i === index));
    window.scrollTo(0, 0);
}

function prevTab() { if (currentTab > 0) switchTab(currentTab - 1); }
function nextTab() { if (currentTab < 3) switchTab(currentTab + 1); }

function startMatching() {
    userData = {
        age: parseInt(document.getElementById('user-age').value) || 99,
        certified: document.getElementById('user-certified').value,
        income: parseInt(document.getElementById('user-income').value) || 0,
        needs: Array.from(document.querySelectorAll('#needs-list input:checked')).map(c => c.value)
    };
    const query = document.getElementById('search-query').value;

    document.getElementById('matched-results').innerHTML = '<div style="text-align:center; padding:1rem;">補助金をAIが検索中...</div>';
    document.getElementById('recommend-container').style.display = 'block';

    // 同期的に実行（データは既にメモリにあるため）
    const results = getMatchedSubsidies(query, userData);
    showMatched(results);

    // 階層カテゴリーを取得
    categoryHierarchy = getHierarchicalCategories(userData);
    renderBigCategories();
}

function showMatched(results) {
    const container = document.getElementById('matched-results');
    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:1rem;">キーワードや条件に合う補助金が見つかりませんでした。<br>別の言葉で試してみてください。</p>';
        return;
    }

    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'subsidy-item';
        div.style.background = 'white'; 
        div.style.padding = '1.2rem'; 
        div.style.borderRadius = '12px'; 
        div.style.marginBottom = '0.8rem';
        div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
        
        const reasonTag = item.matchReason ? `<span style="background:var(--secondary-color); color:white; font-size:0.7rem; padding:0.2rem 0.6rem; border-radius:10px; margin-left:0.5rem; vertical-align:middle;">${item.matchReason}</span>` : '';

        div.innerHTML = `
            <div style="font-weight:bold; color:var(--primary-color); font-size:1.1rem;">
                ${item.name} ${reasonTag}
            </div>
            <div style="font-size:0.9rem; color:#666; margin-top:0.5rem; line-height:1.4;">${item.overview}</div>
        `;
        div.onclick = () => openDetail(item.id);
        container.appendChild(div);
    });

    // 検索結果までスクロール
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBigCategories() {
    selectedBigCategory = "";
    document.getElementById('category-panel-title').innerText = "大カテゴリーを選択";
    document.getElementById('search-breadcrumb').innerHTML = '<span class="active">大カテゴリー</span>';
    document.getElementById('back-to-big-container').style.display = 'none';

    const container = document.getElementById('category-container');
    container.innerHTML = '';

    Object.keys(categoryHierarchy).sort().forEach(big => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.innerText = big;
        btn.onclick = () => selectBigCategory(big);
        container.appendChild(btn);
    });
}

function selectBigCategory(big) {
    selectedBigCategory = big;
    document.getElementById('category-panel-title').innerText = "中カテゴリーを選択";
    document.getElementById('search-breadcrumb').innerHTML = `<span>大：${big}</span> 〉 <span class="active">中カテゴリー</span>`;
    document.getElementById('back-to-big-container').style.display = 'block';

    const container = document.getElementById('category-container');
    container.innerHTML = '';

    const mids = categoryHierarchy[big] || [];
    mids.forEach(mid => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.style.borderColor = 'var(--secondary-color)';
        btn.style.color = 'var(--secondary-color)';
        btn.innerText = mid;
        btn.onclick = () => selectMidCategory(mid);
        container.appendChild(btn);
    });
}

function selectMidCategory(mid) {
    document.getElementById('subsidy-list-title').innerText = `${selectedBigCategory} 〉 ${mid}`;
    switchTab(2);

    const list = getSubsidiesByHierarchicalCategory(selectedBigCategory, mid, userData);
    const container = document.getElementById('subsidy-list');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p>該当する補助金がありません。</p>';
        return;
    }
    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'subsidy-item';
        div.innerHTML = `
            <div style="font-weight:bold;">${item.name}</div>
            <div style="color:var(--secondary-color); font-weight:bold;">${item.amountText}</div>
        `;
        div.onclick = () => openDetail(item.id);
        container.appendChild(div);
    });
}

function openDetail(id) {
    const data = getSubsidyDetailById(id);
    if (!data) return;

    document.getElementById('detail-name').innerText = data.name;
    document.getElementById('detail-body').innerHTML = `
        <div class="detail-section" style="background:#f9f9f9; padding:1rem; border-radius:8px;">
            <p><strong>補助金額:</strong> <span style="color:var(--secondary-color); font-weight:bold;">${data.amountText}</span></p>
            <p><strong>対象年齢:</strong> ${data.targetAge || '制限なし'}</p>
            <p><strong>大項目:</strong> ${data.bigCategory}</p>
        </div>
        <h3>事業概要</h3>
        <p>${data.overview}</p>
        <h3>お問い合わせ</h3>
        <p>${data.dept} (${data.tel})</p>
        ${data.pdfPage ? `<p style="color:#666; font-size:0.9rem;">※ガイドブック ${data.pdfPage}P参照</p>` : ''}
    `;
    switchTab(3);
}
