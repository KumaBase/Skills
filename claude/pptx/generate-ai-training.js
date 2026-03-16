const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
  FaComments, FaHandshake, FaSeedling, FaSmile,
  FaLightbulb, FaQuestionCircle, FaSyncAlt, FaPaperPlane,
  FaCheckCircle, FaTimesCircle, FaExclamationCircle,
  FaHeart, FaArrowRight, FaUserFriends, FaBrain,
  FaSearch, FaCogs, FaPencilAlt, FaClipboardList,
  FaRobot, FaFlag,
} = require("react-icons/fa");

function renderIconSvg(IC, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IC, { color, size: String(size) })
  );
}
async function iconToBase64Png(IC, color, size = 256) {
  const svg = renderIconSvg(IC, color, size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

const C = {
  teal: "2B6777", tealDk: "1D4E5C", tealLt: "52AB98",
  amber: "E8985E", amberLt: "FDF0E6",
  cream: "FAF8F5", text: "3D3D3D", textLt: "6B7280",
  white: "FFFFFF", cardBg: "FFFFFF", headerBg: "2B6777",
  grayLine: "E5E0DA", coral: "E07A5F", green: "81B29A",
};
const FONT = "Noto Sans JP Bold";
const mkShadow = () => ({ type: "outer", blur: 4, offset: 2, angle: 135, color: "000000", opacity: 0.06 });

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "AI研修";
  pres.title = "AI研修 第1回 AIと仲良くなる";

  // Pre-render icons (white)
  const iComW = await iconToBase64Png(FaComments, "#FFFFFF");
  const iSmileW = await iconToBase64Png(FaSmile, "#FFFFFF");
  const iBulbW = await iconToBase64Png(FaLightbulb, "#FFFFFF");
  const iQuesW = await iconToBase64Png(FaQuestionCircle, "#FFFFFF");
  const iSyncW = await iconToBase64Png(FaSyncAlt, "#FFFFFF");
  const iPlaneW = await iconToBase64Png(FaPaperPlane, "#FFFFFF");
  const iHandW = await iconToBase64Png(FaHandshake, "#FFFFFF");
  const iBrainW = await iconToBase64Png(FaBrain, "#FFFFFF");
  const iSeedW = await iconToBase64Png(FaSeedling, "#FFFFFF");
  const iUserW = await iconToBase64Png(FaUserFriends, "#FFFFFF");
  const iSearchW = await iconToBase64Png(FaSearch, "#FFFFFF");
  const iCogW = await iconToBase64Png(FaCogs, "#FFFFFF");
  const iPenW = await iconToBase64Png(FaPencilAlt, "#FFFFFF");
  const iClipW = await iconToBase64Png(FaClipboardList, "#FFFFFF");
  const iRobotW = await iconToBase64Png(FaRobot, "#FFFFFF");
  const iFlagW = await iconToBase64Png(FaFlag, "#FFFFFF");
  const iHeartW = await iconToBase64Png(FaHeart, "#FFFFFF");
  const iArrowW = await iconToBase64Png(FaArrowRight, "#FFFFFF");
  const iExclW = await iconToBase64Png(FaExclamationCircle, "#FFFFFF");
  // Colored icons (for light backgrounds)
  const iComT = await iconToBase64Png(FaComments, "#2B6777");
  const iQuesR = await iconToBase64Png(FaQuestionCircle, "#E07A5F");
  const iCheckG = await iconToBase64Png(FaCheckCircle, "#81B29A");
  const iTimesR = await iconToBase64Png(FaTimesCircle, "#E07A5F");
  const iExclA = await iconToBase64Png(FaExclamationCircle, "#E8985E");

  // ============ HELPERS ============
  function addHeader(s, title, icon, num) {
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.95, fill: { color: C.headerBg } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.95, w: 10, h: 0.04, fill: { color: C.amber } });
    if (icon) {
      s.addShape(pres.shapes.OVAL, { x: 0.35, y: 0.175, w: 0.6, h: 0.6, fill: { color: C.tealLt } });
      s.addImage({ data: icon, x: 0.45, y: 0.275, w: 0.4, h: 0.4 });
    }
    s.addText(title, {
      x: icon ? 1.15 : 0.5, y: 0.15, w: icon ? 7.8 : 8.5, h: 0.65,
      fontSize: 17, fontFace: FONT, color: C.white,
      bold: true, align: "left", valign: "middle", margin: 0,
    });
    if (num) {
      s.addText(String(num).padStart(2, "0"), {
        x: 9.0, y: 0.15, w: 0.7, h: 0.65,
        fontSize: 13, fontFace: "Calibri", color: C.amber,
        align: "right", valign: "middle", margin: 0,
      });
    }
  }

  function addCard(s, x, y, w, h, heading, body, ac) {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h, fill: { color: ac || C.teal } });
    s.addText(heading, {
      x: x + 0.25, y, w: w - 0.4, h: 0.4,
      fontSize: 13, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText(body, {
      x: x + 0.25, y: y + 0.4, w: w - 0.4, h: h - 0.5,
      fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "top", margin: 0,
    });
  }

  function addSection(s, title, subtitle) {
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.tealDk } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.amber } });
    s.addShape(pres.shapes.LINE, { x: 0.8, y: 2.5, w: 2, h: 0, line: { color: C.amber, width: 3 } });
    s.addText(title, {
      x: 0.8, y: 2.7, w: 8, h: 1.0,
      fontSize: 30, fontFace: FONT, color: C.white, bold: true, align: "left", margin: 0,
    });
    if (subtitle) {
      s.addText(subtitle, {
        x: 0.8, y: 3.6, w: 8, h: 0.5,
        fontSize: 14, fontFace: FONT, color: C.amber, align: "left", margin: 0,
      });
    }
  }

  // ============ SLIDE 1: 表紙 ============
  {
    const s = pres.addSlide();
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 3.5, h: 5.625, fill: { color: C.teal } });
    s.addShape(pres.shapes.OVAL, { x: 1.2, y: 1.5, w: 2.8, h: 2.8, fill: { color: C.tealLt, transparency: 30 } });
    s.addShape(pres.shapes.OVAL, { x: 1.8, y: 2.1, w: 1.6, h: 1.6, fill: { color: C.tealLt } });
    s.addImage({ data: iComW, x: 2.1, y: 2.4, w: 1.0, h: 1.0 });
    s.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 0, w: 6.5, h: 5.625, fill: { color: C.cream } });
    s.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 0, w: 0.08, h: 5.625, fill: { color: C.amber } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 4.5, y: 1.2, w: 3.0, h: 0.5, rectRadius: 0.25, fill: { color: C.teal },
    });
    s.addText("AI研修 第1回", {
      x: 4.5, y: 1.2, w: 3.0, h: 0.5,
      fontSize: 14, fontFace: FONT, color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText("AIと仲良くなる", {
      x: 4.2, y: 2.0, w: 5.3, h: 1.2,
      fontSize: 36, fontFace: FONT, color: C.text, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.LINE, { x: 4.2, y: 3.3, w: 3, h: 0, line: { color: C.amber, width: 3 } });
    s.addText("まずは「使いこなす」より\n「話せる」状態をつくる", {
      x: 4.2, y: 3.5, w: 5.3, h: 0.8,
      fontSize: 15, fontFace: FONT, color: C.textLt, align: "left", valign: "top", margin: 0,
    });
    s.addNotes("表紙。「今日はAIの難しい話はしません。AIと仲良くなる、というテーマです。」");
  }

  // ============ SLIDE 2: 今日の目的 ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "今日の目的", iFlagW, 1);
    s.addText("AIの知識を覚えることではなく、\nAIに自然に話しかけられる状態をつくる", {
      x: 0.5, y: 1.2, w: 9.0, h: 0.9,
      fontSize: 18, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
    });
    const pts = [
      { icon: iBrainW, c: C.teal, t: "知識より体験", d: "AIの仕組みを理解することより、実際に会話してみることを重視します" },
      { icon: iHandW, c: C.tealLt, t: "距離を縮める", d: "上手に使うことより、まずAIとの心理的な距離を縮めることが目的です" },
      { icon: iSeedW, c: C.amber, t: "最初の一歩", d: "完璧を目指さず、「ちょっと話してみる」ところから始めましょう" },
    ];
    pts.forEach((p, i) => {
      const y = 2.35 + i * 1.1;
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 9.0, h: 0.85, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.06, h: 0.85, fill: { color: p.c } });
      s.addShape(pres.shapes.OVAL, { x: 0.75, y: y + 0.15, w: 0.55, h: 0.55, fill: { color: p.c } });
      s.addImage({ data: p.icon, x: 0.86, y: y + 0.26, w: 0.33, h: 0.33 });
      s.addText(p.t, {
        x: 1.5, y, w: 2.2, h: 0.85,
        fontSize: 13, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
      });
      s.addText(p.d, {
        x: 3.6, y, w: 5.7, h: 0.85,
        fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addNotes("「今日はAIの仕組みや専門用語を覚える回ではありません。目指すのは、AIに自然に話しかけられる状態。それだけです。」");
  }

  // ============ SLIDE 3: つまずく理由 ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "多くの人が最初につまずく理由", iQuesW, 2);
    const barriers = [
      { t: "何を聞けばいいか\nわからない", d: "「AIに何を聞くの？」という\n最初の問いで止まってしまう" },
      { t: "正しく使わないと\nいけない気がする", d: "「間違った使い方をしたら\nまずい」という思い込み" },
      { t: "変なことを聞いては\nいけない気がする", d: "「こんなこと聞いていいの？」\nという遠慮" },
      { t: "うまく聞けないと\n自分が悪い気がする", d: "「伝え方が下手だから\nうまくいかない」という自責" },
    ];
    barriers.forEach((b, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.5 + col * 4.65, y = 1.2 + row * 2.1;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.4, h: 1.85, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.4, h: 0.06, fill: { color: C.coral } });
      s.addImage({ data: iQuesR, x: x + 0.3, y: y + 0.3, w: 0.45, h: 0.45 });
      s.addText(b.t, {
        x: x + 0.85, y: y + 0.15, w: 3.3, h: 0.7,
        fontSize: 13, fontFace: FONT, color: C.text, bold: true, align: "left", valign: "middle", margin: 0,
      });
      s.addText(b.d, {
        x: x + 0.85, y: y + 0.9, w: 3.3, h: 0.75,
        fontSize: 10.5, fontFace: FONT, color: C.textLt, align: "left", valign: "top", margin: 0,
      });
    });
    s.addNotes("「心当たりありませんか？これ、全部ふつうの反応です。知識が足りないからつまずくんじゃない。心理的なハードルがあるんです。」");
  }

  // ============ SLIDE 4: 心理的ハードル ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "最初の壁は「知識不足」ではない", iBulbW, 3);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.3, w: 9.0, h: 1.8, fill: { color: C.tealDk } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.3, w: 0.08, h: 1.8, fill: { color: C.amber } });
    s.addText("AI活用の最初の課題は\n技術ではなく、心理的な距離感", {
      x: 1.0, y: 1.3, w: 8.0, h: 1.8,
      fontSize: 22, fontFace: FONT, color: C.white, bold: true, align: "left", valign: "middle", margin: 0,
    });
    // Left: NG
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.5, w: 4.3, h: 1.5, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.5, w: 0.06, h: 1.5, fill: { color: C.coral } });
    s.addText("x  知識をたくさん入れる", {
      x: 0.8, y: 3.55, w: 3.8, h: 0.55,
      fontSize: 13, fontFace: FONT, color: C.coral, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("勉強してから使おう…と思うと\nなかなか始められない", {
      x: 0.8, y: 4.1, w: 3.8, h: 0.7,
      fontSize: 11, fontFace: FONT, color: C.textLt, align: "left", valign: "top", margin: 0,
    });
    // Right: OK
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 3.5, w: 4.3, h: 1.5, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 3.5, w: 0.06, h: 1.5, fill: { color: C.green } });
    s.addText("o  まず話してみる", {
      x: 5.5, y: 3.55, w: 3.8, h: 0.55,
      fontSize: 13, fontFace: FONT, color: C.green, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("知識より先に「話してみる」。\nそれだけで距離は縮まる", {
      x: 5.5, y: 4.1, w: 3.8, h: 0.7,
      fontSize: 11, fontFace: FONT, color: C.textLt, align: "left", valign: "top", margin: 0,
    });
    s.addNotes("「多くの方が『もっと勉強してから』と思いがちですが、逆です。まず話してみる。それだけで心理的な距離は縮まります。」");
  }

  // ============ SLIDE 5: AIは何者か ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "AIは何者か", iRobotW, 4);
    const items = [
      { mark: "x", label: "人間", desc: "感情や経験は\nありません", c: C.coral, icon: iUserW },
      { mark: "x", label: "検索エンジン", desc: "ネットを検索して\nいるわけではない", c: C.coral, icon: iSearchW },
      { mark: "~", label: "システム", desc: "仕組みはシステム\nだけど機械的じゃない", c: C.amber, icon: iCogW },
      { mark: "o", label: "会話相手", desc: "話しかけると応える\nパートナー的存在", c: C.green, icon: iComW },
    ];
    items.forEach((it, i) => {
      const x = 0.35 + i * 2.4;
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.2, w: 2.2, h: 3.1, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.2, w: 2.2, h: 0.06, fill: { color: it.c } });
      s.addText(it.mark, {
        x, y: 1.4, w: 2.2, h: 0.5,
        fontSize: 24, fontFace: FONT, color: it.c, bold: true, align: "center", valign: "middle", margin: 0,
      });
      s.addShape(pres.shapes.OVAL, { x: x + 0.6, y: 2.05, w: 1.0, h: 1.0, fill: { color: it.c } });
      s.addImage({ data: it.icon, x: x + 0.8, y: 2.25, w: 0.6, h: 0.6 });
      s.addText(it.label, {
        x, y: 3.2, w: 2.2, h: 0.4,
        fontSize: 13, fontFace: FONT, color: C.text, bold: true, align: "center", valign: "middle", margin: 0,
      });
      s.addText(it.desc, {
        x, y: 3.6, w: 2.2, h: 0.6,
        fontSize: 10.5, fontFace: FONT, color: C.textLt, align: "center", valign: "top", margin: 0,
      });
    });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.55, w: 9.0, h: 0.75, fill: { color: C.amberLt } });
    s.addText("「会話相手」として接すると、いちばんうまくいく", {
      x: 0.8, y: 4.55, w: 8.5, h: 0.75,
      fontSize: 13, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addNotes("「AIは人間でもなく、検索エンジンでもない。会話相手として接するのがいちばん自然です。」");
  }

  // ============ SLIDE 6: 付き合い方の基本 ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "AIとの付き合い方の基本", iHandW, 5);
    const basics = [
      { icon: iSyncW, c: C.teal, t: "一発正解ではない", d: "一回で完璧な答えが出ることは稀。何度かやりとりして近づけていく" },
      { icon: iPlaneW, c: C.tealLt, t: "最初は雑でいい", d: "きれいにまとまった質問でなくてOK。「ちょっと聞きたいんだけど」で十分" },
      { icon: iPenW, c: C.amber, t: "返答を見て調整", d: "AIの返答を見て「もうちょっとこうして」と伝えれば、どんどん良くなる" },
      { icon: iComW, c: C.green, t: "「使う」より「対話する」", d: "ボタンを押す感覚ではなく、同僚に相談する感覚が近い" },
    ];
    basics.forEach((b, i) => {
      const y = 1.15 + i * 1.02;
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 9.0, h: 0.85, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.06, h: 0.85, fill: { color: b.c } });
      s.addShape(pres.shapes.OVAL, { x: 0.75, y: y + 0.15, w: 0.55, h: 0.55, fill: { color: b.c } });
      s.addImage({ data: b.icon, x: 0.86, y: y + 0.26, w: 0.33, h: 0.33 });
      s.addText(b.t, {
        x: 1.5, y, w: 2.5, h: 0.85,
        fontSize: 12, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
      });
      s.addText(b.d, {
        x: 3.9, y, w: 5.4, h: 0.85,
        fontSize: 10.5, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addNotes("「AIは一発で正解を出す魔法の箱ではありません。最初はぜんぜん雑で大丈夫。大事なのは、返ってきた答えを見て、追加で伝えること。」");
  }

  // ============ SLIDE 7: 期待しすぎ ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "AIに期待しすぎるとうまくいかない", iExclW, 6);
    s.addText("よくある誤解", {
      x: 0.5, y: 1.2, w: 4.4, h: 0.4,
      fontSize: 14, fontFace: FONT, color: C.coral, bold: true, align: "left", valign: "middle", margin: 0,
    });
    const wrongs = ["何でも完璧にわかる先生", "一回で正解を返す秘書", "意図を全部汲み取る存在"];
    wrongs.forEach((w, i) => {
      const y = 1.75 + i * 0.75;
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 4.4, h: 0.6, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addImage({ data: iTimesR, x: 0.65, y: y + 0.1, w: 0.4, h: 0.4 });
      s.addText(w, {
        x: 1.2, y, w: 3.5, h: 0.6,
        fontSize: 12, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addText("こう捉えるとうまくいく", {
      x: 5.2, y: 1.2, w: 4.4, h: 0.4,
      fontSize: 14, fontFace: FONT, color: C.green, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.75, w: 4.4, h: 2.0, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.75, w: 0.06, h: 2.0, fill: { color: C.green } });
    s.addImage({ data: iCheckG, x: 5.45, y: 1.95, w: 0.5, h: 0.5 });
    s.addText("壁打ち相手・整理相手", {
      x: 6.1, y: 1.85, w: 3.3, h: 0.5,
      fontSize: 14, fontFace: FONT, color: C.green, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("AIは「完璧な回答者」ではなく、\n考えを整理したり、アイデアを\n広げるための相談相手。\n\n間違えることもあるけれど、\nそれも含めて対話を重ねる。", {
      x: 5.5, y: 2.55, w: 3.9, h: 1.1,
      fontSize: 10.5, fontFace: FONT, color: C.text, align: "left", valign: "top", margin: 0,
    });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.2, w: 9.0, h: 0.8, fill: { color: C.amberLt } });
    s.addText("「正解を出してもらう」ではなく「一緒に考える」", {
      x: 0.8, y: 4.2, w: 8.5, h: 0.8,
      fontSize: 14, fontFace: FONT, color: C.teal, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addNotes("「AIに完璧を期待するとがっかりします。でも壁打ち相手・整理相手として使うとめちゃくちゃ強い。」");
  }

  // ============ SLIDE 8: セクション ============
  {
    const s = pres.addSlide();
    addSection(s, "実践編", "まずは、気軽に話しかけてみよう");
    s.addNotes("「ここからは実践編です。実際にどう話しかければいいか見ていきましょう。」");
  }

  // ============ SLIDE 9: 雑に話していい ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "まずは雑に話していい", iSmileW, 7);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.2, w: 9.0, h: 1.5, fill: { color: C.tealDk } });
    s.addText("完璧なプロンプトは要らない。\n最初の一投目より、その後の対話の方が大事。", {
      x: 0.8, y: 1.2, w: 8.5, h: 1.5,
      fontSize: 18, fontFace: FONT, color: C.white, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("こんな雑な始め方でOK", {
      x: 0.5, y: 2.95, w: 9.0, h: 0.4,
      fontSize: 13, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
    });
    const examples = [
      "「ちょっと整理したいんだけど」",
      "「どう思う？」",
      "「うまく言えないけど…」",
      "「なんかモヤモヤしてて」",
    ];
    examples.forEach((ex, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.5 + col * 4.65, y = 3.5 + row * 0.85;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.4, h: 0.6, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h: 0.6, fill: { color: C.tealLt } });
      s.addImage({ data: iComT, x: x + 0.2, y: y + 0.1, w: 0.4, h: 0.4 });
      s.addText(ex, {
        x: x + 0.75, y, w: 3.5, h: 0.6,
        fontSize: 12, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addNotes("「完璧な質問を考えてから聞く必要はありません。こんな感じでいいんです。雑でいいんです。」");
  }

  // ============ SLIDE 10: 試せる問いの例 ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "その場で試せる問いの例", iPlaneW, 8);
    s.addText("仕事寄り", {
      x: 0.5, y: 1.15, w: 4.3, h: 0.4,
      fontSize: 12, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
    });
    const workEx = [
      "今日やることが多いから\n優先順位を整理して",
      "この文章、何が言いたいか\n整理して",
      "会議前に考えをまとめたい",
    ];
    workEx.forEach((ex, i) => {
      const y = 1.6 + i * 0.9;
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 4.3, h: 0.75, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.06, h: 0.75, fill: { color: C.teal } });
      s.addText(ex, {
        x: 0.8, y, w: 3.8, h: 0.75,
        fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addText("雑談寄り", {
      x: 5.2, y: 1.15, w: 4.3, h: 0.4,
      fontSize: 12, fontFace: FONT, color: C.amber, bold: true, align: "left", valign: "middle", margin: 0,
    });
    const casualEx = [
      "最近ちょっと疲れてるので\n立て直し方を考えたい",
      "うまく言えないけど、\nなんとなくモヤモヤしている",
      "週末の過ごし方を\n一緒に考えて",
    ];
    casualEx.forEach((ex, i) => {
      const y = 1.6 + i * 0.9;
      s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y, w: 4.3, h: 0.75, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y, w: 0.06, h: 0.75, fill: { color: C.amber } });
      s.addText(ex, {
        x: 5.5, y, w: 3.8, h: 0.75,
        fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.5, w: 9.0, h: 0.6, fill: { color: C.amberLt } });
    s.addText("どれか一つ、今この場で試してみましょう", {
      x: 0.8, y: 4.5, w: 8.5, h: 0.6,
      fontSize: 12, fontFace: FONT, color: C.teal, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addNotes("「ここで実際にやってみましょう。どれか一つ選んで、AIに話しかけてみてください。2〜3分取ります。」\n[ワーク実施]");
  }

  // ============ SLIDE 11: 対話サイクル ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "AIとの対話の基本サイクル", iSyncW, 9);
    const steps = [
      { num: "1", label: "まず投げる", c: C.teal },
      { num: "2", label: "返答を見る", c: C.tealLt },
      { num: "3", label: "ズレを\n見つける", c: C.amber },
      { num: "4", label: "追加で\n伝える", c: C.teal },
      { num: "5", label: "もう一度\n返してもらう", c: C.green },
    ];
    steps.forEach((st, i) => {
      const x = 0.3 + i * 1.95;
      s.addShape(pres.shapes.OVAL, { x: x + 0.35, y: 1.4, w: 1.1, h: 1.1, fill: { color: st.c } });
      s.addText(st.num, {
        x: x + 0.35, y: 1.4, w: 1.1, h: 1.1,
        fontSize: 24, fontFace: FONT, color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
      });
      if (i < steps.length - 1) {
        s.addText("▸", {
          x: x + 1.5, y: 1.75, w: 0.4, h: 0.4,
          fontSize: 20, fontFace: "Calibri", color: C.amber, bold: true, align: "center", valign: "middle", margin: 0,
        });
      }
      s.addText(st.label, {
        x: x + 0.05, y: 2.6, w: 1.7, h: 0.65,
        fontSize: 11, fontFace: FONT, color: C.text, bold: true, align: "center", valign: "top", margin: 0,
      });
    });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.55, w: 9.0, h: 0.06, fill: { color: C.grayLine } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.8, w: 9.0, h: 1.3, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.8, w: 0.06, h: 1.3, fill: { color: C.teal } });
    s.addText("このサイクルを繰り返す", {
      x: 0.8, y: 3.85, w: 8.5, h: 0.5,
      fontSize: 14, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("1回で完璧な答えを得ようとしなくて大丈夫。\n「投げる → 見る → 伝える」を何度か繰り返すうちに、自然と良い結果になっていきます。", {
      x: 0.8, y: 4.35, w: 8.5, h: 0.65,
      fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "top", margin: 0,
    });
    s.addNotes("「特に大事なのは3番目の『ズレを見つける』。返ってきた答えが思ってたのと違う。それは失敗ではなく、次に何を伝えるかが見えた状態です。」");
  }

  // ============ SLIDE 12: 失敗ではなく材料 ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "うまくいかないのは失敗ではなく材料", iSeedW, 10);
    // Before
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.2, w: 4.3, h: 1.4, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.2, w: 4.3, h: 0.06, fill: { color: C.coral } });
    s.addText("こう感じがち", {
      x: 0.7, y: 1.35, w: 3.9, h: 0.4,
      fontSize: 12, fontFace: FONT, color: C.coral, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("「AIが変な答えを返した」\n「使えない」\n「自分の聞き方が悪かった」", {
      x: 0.7, y: 1.8, w: 3.9, h: 0.7,
      fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "top", margin: 0,
    });
    // Arrow
    s.addShape(pres.shapes.OVAL, { x: 4.75, y: 1.55, w: 0.5, h: 0.5, fill: { color: C.amber } });
    s.addText("→", {
      x: 4.75, y: 1.55, w: 0.5, h: 0.5,
      fontSize: 20, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    // After
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.2, w: 4.3, h: 1.4, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.2, w: 4.3, h: 0.06, fill: { color: C.green } });
    s.addText("こう捉えてみよう", {
      x: 5.4, y: 1.35, w: 3.9, h: 0.4,
      fontSize: 12, fontFace: FONT, color: C.green, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("「次に何を伝えるかが見えた」\n「対話の材料が増えた」\n「やりとりの途中にいる」", {
      x: 5.4, y: 1.8, w: 3.9, h: 0.7,
      fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "top", margin: 0,
    });
    // Big bottom
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.0, w: 9.0, h: 2.0, fill: { color: C.tealDk } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.0, w: 0.08, h: 2.0, fill: { color: C.amber } });
    s.addText("ズレた返答は「使えない」ではなく\n「次に何を伝えるかが見えた状態」", {
      x: 1.0, y: 3.15, w: 8.0, h: 0.9,
      fontSize: 18, fontFace: FONT, color: C.white, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("1回で決めようとしなくてよい。\nやりとりしながら整えていくことに価値がある。", {
      x: 1.0, y: 4.1, w: 8.0, h: 0.7,
      fontSize: 13, fontFace: FONT, color: C.amber, align: "left", valign: "top", margin: 0,
    });
    s.addNotes("「ズレた答えが返ってきたとき『使えない！』と思いがちですが、それは対話の途中。人間同士でも一発で通じないことはよくありますよね。」");
  }

  // ============ SLIDE 13: 持ち帰り ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "今日いちばん持ち帰ってほしいこと", iHeartW, 11);
    const takes = [
      { t: "AIは試験官ではない", d: "正しく使わなきゃ、という\n緊張は手放してOK", c: C.teal },
      { t: "上手より、気軽に", d: "まずは気軽に\n話しかけてみる", c: C.tealLt },
      { t: "雑でも会話を始めてよい", d: "完璧な質問を\n考えなくていい", c: C.amber },
      { t: "関係は対話で育つ", d: "やりとりの回数が\n関係の深さになる", c: C.green },
    ];
    takes.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.5 + col * 4.65, y = 1.2 + row * 2.1;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.4, h: 1.75, fill: { color: C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h: 1.75, fill: { color: t.c } });
      s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.2, w: 0.55, h: 0.55, fill: { color: t.c } });
      s.addText(String(i + 1), {
        x: x + 0.25, y: y + 0.2, w: 0.55, h: 0.55,
        fontSize: 16, fontFace: FONT, color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
      });
      s.addText(t.t, {
        x: x + 1.0, y: y + 0.15, w: 3.2, h: 0.65,
        fontSize: 14, fontFace: FONT, color: C.text, bold: true, align: "left", valign: "middle", margin: 0,
      });
      s.addText(t.d, {
        x: x + 1.0, y: y + 0.85, w: 3.2, h: 0.7,
        fontSize: 11, fontFace: FONT, color: C.textLt, align: "left", valign: "top", margin: 0,
      });
    });
    s.addNotes("「この4つだけ持ち帰ってもらえたら十分です。特に大事なのは2番目。上手に使うことより、気軽に話しかけること。」");
  }

  // ============ SLIDE 14: 課題説明 ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "次回までの課題", iClipW, 12);
    s.addText("やること", {
      x: 0.5, y: 1.2, w: 4.6, h: 0.4,
      fontSize: 14, fontFace: FONT, color: C.teal, bold: true, align: "left", valign: "middle", margin: 0,
    });
    const tasks = [
      { t: "1〜2週間で最低5回AIに話しかける", a: true },
      { t: "内容は仕事でも私生活でもOK", a: false },
      { t: "1回は仕事以外でも使ってみる", a: false },
      { t: "何を聞いたか・どう返ってきたか・\nどう感じたかを簡単に記録する", a: true },
    ];
    tasks.forEach((t, i) => {
      const y = 1.7 + i * 0.9;
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 4.6, h: 0.75, fill: { color: t.a ? C.amberLt : C.cardBg }, shadow: mkShadow() });
      s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.06, h: 0.75, fill: { color: t.a ? C.amber : C.teal } });
      s.addText(t.t, {
        x: 0.8, y, w: 4.1, h: 0.75,
        fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addText("記録の観点", {
      x: 5.3, y: 1.2, w: 4.3, h: 0.4,
      fontSize: 14, fontFace: FONT, color: C.amber, bold: true, align: "left", valign: "middle", margin: 0,
    });
    const obs = ["何を相談したか", "AIの返答はどうだったか", "良かった点", "微妙だった点", "追加で何を伝えたか", "次に試したいこと"];
    obs.forEach((o, i) => {
      const y = 1.7 + i * 0.55;
      s.addShape(pres.shapes.OVAL, { x: 5.3, y: y + 0.1, w: 0.35, h: 0.35, fill: { color: C.amber } });
      s.addText(String(i + 1), {
        x: 5.3, y: y + 0.1, w: 0.35, h: 0.35,
        fontSize: 10, fontFace: FONT, color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
      });
      s.addText(o, {
        x: 5.8, y, w: 3.5, h: 0.55,
        fontSize: 11, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addNotes("「難しく考えなくて大丈夫。『5回話しかける』だけです。記録は一言メモでOK。仕事以外でも1回は使ってみてください。」");
  }

  // ============ SLIDE 15: 次回予告 ============
  {
    const s = pres.addSlide();
    s.background = { color: C.cream };
    addHeader(s, "次回予告", iArrowW, 13);
    // Current
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.3, w: 4.3, h: 1.5, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.3, w: 4.3, h: 0.5, fill: { color: C.tealLt } });
    s.addText("今回（第1回）", {
      x: 0.5, y: 1.3, w: 4.3, h: 0.5,
      fontSize: 13, fontFace: FONT, color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText("AIと仲良くなる\n→ まず話しかけられる状態をつくる", {
      x: 0.7, y: 1.95, w: 3.9, h: 0.7,
      fontSize: 12, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
    });
    // Arrow
    s.addShape(pres.shapes.OVAL, { x: 4.75, y: 1.75, w: 0.5, h: 0.5, fill: { color: C.amber } });
    s.addText("→", {
      x: 4.75, y: 1.75, w: 0.5, h: 0.5,
      fontSize: 20, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    // Next
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.3, w: 4.3, h: 1.5, fill: { color: C.cardBg }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.3, w: 4.3, h: 0.5, fill: { color: C.amber } });
    s.addText("次回（第2回）", {
      x: 5.2, y: 1.3, w: 4.3, h: 0.5,
      fontSize: 13, fontFace: FONT, color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText("うまくいかない時の対処\n→ ズレや困りごとへの向き合い方", {
      x: 5.4, y: 1.95, w: 3.9, h: 0.7,
      fontSize: 12, fontFace: FONT, color: C.text, align: "left", valign: "middle", margin: 0,
    });
    // Connection
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.2, w: 9.0, h: 1.5, fill: { color: C.amberLt } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.2, w: 0.06, h: 1.5, fill: { color: C.amber } });
    s.addText("課題で感じたズレや困りごとが、\nそのまま次回の学びになります", {
      x: 0.8, y: 3.2, w: 8.5, h: 1.5,
      fontSize: 16, fontFace: FONT, color: C.text, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addNotes("「次回は『うまくいかない時の対処』。課題でうまくいかないこともあると思いますが、それがそのまま次回の教材になります。」");
  }

  // ============ SLIDE 16: まとめ ============
  {
    const s = pres.addSlide();
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.tealDk } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.amber } });
    s.addImage({ data: iSmileW, x: 0.8, y: 0.5, w: 0.5, h: 0.5 });
    s.addText("まとめ", {
      x: 1.5, y: 0.5, w: 3, h: 0.5,
      fontSize: 14, fontFace: FONT, color: C.amber, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addText("最初から上手である必要はない", {
      x: 0.8, y: 1.2, w: 8.4, h: 0.8,
      fontSize: 24, fontFace: FONT, color: C.white, bold: true, align: "left", valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.LINE, { x: 0.8, y: 2.1, w: 2, h: 0, line: { color: C.amber, width: 3 } });
    const finals = [
      { t: "AIは、正しく使う前に、まず関係をつくることが大事", icon: iHeartW },
      { t: "まずは少し話してみることから始めればよい", icon: iComW },
      { t: "対話の回数だけ、AIとの関係は育っていく", icon: iSeedW },
    ];
    finals.forEach((f, i) => {
      const y = 2.3 + i * 0.8;
      s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 8.4, h: 0.75, fill: { color: "1A4A54" } });
      s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y, w: 0.06, h: 0.75, fill: { color: C.amber } });
      s.addShape(pres.shapes.OVAL, { x: 1.05, y: y + 0.12, w: 0.5, h: 0.5, fill: { color: C.tealLt } });
      s.addImage({ data: f.icon, x: 1.15, y: y + 0.22, w: 0.3, h: 0.3 });
      s.addText(f.t, {
        x: 1.75, y, w: 7.2, h: 0.75,
        fontSize: 14, fontFace: FONT, color: C.white, align: "left", valign: "middle", margin: 0,
      });
    });
    s.addText("なんだ、もっと気軽に話していいんだ。", {
      x: 0.8, y: 4.6, w: 8.4, h: 0.6,
      fontSize: 16, fontFace: FONT, color: C.amber, bold: true, italic: true, align: "center", valign: "middle", margin: 0,
    });
    s.addNotes("「この4つだけ。AIは完璧に使いこなす必要はない。まず関係をつくること。そして少し話してみること。『なんだ、もっと気軽に話していいんだ』と思ってもらえたら大成功です。ありがとうございました。」");
  }

  const out = "/Users/yoshidachihiro/project/KB/slides/ai-training-01.pptx";
  await pres.writeFile({ fileName: out });
  console.log("Generated:", out);
}

main().catch(console.error);
