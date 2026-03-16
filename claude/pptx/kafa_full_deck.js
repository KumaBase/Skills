const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "KAFA / KumaBase";
pres.title = "点群 × BIM ＝ 建設革命！ KAFA Pitch Deck";

const BG = "0A0A0A";
const CYAN = "00FFFF";
const MAGENTA = "FF00FF";
const LIME = "00FF66";
const WHITE = "FFFFFF";
const GRAY_L = "CCCCCC";
const GRAY_M = "AAAAAA";
const GRAY_D = "666666";
const ORANGE = "FF6600";
const NEON_BG = "/Users/yoshidachihiro/project/KB/K社/テイスト/bg_neon_3d.png";
const TOTAL = 12;

function addBottomLine(s) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.1, w: 10, h: 0.025, fill: { color: CYAN } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.17, w: 10, h: 0.015, fill: { color: MAGENTA, transparency: 30 } });
}
function addNum(s, n) {
  s.addText(n + " / " + TOTAL, { x: 9, y: 5.25, w: 0.8, h: 0.3, fontSize: 8, fontFace: "Arial", color: "555555", align: "right", margin: 0 });
}
function sectionSlide(num, sec, title, sub, col) {
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0, w: 0.08, h: 5.625, fill: { color: col } });
  s.addText("0" + sec, { x: 0.8, y: 1.0, w: 2, h: 1.0, fontSize: 72, fontFace: "Arial Black", color: col, bold: true, align: "left", margin: 0, transparency: 30 });
  s.addText(title, { x: 0.8, y: 2.0, w: 8.5, h: 1.2, fontSize: 40, fontFace: "Arial Black", color: WHITE, bold: true, align: "left", margin: 0 });
  s.addText(sub, { x: 0.8, y: 3.3, w: 8.5, h: 0.6, fontSize: 18, fontFace: "Arial", color: GRAY_L, align: "left", margin: 0 });
  addBottomLine(s); addNum(s, num);
  return s;
}

