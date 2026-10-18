"use strict";

const CHAIN = {
  id: 46630,
  hexId: "0xb626",
  name: "Robinhood Chain Testnet",
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  explorerApi: "https://explorer.testnet.chain.robinhood.com/api/v2",
};

const CURATED_TOKENS = [
  {
    address: "0xe80608E0159E3A4AcA5dBd556b1D1Ca562585516",
    name: "Soul Labs",
    symbol: "SO",
    decimals: 18,
    source: "Curated",
  },
  {
    address: "0xDF2271BBC1b4D642ffA5C164f5b757035D40c5a5",
    name: "Slow Sunday",
    symbol: "SLOW",
    decimals: 18,
    source: "Curated",
  },
  {
    address: "0x7BA0845AaE8bcE744484535925B490982500711D",
    name: "Purr",
    symbol: "PURR",
    decimals: 18,
    source: "Curated",
  },
  {
    address: "0x5F187635B069AB4c4Bf4d20Cc31c349e32F24B5C",
    name: "VibeScope",
    symbol: "VSCOPE",
    decimals: 18,
    source: "Curated",
  },
];

const STORAGE_KEY = "vibescan.customTokens.v1";
const MAX_DISCOVERED_TOKENS = 24;

const elements = {
  addressForm: document.querySelector("#addressForm"),
  addressInput: document.querySelector("#addressInput"),
  inspectButton: document.querySelector("#inspectButton"),
  connectButtons: [...document.querySelectorAll("[data-connect]")],
  networkStatus: document.querySelector("#networkStatus"),
  networkDot: document.querySelector("#networkDot"),
  networkText: document.querySelector("#networkText"),
  blockNumber: document.querySelector("#blockNumber"),
  dashboard: document.querySelector("#dashboard"),
  statBalance: document.querySelector("#statBalance"),
  statAssets: document.querySelector("#statAssets"),
  statAddress: document.querySelector("#statAddress"),
  statAddressCaption: document.querySelector("#statAddressCaption"),
  assetGrid: document.querySelector("#assetGrid"),
  assetState: document.querySelector("#assetState"),
  assetCount: document.querySelector("#assetCount"),
  discoveryNote: document.querySelector("#discoveryNote"),
  copyAddressButton: document.querySelector("#copyAddressButton"),
  refreshButton: document.querySelector("#refreshButton"),
  addTokenForm: document.querySelector("#addTokenForm"),
  tokenAddressInput: document.querySelector("#tokenAddressInput"),
  addTokenButton: document.querySelector("#addTokenButton"),
  tokenFeedback: document.querySelector("#tokenFeedback"),
  toast: document.querySelector("#toast"),
};

const state = {
  address: "",
  tokens: [],
  loading: false,
  requestKey: 0,
  walletAddress: "",
  toastTimer: null,
};

function isValidAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function normalizeAddress(value) {
  return value.trim().toLowerCase();
}

