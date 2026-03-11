// 補助金検索・マッチング用ロジック (Code.js)

// 1. スプレッドシートから全データを取得
function getAllSubsidies() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("シート2"); // データが入っているシート名
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map((row, i) => {
    const obj = { id: i + 1 };
    headers.forEach((h, j) => {
      obj[h] = row[j];
    });
    return obj;
  });
}

// 2. キーワード検索とスコアリング
function searchSubsidies(query, userData) {
  const subsidies = getAllSubsidies();
  const q = query ? query.toLowerCase() : "";
  
  const results = subsidies.map(s => {
    let score = 0;
    let matchReason = "";
    
    // 基本フィルタ（除外）
    if (s["対象年齢"] && s["対象年齢"].includes("歳未満")) {
      const limit = parseInt(s["対象年齢"].replace(/[^0-9]/g, ""));
      if (userData.age >= limit) return null;
    }
    
    if (s["対象世帯所得"] && s["対象世帯所得"].includes("以下")) {
      const limit = parseInt(s["対象世帯所得"].replace(/[^0-9]/g, ""));
      if (userData.income > limit) return null;
    }

    // A. キーワードマッチ (高スコア)
    const name = (s["事業名"] || "").toLowerCase();
    const overview = (s["事業の概要等"] || "").toLowerCase();
    const keywords = (s["キーワード"] || "").toLowerCase();
    
    if (q) {
      if (name.includes(q)) {
        score += 100;
        matchReason = "事業名に一致";
      } else if (keywords.includes(q)) {
        score += 80;
        matchReason = "キーワードに一致";
      } else if (overview.includes(q)) {
        score += 50;
        matchReason = "概要に一致";
      }
    }

    // B. ニーズマッチ (ベーススコア)
    const virtualCat = getVirtualBigCategory_(s);
    const needToCatMap = {
      'training': "1. 農業を始めたい・学びたい",
      'machinery': "2. 機械や施設をそろえたい",
      'funding': "3. 資金確保・融資",
      'expansion': "5. 今の経営を強く・安定させたい",
      'crops': "6. 作目（育てるもの）を極めたい",
      'environment': "7. 自然や地域を守りたい"
    };

    if (userData.needs && userData.needs.length > 0) {
      userData.needs.forEach(need => {
        if (virtualCat === needToCatMap[need]) {
          score += 30;
          if (!matchReason) matchReason = "ニーズに合致";
        }
      });
    }

    // 検索ワードなしの場合は、ニーズ合致のみを基準にする
    if (!q && score === 0) return null;
    if (q && score === 0) return null; 

    return {
      id: s["補助金ID"] || s["ID"] || s.id,
      name: s["事業名"],
      score: score,
      matchReason: matchReason,
      overview: (s["事業の概要等"] || "").substring(0, 100) + "..."
    };
  }).filter(r => r !== null);
  
  return results.sort((a, b) => b.score - a.score).slice(0, 15);
}

// 旧関数の互換性維持
function getMatchedSubsidies(userData) {
  return searchSubsidies("", userData);
}

// 仮想大カテゴリー判定（ロジック統一）
function getVirtualBigCategory_(s) {
  const big = s["大項目"] || "";
  const middle = s["中項目"] || "";
  const small = s["小項目"] || "";
  const overview = s["事業の概要等"] || "";

  if (big === '新規就農' || middle.includes('研修') || middle.includes('体験') || middle.includes('相談')) return "1. 農業を始めたい・学びたい";
  if (middle.includes('機械') || small.includes('機械') || middle.includes('施設') || small.includes('施設') || overview.includes('設備') || overview.includes('スマート')) return "2. 機械や施設をそろえたい";
  if (middle.includes('資金') || small.includes('資金') || big.includes('融資') || overview.includes('融資')) return "3. 資金確保・融資";
  if (big.includes('6次産業化') || big.includes('加工') || big.includes('販路')) return "4. 売る場所や新商品を作りたい";
  if (big === '担い手' || big === '経営安定' || middle.includes('雇用')) return "5. 今の経営を強く・安定させたい";
  if (['野菜', '果樹', '畜産', '水田営農'].some(t => big.includes(t))) return "6. 作目（育てるもの）を極めたい";
  return "7. 自然や地域を守りたい";
}

function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('農業補助金ナビ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getSubsidyDetailById(id) {
  const subsidies = getAllSubsidies();
  const target = subsidies.find(s => String(s["補助金ID"] || s["ID"] || s.id) === String(id));
  if (!target) return null;
  
  return {
    name: target["事業名"],
    amountText: target["補助金額"],
    targetAge: target["対象年齢"],
    overview: target["事業の概要等"],
    dept: target["担当部所"],
    tel: target["電話番号"],
    pdfPage: target["PDFページ"]
  };
}
