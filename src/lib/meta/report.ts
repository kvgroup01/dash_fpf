export interface AdReportRow {
  campaign_id: string;
  campaign_name: string | null;
  adset_id: string;
  adset_name: string | null;
  ad_id: string;
  ad_name: string | null;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number | null;
  clicks: number;
  inline_link_clicks: number;
  resultados: number;
}

export interface Totals {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  inlineLinkClicks: number;
  resultados: number;
}

export interface AdsetNode {
  id: string;
  name: string;
  totals: Totals;
  ads: AdReportRow[];
}

export interface CampaignNode {
  id: string;
  name: string;
  totals: Totals;
  adsets: AdsetNode[];
}

function emptyTotals(): Totals {
  return { spend: 0, impressions: 0, reach: 0, clicks: 0, inlineLinkClicks: 0, resultados: 0 };
}

function addRow(totals: Totals, row: AdReportRow) {
  totals.spend += row.spend;
  totals.impressions += row.impressions;
  totals.reach += row.reach;
  totals.clicks += row.clicks;
  totals.inlineLinkClicks += row.inline_link_clicks;
  totals.resultados += row.resultados;
}

export function costPerResult(totals: Totals): number | null {
  return totals.resultados > 0 ? totals.spend / totals.resultados : null;
}

export function ctr(totals: Totals): number | null {
  return totals.impressions > 0 ? totals.clicks / totals.impressions : null;
}

export function cpm(totals: Totals): number | null {
  return totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : null;
}

export function cpc(totals: Totals): number | null {
  return totals.clicks > 0 ? totals.spend / totals.clicks : null;
}

/** Agrupamento em árvore campanha → conjunto → anúncio a partir do resultado (já pequeno) da RPC. */
export function buildCampaignTree(rows: AdReportRow[]): CampaignNode[] {
  const campaigns = new Map<string, CampaignNode>();

  for (const row of rows) {
    let campaign = campaigns.get(row.campaign_id);
    if (!campaign) {
      campaign = {
        id: row.campaign_id,
        name: row.campaign_name ?? row.campaign_id,
        totals: emptyTotals(),
        adsets: [],
      };
      campaigns.set(row.campaign_id, campaign);
    }
    addRow(campaign.totals, row);

    let adset = campaign.adsets.find((a) => a.id === row.adset_id);
    if (!adset) {
      adset = {
        id: row.adset_id,
        name: row.adset_name ?? row.adset_id,
        totals: emptyTotals(),
        ads: [],
      };
      campaign.adsets.push(adset);
    }
    addRow(adset.totals, row);
    adset.ads.push(row);
  }

  return Array.from(campaigns.values()).sort((a, b) => b.totals.spend - a.totals.spend);
}

/** Melhores anúncios por resultado, com investimento mínimo pra não deixar anúncio de R$5 liderar. */
export function topAds(rows: AdReportRow[], minSpend = 20, limit = 5): AdReportRow[] {
  return rows
    .filter((r) => r.spend >= minSpend)
    .sort((a, b) => b.resultados - a.resultados || a.spend - b.spend)
    .slice(0, limit);
}

export interface AudienceRow {
  id: string;
  name: string;
  totals: Totals;
}

export function topAudiences(rows: AdReportRow[], minSpend = 20, limit = 5): AudienceRow[] {
  const adsets = new Map<string, AudienceRow>();
  for (const row of rows) {
    let adset = adsets.get(row.adset_id);
    if (!adset) {
      adset = { id: row.adset_id, name: row.adset_name ?? row.adset_id, totals: emptyTotals() };
      adsets.set(row.adset_id, adset);
    }
    addRow(adset.totals, row);
  }
  return Array.from(adsets.values())
    .filter((a) => a.totals.spend >= minSpend)
    .sort((a, b) => b.totals.resultados - a.totals.resultados)
    .slice(0, limit);
}

export function sumTotals(rows: AdReportRow[]): Totals {
  const totals = emptyTotals();
  for (const row of rows) addRow(totals, row);
  return totals;
}
