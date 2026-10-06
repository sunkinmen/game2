/* SaveManager — localStorage 存檔，無法使用時退回記憶體（私密瀏覽 / 被封鎖也不會壞） */
(function (G) {
  'use strict';
  var KEY = 'taipei_fight_v1', mem = {}, ls = null;
  try { ls = G.localStorage; ls.setItem('__t', '1'); ls.removeItem('__t'); } catch (e) { ls = null; }
  function load() { try { var s = ls && ls.getItem(KEY); if (s) mem = JSON.parse(s) || {}; } catch (e) { mem = {}; } }
  function save() { try { if (ls) ls.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  load();
  G.SaveManager = {
    section: function (name, def) { var o = {}, s = mem[name] || {}, k; for (k in def) o[k] = (k in s) ? s[k] : def[k]; return o; },
    saveSection: function (name, data) { mem[name] = JSON.parse(JSON.stringify(data)); save(); },
    get: function (k, d) { return k in mem ? mem[k] : d; },
    set: function (k, v) { mem[k] = v; save(); }
  };
})(window);