// ============== SLIDE 1: 表紙 ==============
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addImage({ path: NEON_BG, x: -1.0, y: -0.3, w: 6.0, h: 6.2, sizing: { type: "cover", w: 6.0, h: 6.2 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 4.0, y: 0, w: 0.8, h: 5.625, fill: { color: BG, transparency: 60 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 4.8, y: 0, w: 5.2, h: 5.625, fill: { color: BG, transparency: 10 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.25, y: 0.3, w: 0.06, h: 5.0, fill: { color: CYAN } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 0.5, w: 0.04, h: 4.6, fill: { color: MAGENTA } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.48, y: 0.7, w: 0.03, h: 4.2, fill: { color: LIME } });
  s.addText([
    { text: "点群", options: { color: CYAN, bold: true, fontSize: 50, fontFace: "Arial Black" } },
    { text: " × ", options: { color: WHITE, bold: true, fontSize: 44, fontFace: "Arial Black" } },
    { text: "BIM", options: { color: MAGENTA, bold: true, fontSize: 50, fontFace: "Arial Black" } }
  ], { x: 5.2, y: 0.6, w: 4.5, h: 1.0, align: "left", valign: "middle", margin: 0 });
  s.addText([
    { text: "＝", options: { color: GRAY_M, bold: true, fontSize: 50, fontFace: "Arial Black" } },
    { text: " 建設革命！", options: { color: LIME, bold: true, fontSize: 50, fontFace: "Arial Black" } }
  ], { x: 5.2, y: 1.65, w: 4.5, h: 1.0, align: "left", valign: "middle", margin: 0 });
  s.addText('点群BIMで実現する「現況調査の産業革命」', { x: 5.2, y: 2.95, w: 4.5, h: 0.5, fontSize: 16, fontFace: "Arial", color: GRAY_L, bold: true, align: "left", margin: 0 });
  s.addText("一級建築士が創るBIMデータ ／ 点群計測から3Dモデル作成", { x: 5.2, y: 3.55, w: 4.5, h: 0.4, fontSize: 11, fontFace: "Arial", color: GRAY_M, align: "left", margin: 0 });
  addBottomLine(s);
  s.addText([
    { text: "KAFA", options: { fontSize: 24, bold: true, color: WHITE, fontFace: "Georgia", charSpacing: 10 } },
    { text: "\n", options: { breakLine: true, fontSize: 4 } },
    { text: "KAZUTAKA FUJII ARCHITECTS", options: { fontSize: 8, color: GRAY_M, fontFace: "Arial", charSpacing: 3 } }
  ], { x: 6.8, y: 4.2, w: 2.9, h: 0.7, align: "right", valign: "bottom", margin: 0 });
  s.addText("建設DXアワード 2025", { x: 5.2, y: 4.6, w: 2.5, h: 0.3, fontSize: 9, fontFace: "Arial", color: GRAY_D, align: "left", margin: 0 });
}

// ============== SLIDE 2: 導入ヘッダー ==============
sectionSlide(2, 1, "現場の絶望", '現況を把握できない "昭和の調査"', CYAN);

// ============== SLIDE 3: 導入コンテンツ ==============
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0, w: 0.08, h: 5.625, fill: { color: CYAN } });
  s.addText('現況を把握できない "昭和の調査"', { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial Black", color: CYAN, bold: true, align: "left", margin: 0 });

  const issues = [
    { icon: "✕", title: "図面がない", desc: "既存建物の図面が紛失、\nまたはそもそも存在しない" },
    { icon: "✕", title: "現場と合わない", desc: "増改築を繰り返し、\n図面と実態が乖離" },
    { icon: "✕", title: "手戻りの連鎖", desc: "アナログ調査のミスが\n工期・コストを圧迫" }
  ];
  issues.forEach((item, i) => {
    const x = 0.8 + i * 3.0;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.4, w: 2.7, h: 2.4, fill: { color: "1A1A1A" } });
    s.addText(item.icon, { x: x + 0.2, y: 1.5, w: 0.6, h: 0.6, fontSize: 28, fontFace: "Arial", color: "FF4444", bold: true, align: "center", margin: 0 });
    s.addText(item.title, { x: x + 0.2, y: 2.1, w: 2.3, h: 0.5, fontSize: 18, fontFace: "Arial Black", color: WHITE, bold: true, align: "left", margin: 0 });
    s.addText(item.desc, { x: x + 0.2, y: 2.6, w: 2.3, h: 0.9, fontSize: 12, fontFace: "Arial", color: GRAY_L, align: "left", margin: 0 });
  });

  s.addText("リノベーション需要は増加 → しかし入り口の「調査」だけが昭和のまま", { x: 0.8, y: 4.0, w: 8.5, h: 0.4, fontSize: 14, fontFace: "Arial", color: GRAY_M, align: "left", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.45, w: 8.5, h: 0.45, fill: { color: "1A1A1A" } });
  s.addText("少子高齢化により「作りたくても作れない」未来が迫っている", { x: 1.0, y: 4.45, w: 8.3, h: 0.45, fontSize: 13, fontFace: "Arial", color: "FF6666", bold: true, align: "left", margin: 0 });
  addBottomLine(s); addNum(s, 3);
}

// ============== SLIDE 4: 解決策ヘッダー ==============
sectionSlide(4, 2, "Scan to BIM", "現場を丸ごと、デジタル空間へ転送する", MAGENTA);

