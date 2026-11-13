/* ================= 注册机制 ================= */
const REG_CODES = [
  "a1B#c9D@e2F$g7H%i4J&k6L*m8N^o0P",
  "b3C$d5E%f8G&h1J#k9L@m2N^o4P*q7R",
  "c7D^e9F@g1H#i3J$k5L%m0N&o2P*q8R",
  "d2E%f4G&h6J#k8L@m0N^o1P*q3R$t5U",
  "e5F&g7H#i9J@k1L$m3N%o6P^q8R*s0T",
  "f8G#h0J@k2L$m4N%o7P^q9R&s1T*u3V",
  "g1H$j3K%l5M&n7O@p9Q^r2S*t4U$v6W",
  "h4J&k6L*m8N^o0P@q2R$t5U%v7W&x9Y",
  "i7K@l9M^n1O&p3Q%r5S$t8U&v0W*x2Z",
  "j0L$m2N%o4P&q6R@t8U$v1W*x3Y#z5A"
];
const TRIAL_LIMIT = 10;
const REG_LIMIT = 2000;
const STORAGE_KEY = "stockcalc_registration";
const DATA_KEY = "stockcalc_data";
const USED_CODES_KEY = "stockcalc_used_codes";

let state = { registered: false, useCount: 0 };

/* ================= 工具函数 ================= */
const $ = (id) => document.getElementById(id);

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.registered = !!s.registered;
    state.useCount = Number(s.useCount) || 0;
  } catch { state = { registered: false, useCount: 0 }; }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getUsedCodes() {
  try {
    return JSON.parse(localStorage.getItem(USED_CODES_KEY) || "[]");
  } catch { return []; }
}

function markCodeUsed(code) {
  const used = getUsedCodes();
  if (!used.includes(code)) {
    used.push(code);
    localStorage.setItem(USED_CODES_KEY, JSON.stringify(used));
  }
}

function isCodeUsed(code) {
  return getUsedCodes().includes(code);
}

/* ================= 弹窗 ================= */
let modalResolve = null;

function showModal(text, withCancel = false) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    $("modalText").textContent = text;
    $("modalCancel").classList.toggle("hidden", !withCancel);
    $("modal").classList.remove("hidden");
  });
}

function closeModal(result) {
  $("modal").classList.add("hidden");
  if (modalResolve) { modalResolve(result); modalResolve = null; }
}

$("modalOk").onclick = () => closeModal(true);
$("modalCancel").onclick = () => closeModal(false);

/* ================= 状态更新 ================= */
function limitReached() {
  return state.registered
    ? state.useCount >= REG_LIMIT
    : state.useCount >= TRIAL_LIMIT;
}

function updateUI() {
  const disabled = limitReached();
  ["btnCalc", "btnSave", "btnSearch"].forEach((id) => {
    $(id).disabled = disabled;
    $(id).style.opacity = disabled ? "0.4" : "1";
  });

  const base = "股票计算器--红黑观察员";
  const suffix = state.registered
    ? ` [已注册: ${state.useCount}/${REG_LIMIT}]`
    : ` [试用: ${state.useCount}/${TRIAL_LIMIT}]`;
  document.title = base + suffix;
}

function checkRegistration() {
  if (limitReached()) {
    showModal(state.registered
      ? "您的使用次数已用完！\n请联系获取新的注册码。"
      : "试用次数已用完！\n请注册以获得完整功能（2000次使用权限）。");
    return false;
  }
  return true;
}

/* ================= 计算逻辑（与原 tkinter 版一致） ================= */
function calc() {
  if (!checkRegistration()) return;

  const low1 = parseFloat($("low1").value);
  const high1 = parseFloat($("high1").value);
  const low2Text = $("low2").value.trim();
  const low2 = low2Text ? parseFloat(low2Text) : 0;

  if (isNaN(low1) || isNaN(high1)) {
    showModal("请输入有效的数值！"); $("low1").focus(); return;
  }
  if (low1 <= 0 || high1 <= 0) {
    showModal("请输入有效的前低和前高数值！"); $("low1").focus(); return;
  }
  if (high1 <= low1) {
    showModal("前高必须大于前低！"); $("high1").focus(); return;
  }

  state.useCount += 1;
  saveState();
  updateUI();

  const r1 = Math.pow(low1, 0.382) * Math.pow(high1, 0.618);
  const r2 = Math.pow(low1, 0.618) * Math.pow(high1, 0.382);
  const r3 = Math.sqrt(low1 * high1);

  $("out1").value = r1.toFixed(4);
  $("out2").value = r2.toFixed(4);
  $("out3").value = r3.toFixed(4);

  if (!isNaN(low2) && low2 > 0) {
    if (low2 >= high1) {
      showModal("近低应该小于前高！"); $("low2").focus(); return;
    }
    $("out4").value = Math.sqrt(low2 * high1).toFixed(4);
    $("out5").value = ((high1 / low1) * low2).toFixed(4);
    $("out6").value = (Math.pow(high1 / low1, 1.618) * low2).toFixed(4);
  } else {
    $("out4").value = $("out5").value = $("out6").value = "";
  }
}

/* ================= 清空 ================= */
function clearAll() {
  ["code", "name", "low1", "high1", "low2",
   "out1", "out2", "out3", "out4", "out5", "out6"].forEach((id) => $(id).value = "");
  $("code").focus();
}