function shortAddress(address, left = 6, right = 4) {
  if (!address) return "—";
  return `${address.slice(0, left)}…${address.slice(-right)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message, type = "info") {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-error", type === "error");
  elements.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 3200);
}

function setLoading(isLoading) {
  state.loading = isLoading;
  elements.dashboard.classList.toggle("is-loading", isLoading);
  elements.dashboard.setAttribute("aria-busy", String(isLoading));
  elements.inspectButton.disabled = isLoading;
  elements.refreshButton.disabled = isLoading || !state.address;
  elements.copyAddressButton.disabled = !state.address;
  elements.inspectButton.querySelector("span").textContent = isLoading
    ? "Reading chain…"
    : "Inspect portfolio";
}

async function rpc(method, params = []) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(CHAIN.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `${Date.now()}-${Math.random()}`,
        method,
        params,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`RPC returned HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (payload.error) {
      throw new Error(payload.error.message || "RPC request failed");
    }
    return payload.result;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Explorer returned HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function toQuantity(hexValue) {
  return BigInt(hexValue || "0x0");
}

function formatUnits(rawHex, decimals, maxFractionDigits = 6) {
  try {
    const raw = toQuantity(rawHex);
    const places = Number(decimals);
    if (!Number.isInteger(places) || places < 0 || places > 36) {
      throw new Error("Invalid token decimals");
    }

    const base = 10n ** BigInt(places);
    const whole = raw / base;
    const remainder = raw % base;

    if (raw === 0n) {
      return "0";
    }

    let fraction = "";
    if (remainder > 0n && maxFractionDigits > 0) {
      fraction = remainder
        .toString()
        .padStart(places, "0")
        .slice(0, maxFractionDigits)
        .replace(/0+$/, "");
    }

    const wholeNumber = Number(whole);
    const formattedWhole =
      wholeNumber <= Number.MAX_SAFE_INTEGER
        ? wholeNumber.toLocaleString("en-US")
        : whole.toString();

    if (raw > 0n && whole === 0n && !fraction) {
      return `<0.${"0".repeat(Math.max(0, maxFractionDigits - 1))}1`;
    }

    return fraction ? `${formattedWhole}.${fraction}` : formattedWhole;
  } catch {
    return "—";
  }
}

function decodeAbiString(value) {
  try {
    if (!value || value === "0x") return "";
    const hex = value.slice(2);

    if (hex.length === 64) {
      const bytes = hex.match(/.{1,2}/g) || [];
      const output = [];
      for (const byte of bytes) {
        if (byte === "00") break;
        output.push(byte);
      }
      return new TextDecoder().decode(
        new Uint8Array(output.map((byte) => Number.parseInt(byte, 16))),
      );
    }

    if (hex.length >= 128) {
      const offset = Number(BigInt(`0x${hex.slice(0, 64)}`)) * 2;
      const length = Number(BigInt(`0x${hex.slice(offset, offset + 64)}`));
      const start = offset + 64;
      const data = hex.slice(start, start + length * 2);
      if (!data) return "";
      const bytes = data.match(/.{1,2}/g) || [];
      return new TextDecoder().decode(
        new Uint8Array(bytes.map((byte) => Number.parseInt(byte, 16))),
      );
    }
  } catch {
    return "";
  }
  return "";
}

function addressWord(address) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function ethCall(to, data) {
  return rpc("eth_call", [{ to, data }, "latest"]);
}

async function getTokenMetadata(address) {
  const [symbolResult, nameResult, decimalsResult] = await Promise.allSettled([
    ethCall(address, "0x95d89b41"),
    ethCall(address, "0x06fdde03"),
    ethCall(address, "0x313ce567"),
  ]);

  const symbol =
    symbolResult.status === "fulfilled" ? decodeAbiString(symbolResult.value).trim() : "";
  const name =
    nameResult.status === "fulfilled" ? decodeAbiString(nameResult.value).trim() : "";
  const decimals =
    decimalsResult.status === "fulfilled"
      ? Number(BigInt(decimalsResult.value || "0x0"))
      : NaN;

  if (!symbol && !name && !Number.isInteger(decimals)) {
    throw new Error("This address does not look like an ERC-20 token.");
  }

  return {
    symbol: symbol.slice(0, 16) || "TOKEN",
    name: name.slice(0, 48) || symbol || "Custom token",
    decimals: Number.isInteger(decimals) && decimals <= 36 ? decimals : 18,
  };
}

async function getTokenBalance(address, holder, decimals) {
  const data = `0x70a08231${addressWord(holder)}`;
  const rawBalance = await ethCall(address, data);
  return {
    rawBalance,
    amount: formatUnits(rawBalance, decimals),
  };
}

function loadCustomTokens() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((token) => token && isValidAddress(token.address || ""))
      .slice(0, 20)
      .map((token) => ({
        address: token.address,
        name: token.name || "Custom token",
        symbol: token.symbol || "TOKEN",
        decimals: Number.isInteger(token.decimals) ? token.decimals : 18,
        source: "Custom",
      }));
  } catch {
    return [];
  }
}