// ============== SLIDE 5: 解決策コンテンツ ==============
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0, w: 0.08, h: 5.625, fill: { color: MAGENTA } });
  s.addText("Scan to BIM — 3つのメリット", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial Black", color: MAGENTA, bold: true, align: "left", margin: 0 });

  const bens = [
    { num: "01", title: "コスト削減", desc: "現場往復の回数を激減。\nオフィスからミリ単位で確認可能", color: CYAN },
    { num: "02", title: "ミス撲滅", desc: "点群データで正確な現況把握。\n手戻りをゼロに", color: MAGENTA },
    { num: "03", title: "精緻なモデル化", desc: "施工に使えるBIMを\n一級建築士が監修・作成", color: LIME }
  ];
  bens.forEach((item, i) => {
    const x = 0.8 + i * 3.0;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.4, w: 2.7, h: 2.8, fill: { color: "1A1A1A" } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.4, w: 2.7, h: 0.04, fill: { color: item.color } });
    s.addText(item.num, { x: x + 0.2, y: 1.6, w: 1.0, h: 0.6, fontSize: 32, fontFace: "Arial Black", color: item.color, bold: true, align: "left", margin: 0 });
    s.addText(item.title, { x: x + 0.2, y: 2.2, w: 2.3, h: 0.5, fontSize: 20, fontFace: "Arial Black", color: WHITE, bold: true, align: "left", margin: 0 });
    s.addText(item.desc, { x: x + 0.2, y: 2.8, w: 2.3, h: 1.0, fontSize: 12, fontFace: "Arial", color: GRAY_L, align: "left", margin: 0 });
  });

  // 画像差し替えスペース（プレゼン時は実画像に置換）
  addBottomLine(s); addNum(s, 5);
}

// ============== SLIDE 6: 実績ヘッダー ==============
sectionSlide(6, 3, "圧倒的な成果", "1200万円 → 500万円に。工期1/4・コスト半減", LIME);

// ============== SLIDE 7: 実績コンテンツ ==============
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0, w: 0.08, h: 5.625, fill: { color: LIME } });
  s.addText("実績：工期1/4・コスト半減以下", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 26, fontFace: "Arial Black", color: LIME, bold: true, align: "left", margin: 0 });

  // コスト
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.3, w: 4.2, h: 2.6, fill: { color: "1A1A1A" } });
  s.addText("コスト削減", { x: 1.0, y: 1.4, w: 3.8, h: 0.4, fontSize: 14, fontFace: "Arial", color: GRAY_M, align: "left", margin: 0 });
  s.addText([
    { text: "1,200万", options: { fontSize: 28, color: "FF4444", fontFace: "Arial Black", bold: true } },
    { text: " → ", options: { fontSize: 22, color: GRAY_M, fontFace: "Arial" } },
    { text: "500万", options: { fontSize: 36, color: LIME, fontFace: "Arial Black", bold: true } }
  ], { x: 1.0, y: 1.8, w: 3.8, h: 0.8, align: "left", valign: "middle", margin: 0 });
  s.addText("700万円削減！", { x: 1.0, y: 2.6, w: 3.8, h: 0.5, fontSize: 24, fontFace: "Arial Black", color: CYAN, bold: true, align: "center", margin: 0 });
  s.addText("コスト半減以下を実現", { x: 1.0, y: 3.1, w: 3.8, h: 0.4, fontSize: 12, fontFace: "Arial", color: GRAY_L, align: "center", margin: 0 });

  // 工期
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.3, w: 4.2, h: 2.6, fill: { color: "1A1A1A" } });
  s.addText("工期短縮", { x: 5.4, y: 1.4, w: 3.8, h: 0.4, fontSize: 14, fontFace: "Arial", color: GRAY_M, align: "left", margin: 0 });
  s.addText([
    { text: "1年", options: { fontSize: 28, color: "FF4444", fontFace: "Arial Black", bold: true } },
    { text: " → ", options: { fontSize: 22, color: GRAY_M, fontFace: "Arial" } },
    { text: "3ヶ月", options: { fontSize: 36, color: LIME, fontFace: "Arial Black", bold: true } }
  ], { x: 5.4, y: 1.8, w: 3.8, h: 0.8, align: "left", valign: "middle", margin: 0 });
  s.addText("工期 1/4 に短縮！", { x: 5.4, y: 2.6, w: 3.8, h: 0.5, fontSize: 24, fontFace: "Arial Black", color: CYAN, bold: true, align: "center", margin: 0 });
  s.addText("手戻りゼロで劇的スピードアップ", { x: 5.4, y: 3.1, w: 3.8, h: 0.4, fontSize: 12, fontFace: "Arial", color: GRAY_L, align: "center", margin: 0 });

  s.addText('「点群 × BIM」が、手戻りをゼロにする', { x: 0.8, y: 4.2, w: 8.5, h: 0.5, fontSize: 18, fontFace: "Arial Black", color: WHITE, bold: true, align: "center", margin: 0 });
  addBottomLine(s); addNum(s, 7);
}