/* ================= 数据存取 ================= */
function loadData() {
  try { return JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); }
  catch { return []; }
}

function saveData(list) {
  localStorage.setItem(DATA_KEY, JSON.stringify(list));
}

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* ================= 保存 ================= */
async function saveRecord() {
  if (!checkRegistration()) return;

  const code = $("code").value.trim();
  const low1 = $("low1").value.trim();
  const high1 = $("high1").value.trim();

  if (!code) { showModal("请输入代码！"); $("code").focus(); return; }
  if (!low1 || !high1) { showModal("前低和前高不能为空！"); return; }

  const record = {
    code,
    name: $("name").value.trim(),
    low1, high1,
    low2: $("low2").value.trim(),
    out1: $("out1").value, out2: $("out2").value, out3: $("out3").value,
    out4: $("out4").value, out5: $("out5").value, out6: $("out6").value,
    time: nowStr()
  };

  const list = loadData();
  const idx = list.findIndex((r) => r.code === code);

  if (idx >= 0) {
    const ok = await showModal("该代码已存在，是否覆盖原有数据？", true);
    if (!ok) { await showModal("已取消保存操作。"); return; }
    list[idx] = record;
  } else {
    list.push(record);
  }

  saveData(list);
  await showModal(idx >= 0 ? "数据已成功更新！" : "数据已成功保存！");
}

/* ================= 查找 ================= */
async function searchRecord() {
  if (!checkRegistration()) return;

  const code = $("code").value.trim();
  if (!code) { showModal("请输入要查找的代码！"); $("code").focus(); return; }

  const list = loadData();
  const rec = list.find((r) => r.code === code);

  if (!rec) { await showModal("未找到指定代码的数据！"); return; }

  $("name").value = rec.name || "";
  $("low1").value = rec.low1 || "";
  $("high1").value = rec.high1 || "";
  $("low2").value = rec.low2 || "";
  $("out1").value = rec.out1 || "";
  $("out2").value = rec.out2 || "";
  $("out3").value = rec.out3 || "";
  $("out4").value = rec.out4 || "";
  $("out5").value = rec.out5 || "";
  $("out6").value = rec.out6 || "";

  await showModal("数据查找成功！");
}

/* ================= 注册 ================= */
async function registerFlow() {
  const code = prompt("请输入注册码：");
  if (code === null) return;
  const c = code.trim();

  if (!c) { await showModal("请输入注册码！"); return; }
  if (!REG_CODES.includes(c)) { await showModal("注册码无效，请检查后重试！"); return; }
  if (isCodeUsed(c)) { await showModal("该注册码已被使用，请使用其他注册码！"); return; }

  markCodeUsed(c);
  state.registered = true;
  state.useCount = 0;
  saveState();
  updateUI();

  await showModal("注册成功！\n您已获得2000次使用权限。");
}

/* ================= 菜单 ================= */
async function showHelp() {
  let text =
    "使用方法：\n" +
    "1. 仅适用于上升阶段\n" +
    "2. 输入股票代码、股票名称、前低（1浪低点）\n" +
    "   前高（1浪高点）和近低(2浪低点)\n" +
    "3. 可计算出股票上升的空间\n" +
    "4. 股价到观察位可加自选\n" +
    "5. 股价站稳买入价可买入\n" +
    "6. 股价至少能涨到一卖价，甚至更高\n\n";
  text += state.registered
    ? `注册状态：已注册\n使用次数：${state.useCount}/${REG_LIMIT} 次`
    : `试用状态：${state.useCount}/${TRIAL_LIMIT} 次\n请注册以获得完整功能（2000次使用权限）`;
  await showModal(text);
}

async function showAbout() {
  await showModal(
    "股票计算器\n\n版本：终极注册版\n作者：红黑观察员\n" +
    "技术支持：K线里有乾坤\n发布日期：2026年11月\n"
  );
}

/* ================= 事件绑定 ================= */
$("btnCalc").onclick = calc;
$("btnClear").onclick = clearAll;
$("btnSave").onclick = saveRecord;
$("btnSearch").onclick = searchRecord;

$("btnMenu").onclick = () => $("drawer").classList.toggle("hidden");

document.querySelectorAll("#drawer button").forEach((btn) => {
  btn.onclick = () => {
    $("drawer").classList.add("hidden");
    const action = btn.dataset.action;
    if (action === "help") showHelp();
    if (action === "register") registerFlow();
    if (action === "about") showAbout();
  };
});

/* 数字输入校验：最多两位小数（对应原 validate_decimal） */
["low1", "high1", "low2"].forEach((id) => {
  $(id).addEventListener("input", (e) => {
    const v = e.target.value;
    if (v === "") return;
    if (!/^-?\d*\.?\d{0,2}$/.test(v)) {
      e.target.value = v.slice(0, -1);
    }
  });
});

/* 点击空白关闭抽屉 */
document.addEventListener("click", (e) => {
  if (!e.target.closest("#drawer") && e.target.id !== "btnMenu") {
    $("drawer").classList.add("hidden");
  }
});

/* ================= Service Worker 注册 ================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ================= 启动 ================= */
loadState();
updateUI();