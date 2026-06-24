// Clipboard write with a legacy fallback. `done(ok)` is called with success.
export function copyText(md, done) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(md).then(
      function () {
        done(true);
      },
      function () {
        fallbackCopy(md, done);
      },
    );
  } else {
    fallbackCopy(md, done);
  }
}

function fallbackCopy(md, done) {
  var ta = document.createElement("textarea");
  ta.value = md;
  ta.style.cssText =
    "position:fixed;top:10px;left:10px;width:80vw;height:60vh;z-index:2147483647;";
  document.body.appendChild(ta);
  ta.select();
  var ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {
    ok = false;
  }
  ta.remove();
  done(ok);
}
