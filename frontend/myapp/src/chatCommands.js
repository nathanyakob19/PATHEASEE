function dispatchEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function extractPlaceName(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

export function executeChatCommand(rawText) {
  const text = (rawText || "").trim().toLowerCase();
  if (!text) return { handled: false };

  if (
    text.includes("go ") ||
    text.includes("open ") ||
    text.includes("navigate ") ||
    text.includes("speech on") ||
    text.includes("speech off") ||
    text.includes("accessibility") ||
    text.includes("logout") ||
    text.includes("help")
  ) {
    dispatchEvent("pathease:chat-command", { text });
    return { handled: true, message: "Done." };
  }

  if (text.includes("save itinerary") || text.includes("save iternery")) {
    dispatchEvent("pathease:voice-command", { type: "save-itinerary" });
    return { handled: true, message: "Saving itinerary." };
  }

  if (text.includes("generate itinerary") || text.includes("create itinerary")) {
    dispatchEvent("pathease:voice-command", { type: "generate-itinerary" });
    return { handled: true, message: "Generating itinerary." };
  }

  if (text.includes("close place")) {
    dispatchEvent("pathease:voice-command", { type: "close-place" });
    return { handled: true, message: "Closed place panel." };
  }

  if (text.includes("open place")) {
    const name = extractPlaceName(text, [/open place\s+(.+)/i]);
    if (!name) return { handled: true, message: "Please specify a place name." };
    dispatchEvent("pathease:voice-command", { type: "open-place", name });
    return { handled: true, message: `Opening ${name}.` };
  }

  if (text.includes("add to cart")) {
    const name = extractPlaceName(text, [/add\s+(.+?)\s+to cart/i, /add to cart\s+(.+)/i]);
    if (name) {
      dispatchEvent("pathease:voice-command", { type: "open-place", name });
    }
    setTimeout(() => {
      dispatchEvent("pathease:voice-command", { type: "add-to-cart", name });
    }, name ? 150 : 0);
    return { handled: true, message: name ? `Added ${name} to cart.` : "Added selected place to cart." };
  }

  if (text.includes("remove from cart")) {
    const name = extractPlaceName(text, [/remove\s+(.+?)\s+from cart/i, /remove from cart\s+(.+)/i]);
    if (name) {
      dispatchEvent("pathease:voice-command", { type: "open-place", name });
    }
    setTimeout(() => {
      dispatchEvent("pathease:voice-command", { type: "remove-from-cart", name });
    }, name ? 150 : 0);
    return {
      handled: true,
      message: name ? `Removed ${name} from cart.` : "Removed selected place from cart.",
    };
  }

  return { handled: false };
}
