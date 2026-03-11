# GASプロジェクトの更新手順

## 方法1: スプレッドシートから直接編集

1. スプレッドシートを開く
   https://docs.google.com/spreadsheets/d/15kskYhjvdELGRoqtWbf75cuxNdhHDMytysRX98mpVpE/edit

2. メニューから「拡張機能」→「Apps Script」をクリック

3. 開いたエディタで：
   - `Code.js` の内容を、ローカルの `Code.js` で全て置き換え
   - `index.html` の内容を、ローカルの `index.html` で全て置き換え

4. 保存後、「デプロイ」→「新しいデプロイ」
   - 種類: ウェブアプリ
   - 実行ユーザー: 自分
   - アクセス: 全員
   - デプロイをクリック

## 方法2: 正しいscriptIdを取得してclasp使用

1. 上記の方法1でApps Scriptエディタを開く
2. URLから scriptId をコピー（例: `https://script.google.com/...projects/XXXXX/edit` の XXXXX 部分）
3. `.clasp.json` の `scriptId` を更新
4. `clasp push` を実行

## 補助金名の修正

スプレッドシート「シート2」で：
- 「就農開始資金」→「就農準備資金」に変更

または、Apps Scriptエディタで以下の関数を実行：
```javascript
function fixName() {
  updateSubsidyName();
}
```
