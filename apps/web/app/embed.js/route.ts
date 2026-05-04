import { branding } from "@/lib/branding";

export function GET() {
  const buttonText = JSON.stringify(branding.embedButtonText);
  const accentColor = JSON.stringify(branding.accentColor);

  return new Response(
    `(function () {
  if (window.__localAiAssistantEmbedLoaded) {
    return;
  }
  window.__localAiAssistantEmbedLoaded = true;

  var initialScript = document.currentScript;
  var initialScriptSrc = initialScript && initialScript.src ? initialScript.src : "";
  var initialCompany = initialScript && initialScript.getAttribute("data-company")
    ? initialScript.getAttribute("data-company")
    : "";

  function init() {
    var scripts = document.getElementsByTagName("script");
    var fallbackScript = scripts[scripts.length - 1];
    var scriptSrc = initialScriptSrc || (fallbackScript && fallbackScript.src);
    var company = initialCompany || (fallbackScript && fallbackScript.getAttribute("data-company")) || "default";
    var baseUrl = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
    var widgetUrl = baseUrl + "/widget?company=" + encodeURIComponent(company);
    var buttonText = ${buttonText};
    var accentColor = ${accentColor};
    var isOpen = false;

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Open chat");
    button.setAttribute("aria-expanded", "false");
    button.textContent = buttonText;
    button.style.position = "fixed";
    button.style.right = "20px";
    button.style.bottom = "20px";
    button.style.zIndex = "2147483647";
    button.style.border = "0";
    button.style.borderRadius = "999px";
    button.style.background = accentColor;
    button.style.color = "#0b1618";
    button.style.cursor = "pointer";
    button.style.font = "700 15px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    button.style.letterSpacing = "0";
    button.style.boxShadow = "0 16px 42px rgba(30, 35, 40, 0.24), 0 0 0 1px rgba(255, 255, 255, 0.48) inset";
    button.style.minWidth = "68px";
    button.style.minHeight = "54px";
    button.style.padding = "0 20px";
    button.style.transition = "transform 180ms ease, box-shadow 180ms ease, filter 180ms ease";

    var panel = document.createElement("div");
    panel.style.position = "fixed";
    panel.style.right = "20px";
    panel.style.bottom = "92px";
    panel.style.zIndex = "2147483646";
    panel.style.width = "min(410px, calc(100vw - 40px))";
    panel.style.height = "min(680px, calc(100vh - 122px))";
    panel.style.minHeight = "360px";
    panel.style.overflow = "hidden";
    panel.style.border = "1px solid rgba(30, 35, 40, 0.10)";
    panel.style.borderRadius = "22px";
    panel.style.background = "#ffffff";
    panel.style.boxShadow = "0 28px 80px rgba(30, 35, 40, 0.28)";
    panel.style.opacity = "0";
    panel.style.pointerEvents = "none";
    panel.style.transform = "translateY(12px) scale(0.98)";
    panel.style.transformOrigin = "bottom right";
    panel.style.transition = "opacity 180ms ease, transform 180ms ease";

    function applyResponsivePanel() {
      if (window.matchMedia("(max-width: 520px)").matches) {
        panel.style.right = "10px";
        panel.style.bottom = "82px";
        panel.style.width = "calc(100vw - 20px)";
        panel.style.height = "calc(100vh - 96px)";
        panel.style.height = "calc(100dvh - 96px)";
        panel.style.borderRadius = "18px";
        button.style.right = "14px";
        button.style.bottom = "14px";
      } else {
        panel.style.right = "20px";
        panel.style.bottom = "92px";
        panel.style.width = "min(410px, calc(100vw - 40px))";
        panel.style.height = "min(680px, calc(100vh - 122px))";
        panel.style.borderRadius = "22px";
        button.style.right = "20px";
        button.style.bottom = "20px";
      }
    }

    var iframe = document.createElement("iframe");
    iframe.title = buttonText;
    iframe.src = widgetUrl;
    iframe.loading = "lazy";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.style.display = "block";

    function setOpen(nextOpen) {
      isOpen = nextOpen;
      panel.style.opacity = isOpen ? "1" : "0";
      panel.style.pointerEvents = isOpen ? "auto" : "none";
      panel.style.transform = isOpen ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)";
      button.textContent = isOpen ? "Close" : buttonText;
      button.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
      button.setAttribute("aria-expanded", String(isOpen));
      button.style.transform = isOpen ? "translateY(-1px)" : "translateY(0)";
    }

    button.addEventListener("click", function () {
      setOpen(!isOpen);
    });

    panel.appendChild(iframe);
    document.body.appendChild(panel);
    document.body.appendChild(button);
    applyResponsivePanel();
    window.addEventListener("resize", applyResponsivePanel);
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();`,
    {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    }
  );
}
