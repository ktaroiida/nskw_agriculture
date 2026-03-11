/**
 * スプレッドシートに直接アクセスして補助金名を修正
 */

function fixSubsidyName() {
    const ss = SpreadsheetApp.openById('15kskYhjvdELGRoqtWbf75cuxNdhHDMytysRX98mpVpE');
    const sheet = ss.getSheetByName('シート2');

    if (!sheet) {
        Logger.log('エラー: シート2が見つかりません');
        return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const nameColIndex = headers.indexOf('事業名');

    if (nameColIndex === -1) {
        Logger.log('エラー: 事業名列が見つかりません');
        return;
    }

    let updatedCount = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i][nameColIndex] === '就農開始資金') {
            sheet.getRange(i + 1, nameColIndex + 1).setValue('就農準備資金');
            updatedCount++;
            Logger.log(`行${i + 1}: 就農開始資金 → 就農準備資金`);
        }
    }

    Logger.log(`完了: ${updatedCount}件の補助金名を更新しました`);
}