function saveCustomTokens(tokens) {
  const serializable = tokens
    .filter((token) => token.source === "Custom")
    .map(({ address, name, symbol, decimals }) => ({
      address,
      name,
      symbol,
      decimals,
    }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

function mergeToken(target, candidate) {
  const key = normalizeAddress(candidate.address);
  const existing = target.get(key);
  if (!existing) {
    target.set(key, {
      ...candidate,
      address: candidate.address,
      decimals:
        Number.isInteger(candidate.decimals) && candidate.decimals <= 36
          ? candidate.decimals
          : 18,
    });
    return;
  }

  target.set(key, {
    ...existing,
    name: existing.name || existing.name === "Custom token" ? candidate.name || existing.name : existing.name,
    symbol: existing.symbol && existing.symbol !== "TOKEN" ? existing.symbol : candidate.symbol,
    decimals:
      Number.isInteger(existing.decimals) && existing.decimals <= 36
        ? existing.decimals
        : candidate.decimals,
    source:
      existing.source === "Curated" || candidate.source === "Curated"
        ? "Curated"
        : existing.source === "Custom" || candidate.source === "Custom"
          ? "Custom"
          : "Explorer",
  });
}

function normalizeExplorerToken(item) {
  const token = item?.token || item;
  const address =
    token?.address_hash || token?.address || token?.contract_address_hash || token?.contractAddress;
  if (!isValidAddress(address || "")) return null;

  return {
    address,
    name: token.name || token.symbol || "Explorer token",
    symbol: token.symbol || "TOKEN",
    decimals: Number(token.decimals ?? 18),
    rawBalance: item?.value ?? token?.balance ?? "0x0",
    source: "Explorer",
  };
}

async function discoverExplorerTokens(address) {
  try {
    const payload = await fetchJson(
      `${CHAIN.explorerApi}/addresses/${encodeURIComponent(address)}/token-balances`,
    );
    const items = Array.isArray(payload) ? payload : payload.items || [];
    return items
      .map(normalizeExplorerToken)
      .filter(Boolean)
      .slice(0, MAX_DISCOVERED_TOKENS);
  } catch {
    return [];
  }
}

function renderEmptyState(title, message) {
  elements.assetGrid.hidden = true;
  elements.assetState.hidden = false;
  elements.assetState.innerHTML = `
    <div class="empty-illustration" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <h4>${escapeHtml(title)}</h4>
    <p>${escapeHtml(message)}</p>
  `;
}

function shortToken(symbol) {
  const clean = String(symbol || "T").replace(/[^a-zA-Z0-9]/g, "");
  return (clean || "T").slice(0, 3).toUpperCase();
}

function renderTokens(tokens) {
  elements.assetCount.textContent = `${tokens.length} ${tokens.length === 1 ? "token" : "tokens"}`;

  if (!tokens.length) {
    renderEmptyState(
      "No token positions found",
      "This address currently has no recognized ERC-20 balances.",
    );
    return;
  }

  elements.assetState.hidden = true;
  elements.assetGrid.hidden = false;
  elements.assetGrid.innerHTML = tokens
    .map((token, index) => {
      const isCustom = token.source === "Custom";
      return `
        <article class="asset-card" style="animation-delay:${index * 35}ms">
          <div class="asset-card-top">
            <div class="asset-identity">
              <span class="token-avatar">${escapeHtml(shortToken(token.symbol))}</span>
              <span class="asset-name">
                <strong>${escapeHtml(token.name)}</strong>
                <span>${escapeHtml(token.symbol)}</span>
              </span>
            </div>
            <span class="source-tag">${escapeHtml(token.source)}</span>
          </div>
          <div class="asset-card-bottom">
            <div>
              <div class="asset-amount">${escapeHtml(token.amount || "—")}</div>
              <div class="asset-contract">${escapeHtml(shortAddress(token.address, 7, 5))}</div>
            </div>
            <div class="asset-actions">
              <a
                class="mini-button"
                href="${CHAIN.explorerUrl}/token/${encodeURIComponent(token.address)}"
                target="_blank"
                rel="noreferrer"
                aria-label="Open ${escapeHtml(token.symbol)} in explorer"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 3h7v7M13 3 5 11M11 9v4H3V5h4" />
                </svg>
              </a>
              ${
                isCustom
                  ? `
                    <button
                      class="mini-button remove-token"
                      type="button"
                      data-remove-token="${escapeHtml(token.address)}"
                      aria-label="Remove ${escapeHtml(token.symbol)} from watchlist"
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  `
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  elements.assetGrid.querySelectorAll(".remove-token").forEach((button) => {
    button.addEventListener("click", () => {
      const address = button.getAttribute("data-remove-token");
      const customTokens = loadCustomTokens().filter(
        (token) => normalizeAddress(token.address) !== normalizeAddress(address),
      );
      saveCustomTokens(customTokens);
      showToast("Token removed from your watchlist.");
      inspectAddress(state.address, { updateUrl: false });
    });
  });
}

function updateAddressSummary(address) {
  elements.statAddress.textContent = shortAddress(address, 10, 8);
  elements.statAddress.title = address;
  elements.statAddressCaption.textContent =
    state.walletAddress && normalizeAddress(address) === normalizeAddress(state.walletAddress)
      ? "Connected wallet"
      : "Public address";
}

async function inspectAddress(rawAddress, options = {}) {
  const address = rawAddress.trim();
  if (!isValidAddress(address)) {
    showToast("Enter a valid 0x address with 40 hexadecimal characters.", "error");
    elements.addressInput.focus();
    return;
  }

  const requestKey = ++state.requestKey;
  state.address = address;
  elements.addressInput.value = address;
  elements.copyAddressButton.disabled = false;
  elements.refreshButton.disabled = false;
  elements.discoveryNote.hidden = true;
  updateAddressSummary(address);
  renderEmptyState("Reading the chain", "Fetching ETH and ERC-20 balances.");
  setLoading(true);

  try {
    const [nativeResult, discoveredTokens, blockResult] = await Promise.all([
      rpc("eth_getBalance", [address, "latest"]).catch(() => null),
      discoverExplorerTokens(address),
      rpc("eth_blockNumber", []).catch(() => null),
    ]);

    if (requestKey !== state.requestKey) return;

    elements.statBalance.textContent =
      nativeResult === null ? "Unavailable" : `${formatUnits(nativeResult, 18)} ETH`;
    if (blockResult) {
      elements.blockNumber.textContent = Number.parseInt(blockResult, 16).toLocaleString("en-US");
    }

    const tokenMap = new Map();
    [...CURATED_TOKENS, ...loadCustomTokens(), ...discoveredTokens].forEach((token) =>
      mergeToken(tokenMap, token),
    );

    const candidates = [...tokenMap.values()].slice(0, MAX_DISCOVERED_TOKENS);
    const settled = await Promise.allSettled(
      candidates.map(async (token) => {
        let metadata = token;
        if (!token.symbol || token.symbol === "TOKEN" || !Number.isInteger(token.decimals)) {
          metadata = { ...token, ...(await getTokenMetadata(token.address)) };
        }

        const balance = await getTokenBalance(
          token.address,
          address,
          metadata.decimals,
        );

        return {
          ...metadata,
          ...balance,
        };
      }),
    );

    if (requestKey !== state.requestKey) return;

    const tokens = settled
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((token) => {
        try {
          return toQuantity(token.rawBalance) > 0n || token.source !== "Explorer";
        } catch {
          return token.source !== "Explorer";
        }
      })
      .sort((a, b) => {
        if (a.source === "Curated" && b.source !== "Curated") return -1;
        if (b.source === "Curated" && a.source !== "Curated") return 1;
        return a.symbol.localeCompare(b.symbol);
      });

    state.tokens = tokens;
    elements.statAssets.textContent = String(tokens.length);
    renderTokens(tokens);

    const failedCount =
      candidates.length - settled.filter((result) => result.status === "fulfilled").length;
    elements.discoveryNote.hidden = failedCount === 0 && discoveredTokens.length === 0;
    elements.discoveryNote.textContent =
      failedCount > 0
        ? `${failedCount} token contract${failedCount === 1 ? "" : "s"} could not be read. Explorer discovery is a convenience, not a guarantee.`
        : discoveredTokens.length > 0
          ? `Discovered ${discoveredTokens.length} token position${discoveredTokens.length === 1 ? "" : "s"} through the public explorer.`
          : "";

    if (options.updateUrl !== false) {
      const url = new URL(window.location.href);
      url.searchParams.set("address", address);
      window.history.replaceState({}, "", url);
      document.querySelector("#portfolio").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    if (requestKey !== state.requestKey) return;
    elements.statBalance.textContent = "Unavailable";
    elements.statAssets.textContent = "—";
    renderEmptyState(
      "Could not read this portfolio",
      "The testnet RPC or explorer did not respond. Try refreshing in a moment.",
    );
    showToast(error.message || "Could not load this portfolio.", "error");
  } finally {
    if (requestKey === state.requestKey) {
      setLoading(false);
    }
  }
}

async function connectWallet() {
  const provider = window.ethereum;
  if (!provider) {
    showToast("No browser wallet detected. Paste an address to continue.", "error");
    elements.addressInput.focus();
    return;
  }

  try {
    let chainId = await provider.request({ method: "eth_chainId" });
    if (Number.parseInt(chainId, 16) !== CHAIN.id) {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN.hexId }],
        });
      } catch (switchError) {
        if (switchError?.code !== 4902) throw switchError;
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CHAIN.hexId,
              chainName: CHAIN.name,
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [CHAIN.rpcUrl],
              blockExplorerUrls: [CHAIN.explorerUrl],
            },
          ],
        });
      }
    }

    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts?.length) {
      throw new Error("The wallet did not return an account.");
    }

    state.walletAddress = accounts[0];
    elements.connectButtons.forEach((button) => {
      button.textContent =
        button.classList.contains("button")
          ? `${shortAddress(accounts[0], 4, 4)}`
          : "Use connected wallet";
    });
    showToast("Wallet connected. VibeScope only reads public balances.");
    await inspectAddress(accounts[0]);
  } catch (error) {
    const rejected = error?.code === 4001;
    showToast(
      rejected
        ? "Wallet request cancelled."
        : error?.message || "Could not connect the wallet.",
      "error",
    );
  }
}

async function checkExistingWallet() {
  if (!window.ethereum) return;
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts?.length) {
      state.walletAddress = accounts[0];
      elements.connectButtons.forEach((button) => {
        if (button.classList.contains("button")) {
          button.textContent = shortAddress(accounts[0], 4, 4);
        }
      });
    }
  } catch {
    // A wallet that cannot report accounts should not block address inspection.
  }
}

async function checkNetwork() {
  elements.networkStatus.classList.remove("is-online", "is-offline");
  elements.networkText.textContent = "Checking network";
  try {
    const [chainId, block] = await Promise.all([
      rpc("eth_chainId"),
      rpc("eth_blockNumber"),
    ]);
    if (Number.parseInt(chainId, 16) !== CHAIN.id) {
      throw new Error("Unexpected chain");
    }
    elements.networkStatus.classList.add("is-online");
    elements.networkText.textContent = "RPC online";
    elements.blockNumber.textContent = Number.parseInt(block, 16).toLocaleString("en-US");
  } catch {
    elements.networkStatus.classList.add("is-offline");
    elements.networkText.textContent = "RPC unavailable";
  }
}

async function addCustomToken(event) {
  event.preventDefault();
  const address = elements.tokenAddressInput.value.trim();
  elements.tokenFeedback.className = "form-feedback";
  elements.tokenFeedback.textContent = "";

  if (!isValidAddress(address)) {
    elements.tokenFeedback.textContent = "Enter a valid 0x token contract.";
    elements.tokenFeedback.classList.add("is-error");
    return;
  }

  const customTokens = loadCustomTokens();
  const exists =
    customTokens.some(
      (token) => normalizeAddress(token.address) === normalizeAddress(address),
    ) ||
    CURATED_TOKENS.some(
      (token) => normalizeAddress(token.address) === normalizeAddress(address),
    );

  if (exists) {
    elements.tokenFeedback.textContent = "That token is already in your watchlist.";
    elements.tokenFeedback.classList.add("is-error");
    return;
  }

  elements.addTokenButton.disabled = true;
  elements.tokenFeedback.textContent = "Reading token metadata…";

  try {
    const metadata = await getTokenMetadata(address);
    customTokens.push({
      address,
      ...metadata,
      source: "Custom",
    });
    saveCustomTokens(customTokens);
    elements.tokenAddressInput.value = "";
    elements.tokenFeedback.textContent = `${metadata.symbol} added to your watchlist.`;
    elements.tokenFeedback.classList.add("is-success");
    if (state.address) {
      await inspectAddress(state.address, { updateUrl: false });
    }
  } catch (error) {
    elements.tokenFeedback.textContent =
      error.message || "Could not read this token contract.";
    elements.tokenFeedback.classList.add("is-error");
  } finally {
    elements.addTokenButton.disabled = false;
  }
}

async function copyAddress() {
  if (!state.address) return;
  try {
    await navigator.clipboard.writeText(state.address);
    showToast("Address copied.");
  } catch {
    showToast("Could not access the clipboard.", "error");
  }
}

function initialize() {
  elements.addressForm.addEventListener("submit", (event) => {
    event.preventDefault();
    inspectAddress(elements.addressInput.value);
  });

  elements.connectButtons.forEach((button) =>
    button.addEventListener("click", connectWallet),
  );
  elements.refreshButton.addEventListener("click", () =>
    inspectAddress(state.address, { updateUrl: false }),
  );
  elements.copyAddressButton.addEventListener("click", copyAddress);
  elements.addTokenForm.addEventListener("submit", addCustomToken);

  if (window.ethereum?.on) {
    window.ethereum.on("accountsChanged", (accounts) => {
      state.walletAddress = accounts?.[0] || "";
      if (state.walletAddress) {
        inspectAddress(state.walletAddress);
      } else {
        elements.connectButtons.forEach((button) => {
          if (button.classList.contains("button")) button.textContent = "Connect wallet";
        });
      }
    });
  }

  checkNetwork();
  checkExistingWallet();

  const addressFromUrl = new URLSearchParams(window.location.search).get("address");
  if (addressFromUrl && isValidAddress(addressFromUrl)) {
    inspectAddress(addressFromUrl, { updateUrl: false });
  }
}

initialize();
