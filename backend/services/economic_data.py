"""
BCB (Banco Central do Brasil) economic data integration.
Fetches SELIC, IPCA, Dólar, CDI, Ibovespa with in-memory TTL cache.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── In-memory cache ──────────────────────────────────────────────────────────
_CACHE: dict[str, dict] = {}
_CACHE_TTL = timedelta(hours=4)

BCB_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/{n}?formato=json"
ALPHA_VANTAGE_IBOV = "https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=5d&interval=1d"

# BCB series codes
BCB_SERIES = {
    "selic_meta": 432,        # Taxa SELIC meta (% a.a.)
    "selic_diaria": 11,       # Taxa SELIC diária (% a.d.)
    "ipca": 433,              # IPCA acumulado 12 meses
    "cdi": 12,                # CDI diário
    "dolar_compra": 10813,    # Dólar PTAX compra
    "dolar_venda": 1,         # Dólar PTAX venda
    "poupanca": 196,          # Poupança mensal
}


def _cache_get(key: str) -> Optional[dict]:
    entry = _CACHE.get(key)
    if entry and datetime.now(timezone.utc) - entry["ts"] < _CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data: dict) -> None:
    _CACHE[key] = {"data": data, "ts": datetime.now(timezone.utc)}


async def _fetch_bcb(code: int, n: int = 1) -> Optional[list]:
    url = BCB_BASE.format(code=code, n=n)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.json()
    except Exception as e:
        logger.warning(f"BCB fetch error (code={code}): {e}")
        return None


async def _fetch_bcb_value(code: int) -> Optional[float]:
    data = await _fetch_bcb(code, n=1)
    if data:
        try:
            return float(data[-1]["valor"].replace(",", "."))
        except Exception:
            pass
    return None


async def _fetch_ibovespa() -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            r = await client.get(ALPHA_VANTAGE_IBOV)
            r.raise_for_status()
            body = r.json()
            result = body["chart"]["result"][0]
            meta = result["meta"]
            price = meta.get("regularMarketPrice") or meta.get("previousClose")
            prev = meta.get("chartPreviousClose") or meta.get("previousClose")
            change_pct = ((price - prev) / prev * 100) if prev else 0.0
            return {
                "value": round(price, 2),
                "change_pct": round(change_pct, 2),
                "currency": "BRL",
            }
    except Exception as e:
        logger.warning(f"Ibovespa fetch error: {e}")
        return None


async def get_economic_indicators() -> dict:
    """
    Returns current economic indicators for Brazil.
    Uses TTL cache to avoid hammering BCB API.
    """
    cached = _cache_get("indicators")
    if cached:
        return cached

    # Fetch all in parallel
    results = await asyncio.gather(
        _fetch_bcb_value(BCB_SERIES["selic_meta"]),
        _fetch_bcb_value(BCB_SERIES["ipca"]),
        _fetch_bcb_value(BCB_SERIES["dolar_venda"]),
        _fetch_bcb_value(BCB_SERIES["cdi"]),
        _fetch_bcb_value(BCB_SERIES["poupanca"]),
        _fetch_ibovespa(),
        return_exceptions=True,
    )

    selic, ipca, dolar, cdi, poupanca, ibov = results

    def safe(v, default=None):
        return v if not isinstance(v, Exception) and v is not None else default

    indicators = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "selic": {
            "value": safe(selic, 13.75),
            "label": "Taxa SELIC",
            "unit": "% a.a.",
            "source": "BCB",
        },
        "ipca": {
            "value": safe(ipca, 4.83),
            "label": "IPCA (12m)",
            "unit": "% a.a.",
            "source": "BCB",
        },
        "dolar": {
            "value": safe(dolar, 5.20),
            "label": "Dólar (PTAX)",
            "unit": "R$",
            "source": "BCB",
        },
        "cdi": {
            "value": safe(cdi, 13.65),
            "label": "CDI",
            "unit": "% a.a.",
            "source": "BCB",
        },
        "poupanca": {
            "value": safe(poupanca, 6.17),
            "label": "Poupança",
            "unit": "% a.a.",
            "source": "BCB",
        },
        "ibovespa": {
            "value": safe(ibov, {}).get("value", 125000) if isinstance(ibov, dict) else 125000,
            "change_pct": safe(ibov, {}).get("change_pct", 0.0) if isinstance(ibov, dict) else 0.0,
            "label": "Ibovespa",
            "unit": "pts",
            "source": "Yahoo Finance",
        },
    }

    _cache_set("indicators", indicators)
    return indicators


async def get_selic_history(months: int = 12) -> list[dict]:
    """Returns monthly SELIC history for charting."""
    cached = _cache_get(f"selic_history_{months}")
    if cached:
        return cached

    data = await _fetch_bcb(BCB_SERIES["selic_meta"], n=months)
    if not data:
        return []

    history = []
    for item in data:
        try:
            history.append({
                "date": item["data"],
                "value": float(item["valor"].replace(",", ".")),
            })
        except Exception:
            pass

    _cache_set(f"selic_history_{months}", history)
    return history


async def get_ipca_history(months: int = 12) -> list[dict]:
    """Returns monthly IPCA history for charting."""
    cached = _cache_get(f"ipca_history_{months}")
    if cached:
        return cached

    data = await _fetch_bcb(BCB_SERIES["ipca"], n=months)
    if not data:
        return []

    history = []
    for item in data:
        try:
            history.append({
                "date": item["data"],
                "value": float(item["valor"].replace(",", ".")),
            })
        except Exception:
            pass

    _cache_set(f"ipca_history_{months}", history)
    return history


def generate_scenario_analysis(selic: float, ipca: float) -> dict:
    """
    Simple scenario heuristics for RPPS investment committees.
    Returns qualitative guidance based on current macro environment.
    """
    real_rate = selic - ipca

    if real_rate > 6:
        scenario = "conservador_favoravel"
        guidance = (
            "Taxa real elevada favorece títulos pós-fixados (Tesouro Selic, CDB CDI+). "
            "Recomenda-se manter alocação conservadora privilegiando liquidez e segurança."
        )
    elif real_rate > 3:
        scenario = "equilibrado"
        guidance = (
            "Taxa real em patamar equilibrado. Momento adequado para diversificação "
            "moderada entre ativos de renda fixa indexados (IPCA+) e pós-fixados."
        )
    elif real_rate > 0:
        scenario = "compressao_juro_real"
        guidance = (
            "Taxa real em compressão. Avaliar posicionamento em títulos IPCA+ de longo "
            "prazo e fundos estruturados, observando as diretrizes da Resolução CMN 4.963/2021."
        )
    else:
        scenario = "juro_real_negativo"
        guidance = (
            "Taxa real negativa. Atenção ao risco de corrosão do patrimônio. "
            "Priorizar ativos indexados à inflação e revisão da política de investimentos."
        )

    return {
        "scenario": scenario,
        "real_rate": round(real_rate, 2),
        "guidance": guidance,
        "selic_used": selic,
        "ipca_used": ipca,
    }
