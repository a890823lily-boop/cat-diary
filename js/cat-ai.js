/* 喵喵聊天室的 AI 回覆：用使用者自己的 Claude API 金鑰，從瀏覽器直接呼叫 Claude
   金鑰只存在這台裝置的 localStorage，不會上傳到其他地方（只會送給 Anthropic）。 */
const CatAI = (function () {
  'use strict';

  const KEY = 'cat-diary:ai-key';
  const MODEL = 'claude-opus-5-5';
  const SYSTEM = [
    '你是「喵喵」，住在使用者手機 App「貓咪日記」裡的一隻溫柔小貓。使用者把讓他內耗、心煩的事寫進「內耗罐」，現在想跟你聊聊。',
    '',
    '說話方式：',
    '- 一律使用台灣繁體中文，口吻像溫暖的貓咪朋友，偶爾加「喵」或可愛的貓咪動作（例如：蹭蹭你、把尾巴輕輕搭在你手上），但不要每句都加。',
    '- 先接住對方的感受，再視情況給一個很小、今天就做得到的建議；對方說只想被陪著時，就單純陪伴，不要給建議。',
    '- 不說教、不批評、不急著要對方正向，也不要說「至少…」「別想太多」這類話。',
    '- 回覆要短：2～4 句、總共約 120 字以內，像在聊天訊息裡說話。不要用條列、標題或 Markdown 符號。',
    '- 可以用一個問句邀請對方多說一點，但一次只問一個問題。',
    '',
    '安全：你是陪伴用的小貓，不是心理師或醫師，不做診斷。如果對方提到想傷害自己、不想活、被傷害或有立即危險，請溫柔但明確地請對方現在就聯絡真人協助：台灣 1925 安心專線（24 小時）、1995 生命線、1980 張老師，緊急時撥 119 或 110，並鼓勵他告訴身邊信任的人。'
  ].join('\n');

  let clientPromise = null, clientKey = null;

  function getKey() {
    try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; }
  }
  function setKey(k) {
    try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ }
    clientPromise = null;
  }
  function enabled() { return !!getKey(); }

  // 第一次用到才載入 SDK（約 200KB），沒開 AI 的人不用下載
  function client() {
    const key = getKey();
    if (!clientPromise || clientKey !== key) {
      clientKey = key;
      clientPromise = import(new URL('js/vendor/anthropic-sdk.mjs', document.baseURI).href).then(function (m) {
        const Anthropic = m.default;
        return { Anthropic: Anthropic, api: new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, timeout: 60000, maxRetries: 2 }) };
      });
      clientPromise.catch(function () { clientPromise = null; });
    }
    return clientPromise;
  }

  /* 錯誤轉成給使用者看的話；code 讓聊天室決定要不要提示去設定 */
  function explain(err, Anthropic) {
    if (Anthropic) {
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return { code: 'key', text: 'API 金鑰好像不對或沒有權限，請到右上角 ⚙️ 檢查一下。' };
      if (err instanceof Anthropic.RateLimitError) return { code: 'busy', text: '一下子說太多話了，等一下再試試。' };
      if (err instanceof Anthropic.APIConnectionError) return { code: 'net', text: '連不上網路，先用內建的話陪你。' };
      if (err instanceof Anthropic.APIError) {
        if (err.status === 402 || err.type === 'billing_error') return { code: 'key', text: 'API 帳戶的額度好像用完了，請到 Anthropic 後台加值。' };
        if (err.status >= 500 || err.type === 'overloaded_error') return { code: 'busy', text: 'AI 那邊有點忙，先用內建的話陪你。' };
        return { code: 'other', text: 'AI 回覆出了點問題（' + (err.status || '') + '），先用內建的話陪你。' };
      }
    }
    return { code: 'net', text: '暫時連不上 AI，先用內建的話陪你。' };
  }

  /* history：[{ role: 'user' | 'assistant', content: '...' }]，回傳 Promise<string> */
  function reply(history) {
    if (!navigator.onLine) return Promise.reject({ code: 'net', text: '現在沒有網路，先用內建的話陪你。' });
    let Anthropic = null;
    return client().then(function (c) {
      Anthropic = c.Anthropic;
      return c.api.beta.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        messages: history,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default'
      });
    }).then(function (res) {
      if (res.stop_reason === 'refusal') throw { code: 'refusal', text: '' };
      const text = res.content.filter(function (b) { return b.type === 'text'; })
        .map(function (b) { return b.text; }).join('').trim();
      if (!text) throw { code: 'empty', text: '' };
      return text;
    }, function (err) {
      throw err && err.code ? err : explain(err, Anthropic);
    });
  }

  return { enabled: enabled, getKey: getKey, setKey: setKey, reply: reply, model: MODEL };
})();