// ============== SLIDE 8: 差別化ヘッダー ==============
sectionSlide(8, 4, "なぜKAFAなのか", "一級建築士の品質 × 世界20カ国のネットワーク", ORANGE);

// ============== SLIDE 9: 差別化コンテンツ ==============
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0, w: 0.08, h: 5.625, fill: { color: ORANGE } });
  s.addText("品質は建築士が守り、スピードは世界で生み出す", { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 24, fontFace: "Arial Black", color: ORANGE, bold: true, align: "left", margin: 0 });

  const stats = [
    { number: "100+", unit: "Years", desc: "一級建築士を中心とした\n豊富な設計経験", color: CYAN },
    { number: "1M+", unit: "㎡（100万㎡超）", desc: "累計100万㎡超の\nBIMモデリング実績", color: MAGENTA },
    { number: "20+", unit: "Countries", desc: "世界20カ国以上の\nプロフェッショナルネットワーク", color: LIME }
  ];
  stats.forEach((item, i) => {
    const x = 0.8 + i * 3.0;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.3, w: 2.7, h: 2.4, fill: { color: "1A1A1A" } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.3, w: 2.7, h: 0.04, fill: { color: item.color } });
    s.addText(item.number, { x: x + 0.15, y: 1.5, w: 2.4, h: 0.8, fontSize: 36, fontFace: "Arial Black", color: item.color, bold: true, align: "center", margin: 0 });
    s.addText(item.unit, { x: x + 0.15, y: 2.2, w: 2.4, h: 0.4, fontSize: 14, fontFace: "Arial", color: GRAY_M, align: "center", margin: 0 });
    s.addText(item.desc, { x: x + 0.15, y: 2.7, w: 2.4, h: 0.8, fontSize: 11, fontFace: "Arial", color: GRAY_L, align: "center", margin: 0 });
  });

  // 受賞実績
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.0, w: 8.5, h: 0.8, fill: { color: "1A1A1A" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.0, w: 0.06, h: 0.8, fill: { color: "FFD700" } });
  s.addText([
    { text: "全竹中開発改善大会 協力会社部門 金賞受賞", options: { fontSize: 14, fontFace: "Arial", color: "FFD700", bold: true } },
    { text: "\n", options: { breakLine: true, fontSize: 4 } },
    { text: "竹中工務店様にて点群BIMによる生産性向上を高く評価", options: { fontSize: 11, fontFace: "Arial", color: GRAY_L } }
  ], { x: 1.1, y: 4.0, w: 8.0, h: 0.8, align: "left", valign: "middle", margin: 0 });
  addBottomLine(s); addNum(s, 9);
}

// ============== SLIDE 10: ビジョンヘッダー ==============
sectionSlide(10, 5, "現場の覚醒", '若手を "即戦力" に変える。個人の能力拡張', LIME);

// ============== SLIDE 11: ビジョンコンテンツ ==============
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0, w: 0.08, h: 5.625, fill: { color: LIME } });
  s.addText('現場の "戦闘力" を底上げする', { x: 0.8, y: 0.4, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial Black", color: LIME, bold: true, align: "left", margin: 0 });

  // 3つの変革ポイント
  const pts = [
    { title: "若手 → 即戦力", desc: "点群BIMで経験不足を補い、\n初日から現場を把握できる", color: CYAN },
    { title: "ベテラン\n→ 超効率化", desc: "長年の勘と経験を\nデジタルで最大化", color: MAGENTA },
    { title: "チーム\n→ 全員覚醒", desc: "個人の能力を拡張し、\nプロフェッショナルへ進化", color: LIME }
  ];
  pts.forEach((item, i) => {
    const x = 0.8 + i * 3.0;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.4, w: 2.7, h: 2.2, fill: { color: "1A1A1A" } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.4, w: 2.7, h: 0.04, fill: { color: item.color } });
    s.addText(item.title, { x: x + 0.2, y: 1.6, w: 2.3, h: 0.8, fontSize: 16, fontFace: "Arial Black", color: item.color, bold: true, align: "left", margin: 0 });
    s.addText(item.desc, { x: x + 0.2, y: 2.5, w: 2.3, h: 0.8, fontSize: 12, fontFace: "Arial", color: GRAY_L, align: "left", margin: 0 });
  });

  // メッセージ
  s.addShape(pres.shapes.RECTANGLE, { x: 1.5, y: 3.9, w: 7.0, h: 0.9, fill: { color: "1A1A1A" } });
  s.addText([
    { text: "点群BIM", options: { color: CYAN, fontSize: 18, fontFace: "Arial Black", bold: true } },
    { text: "という武器で、建築現場はもっと", options: { color: WHITE, fontSize: 16, fontFace: "Arial" } },
    { text: "強く、速く、安全に。", options: { color: LIME, fontSize: 18, fontFace: "Arial Black", bold: true } }
  ], { x: 1.5, y: 3.9, w: 7.0, h: 0.9, align: "center", valign: "middle", margin: 0 });
  addBottomLine(s); addNum(s, 11);
}

