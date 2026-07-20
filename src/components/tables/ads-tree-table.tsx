"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format/currency";
import { formatInteger, formatPercent } from "@/lib/format/number";
import {
  buildCampaignTree,
  costPerResult,
  cpc,
  cpm,
  ctr,
  type AdReportRow,
  type Totals,
} from "@/lib/meta/report";

function MetricCells({ totals }: { totals: Totals }) {
  return (
    <>
      <TableCell className="tabular-data text-right">{formatCurrency(totals.spend)}</TableCell>
      <TableCell className="tabular-data text-right">{formatInteger(totals.resultados)}</TableCell>
      <TableCell className="tabular-data text-right">
        {costPerResult(totals) != null ? formatCurrency(costPerResult(totals)!) : "—"}
      </TableCell>
      <TableCell className="tabular-data text-right">{formatInteger(totals.impressions)}</TableCell>
      <TableCell className="tabular-data text-right">{formatInteger(totals.reach)}</TableCell>
      <TableCell className="tabular-data text-right">
        {ctr(totals) != null ? formatPercent(ctr(totals)!) : "—"}
      </TableCell>
      <TableCell className="tabular-data text-right">
        {cpm(totals) != null ? formatCurrency(cpm(totals)!) : "—"}
      </TableCell>
      <TableCell className="tabular-data text-right">
        {cpc(totals) != null ? formatCurrency(cpc(totals)!) : "—"}
      </TableCell>
    </>
  );
}

const HEADER_LABELS = [
  "Investimento",
  "Resultados",
  "Custo/resultado",
  "Impressões",
  "Alcance",
  "CTR",
  "CPM",
  "CPC",
];

export function AdsTreeTable({ rows }: { rows: AdReportRow[] }) {
  const tree = buildCampaignTree(rows);
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());
  const [openAdsets, setOpenAdsets] = useState<Set<string>>(new Set());

  function toggleCampaign(id: string) {
    setOpenCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAdset(id: string) {
    setOpenAdsets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (!tree.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum dado sincronizado pra esse período ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-64">Campanha / Conjunto / Anúncio</TableHead>
            {HEADER_LABELS.map((label) => (
              <TableHead key={label} className="text-right">
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tree.map((campaign) => (
            <Fragment key={campaign.id}>
              <TableRow
                className="cursor-pointer font-medium"
                onClick={() => toggleCampaign(campaign.id)}
              >
                <TableCell className="flex items-center gap-1.5">
                  {openCampaigns.has(campaign.id) ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  {campaign.name}
                </TableCell>
                <MetricCells totals={campaign.totals} />
              </TableRow>

              {openCampaigns.has(campaign.id) &&
                campaign.adsets.map((adset) => (
                  <Fragment key={adset.id}>
                    <TableRow
                      className="cursor-pointer bg-muted/30"
                      onClick={() => toggleAdset(adset.id)}
                    >
                      <TableCell className="flex items-center gap-1.5 pl-8">
                        {openAdsets.has(adset.id) ? (
                          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {adset.name}
                      </TableCell>
                      <MetricCells totals={adset.totals} />
                    </TableRow>

                    {openAdsets.has(adset.id) &&
                      adset.ads.map((ad) => (
                        <TableRow key={ad.ad_id} className="text-muted-foreground">
                          <TableCell className="pl-14">{ad.ad_name ?? ad.ad_id}</TableCell>
                          <MetricCells
                            totals={{
                              spend: ad.spend,
                              impressions: ad.impressions,
                              reach: ad.reach,
                              clicks: ad.clicks,
                              inlineLinkClicks: ad.inline_link_clicks,
                              resultados: ad.resultados,
                            }}
                          />
                        </TableRow>
                      ))}
                  </Fragment>
                ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
