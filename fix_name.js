/**
 * スプレッドシートの補助金名を修正するスクリプト
 * Apps Scriptエディタで実行してください
 */

function fixSubsidyNameInSheet() {
    const ss = SpreadsheetApp.openById('15kskYhjvdELGRoqtWbf75cuxNdhHDMytysRX98mpVpE');
    const sheet = ss.getSheetByName('シート2');

    if (!sheet) {
        Logger.log('シート2が見つかりません');
        return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const nameColIndex = headers.indexOf('事業名');

    if (nameColIndex === -1) {
        Logger.log('事業名列が見つかりません');
        return;
    }

    let updatedCount = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i][nameColIndex] === '就農開始資金') {
            sheet.getRange(i + 1, nameColIndex + 1).setValue('就農準備資金');
            updatedCount++;
        }
    }

    Logger.log(`${updatedCount}件の補助金名を更新しました`);
}
