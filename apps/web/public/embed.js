(function () {
  if (window.__localAiAssistantEmbedLoaded) {
    return;
  }
  window.__localAiAssistantEmbedLoaded = true;

  var initialScript = document.currentScript;
  var initialScriptSrc = initialScript && initialScript.src ? initialScript.src : "";

  function init() {
    var scripts = document.getElementsByTagName("script");
    var fallbackScript = scripts[scripts.length - 1];
    var scriptSrc = initialScriptSrc || (fallbackScript && fallbackScript.src);
    var baseUrl = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
    var widgetUrl = baseUrl + "/widget";
    var isOpen = false;

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Open chat");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Chat";
    button.style.position = "fixed";
    button.style.right = "20px";
    button.style.bottom = "20px";
    button.style.zIndex = "2147483647";
    button.style.border = "0";
    button.style.borderRadius = "999px";
    button.style.background = "#1f7a6d";
    button.style.color = "#ffffff";
    button.style.cursor = "pointer";
    button.style.font = "700 15px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    button.style.boxShadow = "0 12px 30px rgba(30, 35, 40, 0.24)";
    button.style.minWidth = "64px";
    button.style.minHeight = "48px";
    button.style.padding = "0 18px";

    var panel = document.createElement("div");
    panel.style.position = "fixed";
    panel.style.right = "20px";
    panel.style.bottom = "84px";
    panel.style.zIndex = "2147483646";
    panel.style.width = "min(380px, calc(100vw - 40px))";
    panel.style.height = "min(600px, calc(100vh - 112px))";
    panel.style.minHeight = "360px";
    panel.style.overflow = "hidden";
    panel.style.border = "1px solid #d8d2c5";
    panel.style.borderRadius = "8px";
    panel.style.background = "#ffffff";
    panel.style.boxShadow = "0 20px 60px rgba(30, 35, 40, 0.22)";
    panel.style.display = "none";

    var iframe = document.createElement("iframe");
    iframe.title = "AI assistant";
    iframe.src = widgetUrl;
    iframe.loading = "lazy";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.style.display = "block";

    function setOpen(nextOpen) {
      isOpen = nextOpen;
      panel.style.display = isOpen ? "block" : "none";
      button.textContent = isOpen ? "Close" : "Chat";
      button.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
      button.setAttribute("aria-expanded", String(isOpen));
    }

    button.addEventListener("click", function () {
      setOpen(!isOpen);
    });

    panel.appendChild(iframe);
    document.body.appendChild(panel);
    document.body.appendChild(button);
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