// ============== SLIDE 12: 結び（クロージング）==============
{
  const s = pres.addSlide();
  s.background = { color: BG };

  // ネオン3D画像を薄く背景に
  s.addImage({ path: NEON_BG, x: 0, y: 0, w: 10, h: 5.625, sizing: { type: "cover", w: 10, h: 5.625 }, transparency: 70 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: "000000", transparency: 25 } });

  // From Black to Rainbow
  s.addText("06", { x: 0.8, y: 0.2, w: 2, h: 0.8, fontSize: 48, fontFace: "Arial Black", color: CYAN, bold: true, align: "left", margin: 0, transparency: 40 });

  s.addText("From Black to Rainbow", {
    x: 0.5, y: 0.9, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Arial Black", color: WHITE, bold: true, align: "center", margin: 0
  });

  s.addText("業界をブラックから、ホワイト、その先へ", {
    x: 0.5, y: 1.7, w: 9, h: 0.5,
    fontSize: 18, fontFace: "Arial", color: GRAY_L, bold: true, align: "center", margin: 0
  });

  // レインボーバー（6色）
  const rainbow = [CYAN, "0066FF", MAGENTA, "FF4444", ORANGE, LIME];
  rainbow.forEach((c, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 1.5 + i * (7.0 / 6), y: 2.35, w: 7.0 / 6, h: 0.06,
      fill: { color: c }
    });
  });

  // メッセージ
  s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 2.6, w: 8.0, h: 1.3, fill: { color: "111111", transparency: 30 } });
  s.addText([
    { text: "つらいだけの業界ではなく、", options: { fontSize: 15, fontFace: "Arial", color: GRAY_L } },
    { text: "\n", options: { breakLine: true, fontSize: 6 } },
    { text: "多様な働き方やキャリアが輝く業界へ。", options: { fontSize: 17, fontFace: "Arial Black", color: WHITE, bold: true } },
    { text: "\n", options: { breakLine: true, fontSize: 6 } },
    { text: "KAFAと共に、レインボーな未来を一緒に作りませんか？", options: { fontSize: 15, fontFace: "Arial", color: CYAN } }
  ], { x: 1.0, y: 2.6, w: 8.0, h: 1.3, align: "center", valign: "middle", margin: 0 });

  // KAFAロゴ（CTAと離す）
  s.addText([
    { text: "KAFA", options: { fontSize: 26, bold: true, color: WHITE, fontFace: "Georgia", charSpacing: 12 } },
    { text: "\n", options: { breakLine: true, fontSize: 4 } },
    { text: "KAZUTAKA FUJII ARCHITECTS", options: { fontSize: 9, color: GRAY_M, fontFace: "Arial", charSpacing: 3 } }
  ], { x: 2.5, y: 4.3, w: 5.0, h: 0.6, align: "center", valign: "bottom", margin: 0 });

  addBottomLine(s); addNum(s, 12);
}

pres.writeFile({ fileName: "/Users/yoshidachihiro/project/KB/K社/KAFA_pitch_deck.pptx" })
  .then(() => console.log("DONE"))
  .catch(err => console.error("ERROR:", err));
